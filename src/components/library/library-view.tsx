import { CALIBERS } from "@/lib/data/catalog";
import type { Load, Optic, ReticleId, Rifle } from "@/lib/data/types";
import { RETICLE_CHOICES, allLoads, allOptics, allRifles, newId, useHold } from "@/lib/store";
import { Button, Field, Seg, fieldClass } from "@/components/ui";
import { useMemo, useState } from "react";

type Kind = "rifles" | "loads" | "optics";

export function LibraryView() {
  const s = useHold();
  const [kind, setKind] = useState<Kind>("rifles");
  const [q, setQ] = useState("");
  const rifles = allRifles(s.customRifles);
  const loads = allLoads(s.customLoads);
  const optics = allOptics(s.customOptics);
  const query = q.trim().toLowerCase();

  const rifleRows = useMemo(
    () => rifles.filter((r) => hit(query, r.name, r.maker, r.note, caliberName(r.caliberId))),
    [rifles, query],
  );
  const loadRows = useMemo(
    () => loads.filter((l) => hit(query, l.name, l.maker, l.source, caliberName(l.caliberId))),
    [loads, query],
  );
  const opticRows = useMemo(
    () => optics.filter((o) => hit(query, o.name, o.maker, o.note, o.reticle)),
    [optics, query],
  );

  return (
    <div className="rise flex flex-col gap-4">
      <div>
        <h2 className="font-display text-3xl tracking-wide">Library</h2>
        <p className="text-sm text-muted">
          Factory velocities are the maker’s test-barrel numbers, or marked estimates. Barrel-length scaling is a fps-per-inch guess. Chronograph, then true it.
        </p>
      </div>
      <Seg
        value={kind}
        onChange={(id) => setKind(id as Kind)}
        options={[
          { id: "rifles", label: "Rifles" },
          { id: "loads", label: "Loads" },
          { id: "optics", label: "Optics" },
        ]}
      />
      <input className={fieldClass} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      {kind === "rifles" ? (
        <List
          rows={rifleRows.map((r) => ({
            id: r.id,
            title: `${r.maker} ${r.name}`,
            meta: `${caliberName(r.caliberId)} · ${r.barrelIn}″ · 1:${r.twistIn} · ${r.sightHeightIn}″ height · ${r.zeroYards} yd zero`,
            note: r.note,
            active: s.gun.rifleId === r.id,
            custom: Boolean(r.custom),
          }))}
          onUse={(id) => {
            s.selectRifle(id);
            s.setTab("solve");
          }}
          onRemove={(id) => s.removeCustom("rifle", id)}
        />
      ) : null}
      {kind === "loads" ? (
        <List
          rows={loadRows.map((l) => ({
            id: l.id,
            title: `${l.maker} ${l.name}`,
            meta: `${caliberName(l.caliberId)} · ${l.weightGr} gr · ${l.drag} ${l.bc} · ${l.mvFps} fps from ${l.testBarrelIn}″`,
            note: l.source,
            active: s.ammo.loadId === l.id,
            custom: Boolean(l.custom),
          }))}
          onUse={(id) => {
            s.selectLoad(id);
            s.setTab("solve");
          }}
          onRemove={(id) => s.removeCustom("load", id)}
        />
      ) : null}
      {kind === "optics" ? (
        <List
          rows={opticRows.map((o) => ({
            id: o.id,
            title: `${o.maker} ${o.name}`,
            meta: `${o.kind} · ${o.click > 0 ? `${o.click} ${o.clickUnit}/click` : "no turret"} · ${o.magMin}–${o.magMax}×`,
            note: o.note,
            active: s.glass.opticId === o.id,
            custom: Boolean(o.custom),
          }))}
          onUse={(id) => {
            s.selectOptic(id);
            s.setTab("solve");
          }}
          onRemove={(id) => s.removeCustom("optic", id)}
        />
      ) : null}
      {kind === "rifles" ? <NewRifle /> : null}
      {kind === "loads" ? <NewLoad /> : null}
      {kind === "optics" ? <NewOptic /> : null}
      <p className="text-xs text-muted">
        The solver is a G1/G7 point-mass with a Runge–Kutta step and an ICAO atmosphere. It reproduces Hornady’s published 140 gr ELD Match 6.5 Creedmoor table (24″, 2,710 fps, G7 0.326, 200-yard zero, 1.5″ sight height) to about a tenth of an inch at 300 yards. Your rifle will not. True it.
      </p>
    </div>
  );
}

