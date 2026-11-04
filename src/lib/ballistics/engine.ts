// Point-mass trajectory integrator.
// Drag: a = k · Cd(Mach) · (ρ/ρstd) · v² / BC
// k is fixed by the G1 standard projectile (1 in, 1 lb) at ICAO density,
// not fitted to a chart. Cd tables are the BRL G1 and G7 functions.

import { G1, G7 } from "./drag-data";

const G = 32.17405; // ft/s²
const K_DRAG = 2.08551e-4;
const RHO_STD = 0.0764742; // lb/ft³, computed ICAO sea level below
const OMEGA = 7.292115e-5; // rad/s
const MOA_IN_AT_100 = 1.0471975512; // inches
const MIL_IN_AT_100 = 3.6;
const ENERGY_DIV = 450240;

export type DragLaw = "G1" | "G7";

export type Conditions = {
  tempF: number;
  altitudeFt: number;
  /** Station pressure. Null → derive from altitude. */
  pressureInHg: number | null;
  humidityPct: number;
  /** Degrees north. South is negative. */
  latitudeDeg: number;
  /** Direction of fire, degrees clockwise from true north. */
  azimuthDeg: number;
  useCoriolis: boolean;
  useSpinDrift: boolean;
};

export type Shot = {
  mvFps: number;
  weightGr: number;
  diameterIn: number;
  /** Bullet length. Null estimates from weight and caliber. */
  lengthIn: number | null;
  bc: number;
  drag: DragLaw;
  /** Inches per turn. Positive = right-hand. */
  twistIn: number;
  sightHeightIn: number;
  zeroYards: number;
  /** Slant range to the target, yards (rangefinder). */
  distanceYards: number;
  /** Target above the shooter, feet. Negative is downhill. */
  elevationFt: number;
  windMph: number;
  /** Clock hour the wind is coming FROM. 12 = headwind, 3 = from the right. */
  windClock: number;
  conditions: Conditions;
  maxYards: number;
};

export type Sample = {
  yards: number;
  /** Inches above the line of sight. Negative = low. */
  pathIn: number;
  /** Inches right of the line of sight. */
  windageIn: number;
  velocityFps: number;
  energyFtlb: number;
  tofSec: number;
  mach: number;
  /** Positive = dial/hold UP. */
  comeUpMoa: number;
  comeUpMil: number;
  /** Positive = dial/hold RIGHT. */
  comeRightMoa: number;
  comeRightMil: number;
};

export type Solution = {
  samples: Sample[];
  atTarget: Sample;
  zeroAngleMoa: number;
  lookAngleDeg: number;
  stability: number;
  densityRatio: number;
  speedOfSound: number;
  pressureInHg: number;
  marginal: boolean;
};

type State = { x: number; y: number; z: number; vx: number; vy: number; vz: number };

type Phys = {
  table: ReadonlyArray<readonly [number, number]>;
  bc: number;
  densityRatio: number;
  sos: number;
  airX: number;
  airZ: number;
  gx: number;
  gy: number;
  coriolis: boolean;
  corRight: number;
  corUp: number;
};

function cdAt(table: ReadonlyArray<readonly [number, number]>, mach: number): number {
  if (mach <= table[0]![0]) return table[0]![1];
  const last = table[table.length - 1]!;
  if (mach >= last[0]) return last[1];
  let lo = 0;
  let hi = table.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid]![0] <= mach) lo = mid;
    else hi = mid;
  }
  const a = table[lo]!;
  const b = table[hi]!;
  const u = (mach - a[0]) / (b[0] - a[0]);
  return a[1] + u * (b[1] - a[1]);
}

/** Sea-level ICAO density from the same formula used in flight, so the ratio is 1.000 at standard. */
function airDensity(tempF: number, pressureInHg: number, humidityPct: number): number {
  const tempR = tempF + 459.67;
  const tempC = ((tempF - 32) * 5) / 9;
  const svpHpa = 6.1078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const vapor = Math.min(pressureInHg * 0.9, (humidityPct / 100) * svpHpa * 0.02953);
  const pd = Math.max(0, pressureInHg - vapor);
  const psf = 70.726;
  const rdry = 53.353;
  const rv = 85.78;
  return (pd * psf) / (rdry * tempR) + (vapor * psf) / (rv * tempR);
}

export function stationPressure(altitudeFt: number): number {
  const clamped = Math.max(-1000, Math.min(20000, altitudeFt));
  return 29.9213 * Math.pow(1 - 6.87535e-6 * clamped, 5.2561);
}

