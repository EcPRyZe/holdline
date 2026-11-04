import { holdToClicks } from "@/lib/ballistics/clicks";
import { inchesToMoa, sampleAt, trueMuzzleVelocity } from "@/lib/ballistics/engine";
import { bdcSpec } from "@/lib/data/bdc";
import { useHold } from "@/lib/store";
import { useWork } from "@/lib/use-solution";
import { SightPicture } from "@/components/reticle/sight-picture";
import { Button, Field, Seg, fieldClass } from "@/components/ui";
import { useState } from "react";

function clockLabel(hour: number): string {
  const h = ((hour % 12) + 12) % 12;
  const face = h === 0 ? 12 : h;
  const rad = ((h * 30) * Math.PI) / 180;
  const cross = Math.abs(Math.sin(rad));
  const head = Math.cos(rad);
  if (cross < 0.2) return `${face}:00 · ${head > 0 ? "headwind" : "tailwind"}`;
  const side = Math.sin(rad) > 0 ? "from the right" : "from the left";
  return `${face}:00 · ${cross > 0.92 ? "full value" : "quartering"}, ${side}`;
}

function signed(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  const v = Math.abs(n).toFixed(digits);
  return n > 0.005 ? `+${v}` : n < -0.005 ? `-${v}` : v;
}