function hit(q: string, ...parts: string[]): boolean {
  if (!q) return true;
  return parts.join(" ").toLowerCase().includes(q);
}

function caliberName(id: string): string {
  return CALIBERS.find((c) => c.id === id)?.name ?? id;
}

function List({
  rows,
  onUse,
  onRemove,
}: {
  rows: { id: string; title: string; meta: string; note: string; active: boolean; custom: boolean }[];
  onUse: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [armed, setArmed] = useState<string | null>(null);
  if (rows.length === 0) return <p className="text-sm text-muted">Nothing matches.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.id} className={`rounded-md border px-3 py-3 ${r.active ? "border-brass bg-surface" : "border-line bg-surface"}`}>
          <p className="text-sm font-medium text-fg">{r.title}</p>
          <p className="text-xs text-brass">{r.meta}</p>
          <p className="mt-1 text-xs text-muted">{r.note}</p>
          <div className="mt-2 flex gap-2">
            <Button tone="brass" onClick={() => onUse(r.id)}>
              Use
            </Button>
            {r.custom ? (
              <Button
                onClick={() => {
                  if (armed === r.id) onRemove(r.id);
                  else setArmed(r.id);
                }}
              >
                {armed === r.id ? "Confirm delete" : "Delete"}
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function NewRifle() {
  const add = useHold((s) => s.addRifle);
  const [name, setName] = useState("My rifle");
  const [caliberId, setCaliberId] = useState("308");
  const [barrel, setBarrel] = useState(20);
  const [twist, setTwist] = useState(10);
  const [height, setHeight] = useState(1.5);
  const [zero, setZero] = useState(100);
  return (
    <details className="rounded-md border border-line bg-surface">
      <summary className="px-3 py-3 text-sm font-medium">Add a rifle</summary>
      <div className="grid gap-3 px-3 pb-3">
        <Field label="Name">
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <CaliberPick value={caliberId} onChange={setCaliberId} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Barrel (in)">
            <input className={fieldClass} type="number" value={barrel} onChange={(e) => setBarrel(Number(e.target.value))} />
          </Field>
          <Field label="Twist (in)">
            <input className={fieldClass} type="number" value={twist} onChange={(e) => setTwist(Number(e.target.value))} />
          </Field>
          <Field label="Sight height (in)">
            <input className={fieldClass} type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
          </Field>
          <Field label="Zero (yd)">
            <input className={fieldClass} type="number" value={zero} onChange={(e) => setZero(Number(e.target.value))} />
          </Field>
        </div>
        <Button
          tone="brass"
          onClick={() => {
            const rifle: Rifle = {
              id: newId("rifle"),
              name,
              maker: "Custom",
              caliberId,
              barrelIn: barrel,
              twistIn: twist,
              sightHeightIn: height,
              zeroYards: zero,
              note: "Saved on this device.",
              custom: true,
            };
            add(rifle);
          }}
        >
          Save rifle
        </Button>
      </div>
    </details>
  );
}

function NewLoad() {
  const add = useHold((s) => s.addLoad);
  const [name, setName] = useState("My load");
  const [caliberId, setCaliberId] = useState("308");
  const [weight, setWeight] = useState(175);
  const [bc, setBc] = useState(0.243);
  const [drag, setDrag] = useState<"G1" | "G7">("G7");
  const [mv, setMv] = useState(2600);
  const [barrel, setBarrel] = useState(24);
  return (
    <details className="rounded-md border border-line bg-surface">
      <summary className="px-3 py-3 text-sm font-medium">Add a load</summary>
      <div className="grid gap-3 px-3 pb-3">
        <Field label="Name">
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <CaliberPick value={caliberId} onChange={setCaliberId} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight (gr)">
            <input className={fieldClass} type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
          </Field>
          <Field label="BC">
            <input className={fieldClass} type="number" step={0.001} value={bc} onChange={(e) => setBc(Number(e.target.value))} />
          </Field>
          <Field label="Muzzle velocity">
            <input className={fieldClass} type="number" value={mv} onChange={(e) => setMv(Number(e.target.value))} />
          </Field>
          <Field label="Test barrel (in)">
            <input className={fieldClass} type="number" value={barrel} onChange={(e) => setBarrel(Number(e.target.value))} />
          </Field>
        </div>
        <Seg
          value={drag}
          onChange={(id) => setDrag(id as "G1" | "G7")}
          options={[
            { id: "G7", label: "G7" },
            { id: "G1", label: "G1" },
          ]}
        />
        <Button
          tone="brass"
          onClick={() => {
            const load: Load = {
              id: newId("load"),
              name,
              maker: "Custom",
              caliberId,
              weightGr: weight,
              bc,
              drag,
              mvFps: mv,
              testBarrelIn: barrel,
              fpsPerInch: 20,
              lengthIn: null,
              source: "Entered on this device.",
              custom: true,
            };
            add(load);
          }}
        >
          Save load
        </Button>
      </div>
    </details>
  );
}

function NewOptic() {
  const add = useHold((s) => s.addOptic);
  const [name, setName] = useState("My optic");
  const [click, setClick] = useState(0.1);
  const [unit, setUnit] = useState<"MOA" | "MIL">("MIL");
  const [reticle, setReticle] = useState<ReticleId>("mil-hash");
  const [magMin, setMagMin] = useState(1);
  const [magMax, setMagMax] = useState(6);
  const [sfp, setSfp] = useState(false);
  return (
    <details className="rounded-md border border-line bg-surface">
      <summary className="px-3 py-3 text-sm font-medium">Add an optic</summary>
      <div className="grid gap-3 px-3 pb-3">
        <Field label="Name">
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Reticle">
          <select className={fieldClass} value={reticle} onChange={(e) => setReticle(e.target.value as ReticleId)}>
            {RETICLE_CHOICES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Click">
            <input className={fieldClass} type="number" step={0.01} value={click} onChange={(e) => setClick(Number(e.target.value))} />
          </Field>
          <Field label="Low power">
            <input className={fieldClass} type="number" value={magMin} onChange={(e) => setMagMin(Number(e.target.value))} />
          </Field>
          <Field label="High power">
            <input className={fieldClass} type="number" value={magMax} onChange={(e) => setMagMax(Number(e.target.value))} />
          </Field>
        </div>
        <Seg
          value={unit}
          onChange={(id) => setUnit(id as "MOA" | "MIL")}
          options={[
            { id: "MIL", label: "MIL" },
            { id: "MOA", label: "MOA" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sfp} onChange={(e) => setSfp(e.target.checked)} />
          Second focal plane (marks true at the high power)
        </label>
        <Button
          tone="brass"
          onClick={() => {
            const optic: Optic = {
              id: newId("optic"),
              name,
              maker: "Custom",
              kind: magMax > 1.1 ? "scope" : "dot",
              click,
              clickUnit: unit,
              reticle,
              magMin,
              magMax,
              sfpCalMag: sfp ? magMax : null,
              note: "Saved on this device.",
              custom: true,
            };
            add(optic);
          }}
        >
          Save optic
        </Button>
      </div>
    </details>
  );
}

function CaliberPick({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <Field label="Caliber">
      <select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {CALIBERS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
