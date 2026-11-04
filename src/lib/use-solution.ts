import { useMemo } from "react";
import { solve, type Shot, type Solution } from "@/lib/ballistics/engine";
import { CALIBERS } from "@/lib/data/catalog";
import type { Load, Optic, Rifle } from "@/lib/data/types";
import { allLoads, allOptics, allRifles, useHold } from "@/lib/store";

export type Work = {
  rifle: Rifle | undefined;
  load: Load | undefined;
  optic: Optic | undefined;
  shot: Shot | null;
  solution: Solution | null;
  mv: number;
  mvNote: string;
  warning: string | null;
};

export function useWork(): Work {
  const s = useHold();
  const rifle = allRifles(s.customRifles).find((r) => r.id === s.gun.rifleId);
  const load = allLoads(s.customLoads).find((l) => l.id === s.ammo.loadId);
  const optic = allOptics(s.customOptics).find((o) => o.id === s.glass.opticId);

  return useMemo(() => {
    if (!load) {
      return { rifle, load, optic, shot: null, solution: null, mv: 0, mvNote: "", warning: "Pick a load." };
    }
    const cal = CALIBERS.find((c) => c.id === load.caliberId);
    const mismatch = Boolean(rifle && rifle.caliberId !== load.caliberId);
    let mv = s.ammo.customMv;
    let mvNote = "Manual muzzle velocity";
    if (s.ammo.mvMode === "factory" || mismatch) {
      mv = load.mvFps;
      mvNote = `Factory ${load.mvFps} fps from a ${load.testBarrelIn}″ test barrel`;
    } else if (s.ammo.mvMode === "estimated") {
      const delta = s.gun.barrelIn - load.testBarrelIn;
      mv = Math.round(load.mvFps + delta * load.fpsPerInch);
      mvNote =
        Math.abs(delta) < 0.2
          ? `Factory ${load.mvFps} fps, ${load.testBarrelIn}″ test barrel`
          : `Estimated ${mv} fps · ${delta > 0 ? "+" : ""}${delta.toFixed(1)}″ from the ${load.testBarrelIn}″ test barrel at ${load.fpsPerInch} fps/in`;
    }
    const warning = mismatch
      ? `${load.maker} ${load.name} is ${cal?.name ?? load.caliberId}, not the rifle's chamber. Factory velocity is being used.`
      : Math.abs(s.gun.barrelIn - load.testBarrelIn) > 6 && s.ammo.mvMode === "estimated"
        ? "That barrel is a long way from the test barrel. The fps-per-inch estimate gets worse as the gap grows — chronograph it."
        : null;

    const shot: Shot = {
      mvFps: mv,
      weightGr: s.ammo.weightGr,
      diameterIn: cal?.diameterIn ?? 0.308,
      lengthIn: load.lengthIn,
      bc: s.ammo.bc,
      drag: s.ammo.drag,
      twistIn: s.gun.twistIn,
      sightHeightIn: s.gun.sightHeightIn,
      zeroYards: s.gun.zeroYards,
      distanceYards: s.distanceYards,
      elevationFt: s.elevationFt,
      windMph: s.windMph,
      windClock: s.windClock,
      maxYards: Math.max(200, s.maxYards),
      conditions: {
        tempF: s.tempF,
        altitudeFt: s.altitudeFt,
        pressureInHg: s.pressureInHg,
        humidityPct: s.humidityPct,
        latitudeDeg: s.latitudeDeg,
        azimuthDeg: s.azimuthDeg,
        useCoriolis: s.useCoriolis,
        useSpinDrift: s.useSpinDrift,
      },
    };
    return { rifle, load, optic, shot, solution: solve(shot), mv, mvNote, warning };
  }, [s, rifle, load, optic]);
}