export function describeAir(c: Conditions): {
  pressureInHg: number;
  densityRatio: number;
  speedOfSound: number;
} {
  const pressure = c.pressureInHg ?? stationPressure(c.altitudeFt);
  const rho = airDensity(c.tempF, pressure, c.humidityPct);
  const tempR = c.tempF + 459.67;
  return {
    pressureInHg: pressure,
    densityRatio: rho / RHO_STD,
    speedOfSound: 49.0223 * Math.sqrt(tempR),
  };
}

export function estimateLengthIn(weightGr: number, diameterIn: number): number {
  const massLb = weightGr / 7000;
  const vol = massLb / 0.275;
  const area = Math.PI * (diameterIn / 2) ** 2;
  return vol / area;
}

/** Miller stability, muzzle-velocity corrected. Above ~1.4 is comfortable. */
export function millerSg(opts: {
  weightGr: number;
  diameterIn: number;
  lengthIn: number;
  twistIn: number;
  mvFps: number;
}): number {
  const d = opts.diameterIn;
  const lenCal = opts.lengthIn / d;
  const twistCal = Math.abs(opts.twistIn) / d;
  if (!(lenCal > 0) || !(twistCal > 0)) return 0;
  const sg =
    (30 * opts.weightGr) /
    (twistCal ** 2 * d ** 3 * lenCal * (1 + lenCal ** 2));
  return sg * Math.cbrt(Math.max(400, opts.mvFps) / 2800);
}

function spinDriftInches(sg: number, tof: number): number {
  if (!(sg > 0) || tof <= 0) return 0;
  return 1.25 * (sg + 1.2) * tof ** 1.83;
}

function moaPerIn(yards: number): number {
  return MOA_IN_AT_100 * (yards / 100);
}

function milPerIn(yards: number): number {
  return MIL_IN_AT_100 * (yards / 100);
}

export function inchesToMoa(inches: number, yards: number): number {
  if (yards <= 1) return 0;
  return inches / moaPerIn(yards);
}

export function inchesToMil(inches: number, yards: number): number {
  if (yards <= 1) return 0;
  return inches / milPerIn(yards);
}

export function energyFtlb(weightGr: number, fps: number): number {
  return (weightGr * fps * fps) / ENERGY_DIV;
}

function windComponents(mph: number, clock: number): { headFps: number; fromRightFps: number } {
  const deg = (((clock % 12) + 12) % 12) * 30;
  const rad = (deg * Math.PI) / 180;
  const fps = mph * 1.4666667;
  return { headFps: fps * Math.cos(rad), fromRightFps: fps * Math.sin(rad) };
}

function deriv(s: State, p: Phys): State {
  const vrx = s.vx - p.airX;
  const vry = s.vy;
  const vrz = s.vz - p.airZ;
  const v = Math.hypot(vrx, vry, vrz) || 1e-3;
  const cd = cdAt(p.table, v / p.sos);
  const scale = (K_DRAG * cd * p.densityRatio * v) / p.bc;
  let ax = -scale * vrx + p.gx;
  let ay = -scale * vry + p.gy;
  let az = -scale * vrz;
  if (p.coriolis) {
    az += p.corRight * s.vx;
    ay += p.corUp * s.vx;
  }
  return { x: s.vx, y: s.vy, z: s.vz, vx: ax, vy: ay, vz: az };
}

function add(s: State, k: State, h: number): State {
  return {
    x: s.x + k.x * h,
    y: s.y + k.y * h,
    z: s.z + k.z * h,
    vx: s.vx + k.vx * h,
    vy: s.vy + k.vy * h,
    vz: s.vz + k.vz * h,
  };
}