export function SolveView() {
  const s = useHold();
  const work = useWork();
  const [frame, setFrame] = useState<"hold" | "reticle">("hold");
  const sol = work.solution;
  const at = sol?.atTarget;
  const optic = work.optic;
  const sfp = optic?.sfpCalMag ? optic.sfpCalMag / Math.max(optic.magMin, s.glass.mag) : 1;
  const unit = s.glass.clickUnit;
  const come = at ? (unit === "MOA" ? at.comeUpMoa : at.comeUpMil) : 0;
  const right = at ? (unit === "MOA" ? at.comeRightMoa : at.comeRightMil) : 0;
  const dial = at && optic ? holdToClicks(come, right, s.glass.click) : null;
  const distUnit = s.units === "yd" ? s.distanceYards : s.distanceYards * 0.9144;
  const moaInch = 1.0471975512 * (s.distanceYards / 100);
  const targetWMoa = moaInch > 0 ? s.targetWIn / moaInch : 1;
  const targetHMoa = moaInch > 0 ? s.targetHIn / moaInch : 1;
  const spec = optic ? bdcSpec(optic.reticle) : null;

  const setDist = (shown: number) => {
    const yards = s.units === "yd" ? shown : shown / 0.9144;
    s.patch({ distanceYards: Math.max(10, yards) });
  };

  return (
    <div className="rise flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Chip label={work.rifle ? `${work.rifle.maker} ${work.rifle.name}` : "Rifle"} onClick={() => s.setTab("library")} />
        <Chip label={work.load ? work.load.name : "Load"} onClick={() => s.setTab("library")} />
        <Chip label={optic ? `${optic.maker} ${optic.name}` : "Optic"} onClick={() => s.setTab("library")} />
      </div>

      {work.warning ? (
        <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg">{work.warning}</p>
      ) : null}
      {sol?.marginal ? (
        <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted">
          Stability factor {sol.stability.toFixed(2)}. Under 1.4 the bullet may yaw. A faster twist or a shorter bullet is safer.
        </p>
      ) : null}

      <SightPicture
        reticle={optic?.reticle ?? "duplex"}
        sfp={sfp}
        comeUpMoa={at?.comeUpMoa ?? 0}
        comeRightMoa={at?.comeRightMoa ?? 0}
        targetWMoa={targetWMoa}
        targetHMoa={targetHMoa}
        zoom={s.viewZoom}
        frame={frame}
      />
      <div className="flex justify-center gap-2">
        <button type="button" className={`h-9 rounded-md border px-3 text-sm ${frame === "hold" ? "border-brass text-brass" : "border-line text-muted"}`} onClick={() => setFrame("hold")}>
          Fit hold
        </button>
        <button type="button" className={`h-9 rounded-md border px-3 text-sm ${frame === "reticle" ? "border-brass text-brass" : "border-line text-muted"}`} onClick={() => setFrame("reticle")}>
          Whole reticle
        </button>
      </div>
      <p className="text-center text-xs text-muted">
        Sight picture at {distUnit.toFixed(0)} {s.units}
        {optic && optic.magMax > optic.magMin ? ` · ${s.glass.mag.toFixed(1)}×` : ""}
        {sfp !== 1 ? " · SFP subtensions are off cal" : ""}
      </p>
      {spec ? <p className="text-center text-xs text-muted">{spec.caption}</p> : null}

      <div className="grid grid-cols-2 gap-3">
        <Readout k="Elevation" v={at ? `${signed(come, 2)} ${unit}` : "—"} sub={dial ? dial.elevWord : at ? `${signed(-at.pathIn, 1)} in` : ""} />
        <Readout k="Windage" v={at ? `${signed(right, 2)} ${unit}` : "—"} sub={dial ? dial.windWord : ""} />
      </div>
      {dial ? (
        <p className="text-center font-display text-2xl tracking-wide text-brass">
          {dial.elev === 0 && dial.wind === 0 ? "HOLD CENTER" : `${dial.elevWord} · ${dial.windWord}`}
        </p>
      ) : (
        <p className="text-center text-sm text-muted">No turret on this sight — use the picture.</p>
      )}
      {at ? (
        <p className="text-center text-sm text-muted tabular-nums">
          {signed(-at.pathIn, 1)} in drop · {at.velocityFps.toFixed(0)} fps · {at.energyFtlb.toFixed(0)} ft-lb · {at.tofSec.toFixed(2)} s
          {at.mach < 1.2 ? " · transonic" : ""}
        </p>
      ) : null}

      <Field label={`Distance (${s.units})`}>
        <input
          className={fieldClass}
          inputMode="decimal"
          type="number"
          min={10}
          value={Number(distUnit.toFixed(1))}
          onChange={(e) => setDist(Number(e.target.value))}
        />
        <input
          type="range"
          min={s.units === "yd" ? 25 : 25}
          max={s.units === "yd" ? s.maxYards : Math.round(s.maxYards * 0.9144)}
          value={distUnit}
          onChange={(e) => setDist(Number(e.target.value))}
          className="mt-2 w-full accent-brass"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        {[25, 100, 300, 500, 800].map((yd) => (
          <button
            key={yd}
            type="button"
            className="h-9 rounded-md border border-line bg-surface px-3 text-sm text-fg"
            onClick={() => s.patch({ distanceYards: yd })}
          >
            {s.units === "yd" ? `${yd} yd` : `${Math.round(yd * 0.9144)} m`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Wind (mph)">
          <input
            className={fieldClass}
            inputMode="decimal"
            type="number"
            min={0}
            value={s.windMph}
            onChange={(e) => s.patch({ windMph: Number(e.target.value) })}
          />
        </Field>
        <Field label="From (clock)" hint={clockLabel(s.windClock)}>
          <input
            className={fieldClass}
            inputMode="decimal"
            type="number"
            min={0}
            max={12}
            step={0.5}
            value={s.windClock}
            onChange={(e) => s.patch({ windClock: Number(e.target.value) })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Target width (in)">
          <input className={fieldClass} type="number" min={1} value={s.targetWIn} onChange={(e) => s.patch({ targetWIn: Number(e.target.value) })} />
        </Field>
        <Field label="Target height (in)">
          <input className={fieldClass} type="number" min={1} value={s.targetHIn} onChange={(e) => s.patch({ targetHIn: Number(e.target.value) })} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="h-9 rounded-md border border-line px-3 text-sm" onClick={() => s.patch({ targetWIn: 8, targetHIn: 8 })}>8″ plate</button>
        <button type="button" className="h-9 rounded-md border border-line px-3 text-sm" onClick={() => s.patch({ targetWIn: 12, targetHIn: 18 })}>Vital zone</button>
        <button type="button" className="h-9 rounded-md border border-line px-3 text-sm" onClick={() => s.patch({ targetWIn: 18, targetHIn: 30 })}>Silhouette</button>
      </div>

      <Field label="View zoom" hint="Frames the glass. It does not change a first-focal-plane reticle.">
        <input type="range" min={0.6} max={2.4} step={0.05} value={s.viewZoom} onChange={(e) => s.patch({ viewZoom: Number(e.target.value) })} className="w-full accent-brass" />
      </Field>

      {optic && optic.magMax > optic.magMin ? (
        <Field label={`Optic power · ${s.glass.mag.toFixed(1)}×`} hint={optic.sfpCalMag ? `Second focal plane. Marks are true at ${optic.sfpCalMag}×.` : "First focal plane. Marks stay true as you zoom."}>
          <input
            type="range"
            min={optic.magMin}
            max={optic.magMax}
            step={0.1}
            value={s.glass.mag}
            onChange={(e) => s.patch({ glass: { ...s.glass, mag: Number(e.target.value) } })}
            className="w-full accent-brass"
          />
        </Field>
      ) : null}

      <details className="rounded-md border border-line bg-surface">
        <summary className="px-3 py-3 text-sm font-medium">Rifle, velocity, zero</summary>
        <div className="grid gap-3 px-3 pb-3">
          <p className="text-sm text-muted">{work.mvNote}</p>
          <Seg
            value={s.ammo.mvMode}
            onChange={(id) => s.patch({ ammo: { ...s.ammo, mvMode: id as typeof s.ammo.mvMode } })}
            options={[
              { id: "estimated", label: "Estimate" },
              { id: "factory", label: "Factory" },
              { id: "custom", label: "Chronograph" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Muzzle velocity">
              <input
                className={fieldClass}
                type="number"
                value={s.ammo.mvMode === "custom" ? s.ammo.customMv : work.mv}
                onChange={(e) => s.patch({ ammo: { ...s.ammo, mvMode: "custom", customMv: Number(e.target.value) } })}
              />
            </Field>
            <Field label={`BC (${s.ammo.drag})`}>
              <input className={fieldClass} type="number" step={0.001} value={s.ammo.bc} onChange={(e) => s.patch({ ammo: { ...s.ammo, bc: Number(e.target.value) } })} />
            </Field>
            <Field label="Drag model">
              <Seg
                value={s.ammo.drag}
                onChange={(id) => s.patch({ ammo: { ...s.ammo, drag: id as "G1" | "G7" } })}
                options={[
                  { id: "G7", label: "G7" },
                  { id: "G1", label: "G1" },
                ]}
              />
            </Field>
            <Field label="Bullet (gr)">
              <input className={fieldClass} type="number" value={s.ammo.weightGr} onChange={(e) => s.patch({ ammo: { ...s.ammo, weightGr: Number(e.target.value) } })} />
            </Field>
            <Field label="Barrel (in)">
              <input className={fieldClass} type="number" step={0.1} value={s.gun.barrelIn} onChange={(e) => s.patch({ gun: { ...s.gun, barrelIn: Number(e.target.value) } })} />
            </Field>
            <Field label="Twist (in / turn)" hint="Positive is right-hand. A minus sign is left-hand.">
              <input className={fieldClass} type="number" step={0.05} value={s.gun.twistIn} onChange={(e) => s.patch({ gun: { ...s.gun, twistIn: Number(e.target.value) } })} />
            </Field>
            <Field label="Sight height (in)">
              <input className={fieldClass} type="number" step={0.05} value={s.gun.sightHeightIn} onChange={(e) => s.patch({ gun: { ...s.gun, sightHeightIn: Number(e.target.value) } })} />
            </Field>
            <Field label="Zero (yd)">
              <input className={fieldClass} type="number" value={s.gun.zeroYards} onChange={(e) => s.patch({ gun: { ...s.gun, zeroYards: Number(e.target.value) } })} />
            </Field>
            <Field label={`Click (${s.glass.clickUnit})`}>
              <input className={fieldClass} type="number" step={0.01} value={s.glass.click} onChange={(e) => s.patch({ glass: { ...s.glass, click: Number(e.target.value) } })} />
            </Field>
            <Field label="Click unit">
              <Seg
                value={s.glass.clickUnit}
                onChange={(id) => s.patch({ glass: { ...s.glass, clickUnit: id as "MOA" | "MIL" } })}
                options={[
                  { id: "MOA", label: "MOA" },
                  { id: "MIL", label: "MIL" },
                ]}
              />
            </Field>
          </div>
          <Truing />
        </div>
      </details>

      <details className="rounded-md border border-line bg-surface">
        <summary className="px-3 py-3 text-sm font-medium">Air, slope, spin, Coriolis</summary>
        <div className="grid grid-cols-2 gap-3 px-3 pb-3">
          <Field label="Temperature (°F)">
            <input className={fieldClass} type="number" value={s.tempF} onChange={(e) => s.patch({ tempF: Number(e.target.value) })} />
          </Field>
          <Field label="Humidity (%)">
            <input className={fieldClass} type="number" value={s.humidityPct} onChange={(e) => s.patch({ humidityPct: Number(e.target.value) })} />
          </Field>
          <Field label="Altitude (ft)" hint={s.pressureInHg == null ? `Station pressure ${sol?.pressureInHg.toFixed(2) ?? "—"} inHg` : "Ignored while station pressure is set"}>
            <input className={fieldClass} type="number" value={s.altitudeFt} onChange={(e) => s.patch({ altitudeFt: Number(e.target.value) })} />
          </Field>
          <Field label="Pressure (inHg)" hint="Blank uses altitude">
            <input
              className={fieldClass}
              type="number"
              step={0.01}
              value={s.pressureInHg ?? ""}
              placeholder="Auto"
              onChange={(e) => {
                const raw = e.target.value;
                s.patch({ pressureInHg: raw === "" ? null : Number(raw) });
              }}
            />
          </Field>
          <Field label="Target elevation (ft)" hint={sol ? `${sol.lookAngleDeg.toFixed(2)}° look angle` : "Above the muzzle"}>
            <input className={fieldClass} type="number" value={s.elevationFt} onChange={(e) => s.patch({ elevationFt: Number(e.target.value) })} />
          </Field>
          <Field label="Latitude (°)" hint="North is positive. Used only with Coriolis.">
            <input className={fieldClass} type="number" value={s.latitudeDeg} onChange={(e) => s.patch({ latitudeDeg: Number(e.target.value) })} />
          </Field>
          <Field label="Azimuth (°)" hint="0 north, 90 east. Changes the vertical Coriolis.">
            <input className={fieldClass} type="number" value={s.azimuthDeg} onChange={(e) => s.patch({ azimuthDeg: Number(e.target.value) })} />
          </Field>
          <Field label="Card out to (yd)">
            <input className={fieldClass} type="number" value={s.maxYards} onChange={(e) => s.patch({ maxYards: Number(e.target.value) })} />
          </Field>
          <label className="flex h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={s.useSpinDrift} onChange={(e) => s.patch({ useSpinDrift: e.target.checked })} />
            Spin drift
          </label>
          <label className="flex h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={s.useCoriolis} onChange={(e) => s.patch({ useCoriolis: e.target.checked })} />
            Coriolis
          </label>
          <p className="col-span-2 text-xs text-muted">
            Density ratio {sol ? sol.densityRatio.toFixed(3) : "—"} · speed of sound {sol ? sol.speedOfSound.toFixed(0) : "—"} fps · SG {sol ? sol.stability.toFixed(2) : "—"}
            {work.load ? ` · ${work.load.source}` : ""}
          </p>
        </div>
      </details>
    </div>
  );
}

function Truing() {
  const s = useHold();
  const work = useWork();
  const [range, setRange] = useState(600);
  const [low, setLow] = useState(0);
  const [note, setNote] = useState("");
  return (
    <div className="grid gap-3 rounded-md border border-line p-3">
      <p className="text-sm text-fg">True velocity</p>
      <p className="text-xs text-muted">Shoot a known distance with the wind call you trust. Enter how many inches the group was low of the call. Positive means the real bullet hit low.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="At (yd)">
          <input className={fieldClass} type="number" value={range} onChange={(e) => setRange(Number(e.target.value))} />
        </Field>
        <Field label="Low by (in)">
          <input className={fieldClass} type="number" value={low} onChange={(e) => setLow(Number(e.target.value))} />
        </Field>
      </div>
      <Button
        tone="brass"
        onClick={() => {
          if (!work.shot) return;
          const predicted = work.solution ? -(sampleAt(work.solution.samples, range)?.pathIn ?? 0) : 0;
          const observed = predicted + low;
          const mv = trueMuzzleVelocity({ ...work.shot, distanceYards: range }, observed, range);
          if (!mv) {
            setNote("Could not true that shot.");
            return;
          }
          s.patch({ ammo: { ...s.ammo, mvMode: "custom", customMv: mv } });
          setNote(`Velocity set to ${mv} fps. Previous call was ${predicted.toFixed(1)} in low; you were ${low.toFixed(1)} in off that.`);
        }}
      >
        True muzzle velocity
      </Button>
      {note ? <p className="text-xs text-muted">{note}</p> : null}
      <p className="text-xs text-muted">
        A quick check: {range} yd is {inchesToMoa(1, range).toFixed(3)} MOA per inch.
      </p>
    </div>
  );
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="max-w-full truncate rounded-full border border-line bg-surface px-3 py-2 text-left text-sm text-fg">
      {label}
    </button>
  );
}

function Readout({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-3">
      <p className="text-xs tracking-wide text-muted uppercase">{k}</p>
      <p className="font-display text-3xl leading-none tracking-wide text-fg tabular-nums">{v}</p>
      <p className="mt-1 text-sm text-brass tabular-nums">{sub}</p>
    </div>
  );
}