function rk4(s: State, dt: number, p: Phys): State {
  const k1 = deriv(s, p);
  const k2 = deriv(add(s, k1, dt / 2), p);
  const k3 = deriv(add(s, k2, dt / 2), p);
  const k4 = deriv(add(s, k3, dt), p);
  const h = dt / 6;
  return {
    x: s.x + (k1.x + 2 * k2.x + 2 * k3.x + k4.x) * h,
    y: s.y + (k1.y + 2 * k2.y + 2 * k3.y + k4.y) * h,
    z: s.z + (k1.z + 2 * k2.z + 2 * k3.z + k4.z) * h,
    vx: s.vx + (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx) * h,
    vy: s.vy + (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy) * h,
    vz: s.vz + (k1.vz + 2 * k2.vz + 2 * k3.vz + k4.vz) * h,
  };
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

type FlightOpts = {
  stopFt: number;
  gatesFt: number[] | null;
  theta: number;
  mv: number;
  sightFt: number;
  phys: Phys;
  spinInPerSec: ((tof: number) => number) | null;
};

type Hit = { ft: number; y: number; z: number; v: number; tof: number };

function fly(o: FlightOpts): { end: Hit; hits: Hit[] } {
  const dt = 0.0005;
  let s: State = {
    x: 0,
    y: -o.sightFt,
    z: 0,
    vx: o.mv * Math.cos(o.theta),
    vy: o.mv * Math.sin(o.theta),
    vz: 0,
  };
  let tof = 0;
  const hits: Hit[] = [];
  let gate = 0;
  const gates = o.gatesFt;
  const snap = (ft: number, y: number, z: number, v: number, t: number): Hit => {
    const drift = o.spinInPerSec ? o.spinInPerSec(t) / 12 : 0;
    return { ft, y, z: z + drift, v, tof: t };
  };

  for (let n = 0; n < 24000; n++) {
    const prev = s;
    const prevT = tof;
    s = rk4(s, dt, o.phys);
    tof += dt;
    const speed = Math.hypot(s.vx, s.vy, s.vz);
    if (gates) {
      while (gate < gates.length && prev.x < gates[gate]! && s.x >= gates[gate]!) {
        const u = (gates[gate]! - prev.x) / Math.max(1e-6, s.x - prev.x);
        hits.push(
          snap(
            gates[gate]!,
            lerp(prev.y, s.y, u),
            lerp(prev.z, s.z, u),
            lerp(Math.hypot(prev.vx, prev.vy, prev.vz), speed, u),
            lerp(prevT, tof, u),
          ),
        );
        gate++;
      }
    }
    if (s.x >= o.stopFt || speed < 280 || tof > 8 || !Number.isFinite(s.y)) {
      const u =
        s.x === prev.x ? 1 : Math.min(1, Math.max(0, (o.stopFt - prev.x) / (s.x - prev.x)));
      const end = snap(
        o.stopFt,
        lerp(prev.y, s.y, u),
        lerp(prev.z, s.z, u),
        lerp(Math.hypot(prev.vx, prev.vy, prev.vz), speed, u),
        lerp(prevT, tof, u),
      );
      return { end, hits };
    }
  }
  return {
    end: snap(s.x, s.y, s.z, Math.hypot(s.vx, s.vy, s.vz), tof),
    hits,
  };
}

function toSample(h: Hit, weightGr: number, sos: number): Sample {
  const yards = h.ft / 3;
  const pathIn = h.y * 12;
  const windageIn = h.z * 12;
  const upIn = -pathIn;
  const rightIn = -windageIn;
  return {
    yards,
    pathIn,
    windageIn,
    velocityFps: h.v,
    energyFtlb: energyFtlb(weightGr, h.v),
    tofSec: h.tof,
    mach: h.v / sos,
    comeUpMoa: inchesToMoa(upIn, yards),
    comeUpMil: inchesToMil(upIn, yards),
    comeRightMoa: inchesToMoa(rightIn, yards),
    comeRightMil: inchesToMil(rightIn, yards),
  };
}

export function lookAngleRad(distanceYards: number, elevationFt: number): number {
  const slantFt = Math.max(1, distanceYards * 3);
  const s = Math.max(-1, Math.min(1, elevationFt / slantFt));
  return Math.asin(s);
}

export function solve(shot: Shot): Solution | null {
  if (!(shot.bc > 0.02) || !(shot.mvFps > 300) || !(shot.weightGr > 10)) return null;
  if (!(shot.diameterIn > 0.1) || !(shot.zeroYards > 5) || !(shot.distanceYards > 5)) return null;

  const air = describeAir(shot.conditions);
  const table = shot.drag === "G7" ? G7 : G1;
  const look = lookAngleRad(shot.distanceYards, shot.elevationFt);
  const length = shot.lengthIn ?? estimateLengthIn(shot.weightGr, shot.diameterIn);
  const sg = millerSg({
    weightGr: shot.weightGr,
    diameterIn: shot.diameterIn,
    lengthIn: length,
    twistIn: shot.twistIn,
    mvFps: shot.mvFps,
  });

  const basePhys = (wind: boolean, coriolis: boolean): Phys => {
    const w = wind ? windComponents(shot.windMph, shot.windClock) : { headFps: 0, fromRightFps: 0 };
    const lat = (shot.conditions.latitudeDeg * Math.PI) / 180;
    const az = (shot.conditions.azimuthDeg * Math.PI) / 180;
    return {
      table,
      bc: shot.bc,
      densityRatio: air.densityRatio,
      sos: air.speedOfSound,
      airX: -w.headFps,
      airZ: -w.fromRightFps,
      gx: -G * Math.sin(look),
      gy: -G * Math.cos(look),
      coriolis,
      corRight: coriolis ? 2 * OMEGA * Math.sin(lat) : 0,
      corUp: coriolis ? 2 * OMEGA * Math.cos(lat) * Math.sin(az) : 0,
    };
  };

  const sightFt = shot.sightHeightIn / 12;
  const zeroFt = shot.zeroYards * 3;
  const calm = basePhys(false, false);

  let lo = -0.02;
  let hi = 0.02;
  const yAt = (theta: number) =>
    fly({
      stopFt: zeroFt,
      gatesFt: null,
      theta,
      mv: shot.mvFps,
      sightFt,
      phys: calm,
      spinInPerSec: null,
    }).end.y;
  let yLo = yAt(lo);
  let yHi = yAt(hi);
  for (let i = 0; i < 8 && yLo > 0; i++) {
    lo -= 0.02;
    yLo = yAt(lo);
  }
  for (let i = 0; i < 8 && yHi < 0; i++) {
    hi += 0.02;
    yHi = yAt(hi);
  }
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const y = yAt(mid);
    if (y < 0) lo = mid;
    else hi = mid;
  }
  const theta = (lo + hi) / 2;

  const maxY = Math.max(shot.maxYards, shot.distanceYards, shot.zeroYards);
  const gates: number[] = [];
  for (let y = 25; y <= maxY + 0.1; y += 25) gates.push(y * 3);
  const targetFt = shot.distanceYards * 3;
  if (!gates.some((g) => Math.abs(g - targetFt) < 0.5)) gates.push(targetFt);
  gates.sort((a, b) => a - b);

  const spin = shot.conditions.useSpinDrift
    ? (tof: number) => Math.sign(shot.twistIn || 1) * spinDriftInches(sg, tof)
    : null;

  const flight = fly({
    stopFt: maxY * 3,
    gatesFt: gates,
    theta,
    mv: shot.mvFps,
    sightFt,
    phys: basePhys(true, shot.conditions.useCoriolis),
    spinInPerSec: spin,
  });

  const samples = flight.hits.map((h) => toSample(h, shot.weightGr, air.speedOfSound));
  const atTarget = toSample(
    nearestHit(flight.hits, targetFt) ?? flight.end,
    shot.weightGr,
    air.speedOfSound,
  );

  return {
    samples,
    atTarget,
    zeroAngleMoa: (theta * 180 * 60) / Math.PI,
    lookAngleDeg: (look * 180) / Math.PI,
    stability: sg,
    densityRatio: air.densityRatio,
    speedOfSound: air.speedOfSound,
    pressureInHg: air.pressureInHg,
    marginal: sg > 0 && sg < 1.4,
  };
}

function nearestHit(hits: Hit[], ft: number): Hit | null {
  let best: Hit | null = null;
  let bestD = 1e9;
  for (const h of hits) {
    const d = Math.abs(h.ft - ft);
    if (d < bestD) {
      best = h;
      bestD = d;
    }
  }
  return bestD < 2 ? best : null;
}

export function sampleAt(samples: Sample[], yards: number): Sample | null {
  if (samples.length === 0) return null;
  if (yards <= samples[0]!.yards) return samples[0]!;
  const last = samples[samples.length - 1]!;
  if (yards >= last.yards) return last;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid]!.yards <= yards) lo = mid;
    else hi = mid;
  }
  const a = samples[lo]!;
  const b = samples[hi]!;
  const u = (yards - a.yards) / Math.max(1e-6, b.yards - a.yards);
  const pathIn = lerp(a.pathIn, b.pathIn, u);
  const windageIn = lerp(a.windageIn, b.windageIn, u);
  const velocityFps = lerp(a.velocityFps, b.velocityFps, u);
  const upIn = -pathIn;
  const rightIn = -windageIn;
  return {
    yards,
    pathIn,
    windageIn,
    velocityFps,
    energyFtlb: lerp(a.energyFtlb, b.energyFtlb, u),
    tofSec: lerp(a.tofSec, b.tofSec, u),
    mach: lerp(a.mach, b.mach, u),
    comeUpMoa: inchesToMoa(upIn, yards),
    comeUpMil: inchesToMil(upIn, yards),
    comeRightMoa: inchesToMoa(rightIn, yards),
    comeRightMil: inchesToMil(rightIn, yards),
  };
}

/** Binary-search muzzle velocity so come-up at a range matches an observed inch drop (positive = low). */
export function trueMuzzleVelocity(
  shot: Shot,
  observedLowInches: number,
  atYards: number,
): number | null {
  let lo = shot.mvFps * 0.8;
  let hi = shot.mvFps * 1.2;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    const sol = solve({ ...shot, mvFps: mid, distanceYards: atYards, maxYards: Math.max(shot.maxYards, atYards) });
    if (!sol) return null;
    const low = -sol.atTarget.pathIn;
    if (low > observedLowInches) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

export const STD_AIR: Conditions = {
  tempF: 59,
  altitudeFt: 0,
  pressureInHg: 29.92,
  humidityPct: 0,
  latitudeDeg: 35,
  azimuthDeg: 0,
  useCoriolis: false,
  useSpinDrift: false,
};
