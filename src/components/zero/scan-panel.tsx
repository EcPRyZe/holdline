import { zeroDial } from "@/lib/ballistics/clicks";
import { useHold } from "@/lib/store";
import { useWork } from "@/lib/use-solution";
import { Button, Field, fieldClass } from "@/components/ui";
import {
  canvasFromFile,
  defaultCorners,
  demoCanvas,
  detectCorners,
  extremeSpread,
  findHoles,
  groupCenter,
  rectify,
} from "@/lib/zero/scan";
import { DEMO_OFFSET, FIDUCIALS } from "@/lib/zero/target-spec";
import type { Pt } from "@/lib/zero/homography";
import { useEffect, useRef, useState, type PointerEvent } from "react";

export function ScanPanel() {
  const gunZero = useHold((s) => s.gun.zeroYards);
  const glass = useHold((s) => s.glass);
  const optic = useWork().optic;
  const [range, setRange] = useState(gunZero);
  const [bar, setBar] = useState(5);
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [corners, setCorners] = useState<Pt[] | null>(null);
  const [holes, setHoles] = useState<Pt[]>([]);
  const [flat, setFlat] = useState<HTMLCanvasElement | null>(null);
  const [manual, setManual] = useState(false);
  const [rightIn, setRightIn] = useState(0);
  const [highIn, setHighIn] = useState(0);
  const [note, setNote] = useState("Print the sheet, confirm the 5-inch bar, shoot a group, then photograph it square-on.");
  const viewRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<number | null>(null);

  useEffect(() => {
    const canvas = viewRef.current;
    const pic = flat ?? source;
    if (!canvas || !pic) return;
    canvas.width = pic.width;
    canvas.height = pic.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(pic, 0, 0);
    if (!flat && corners) {
      ctx.strokeStyle = "#d6a24a";
      ctx.fillStyle = "#d6a24a";
      ctx.lineWidth = Math.max(2, pic.width / 200);
      ctx.beginPath();
      corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
      for (const p of corners) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(10, pic.width / 50), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (flat) {
      const k = canvas.width / 7;
      ctx.strokeStyle = "#d6a24a";
      ctx.lineWidth = 3;
      for (const h of holes) {
        ctx.beginPath();
        ctx.arc(h.x * k, h.y * k, 0.18 * k, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [source, corners, flat, holes]);

  const loadCanvas = (pic: HTMLCanvasElement, demo: boolean) => {
    const found = detectCorners(pic);
    const known = FIDUCIALS.map((p) => ({ x: (p.x / 7) * pic.width, y: (p.y / 7) * pic.height }));
    setSource(pic);
    setFlat(null);
    setHoles([]);
    setManual(false);
    setCorners(found ?? (demo ? known : defaultCorners(pic.width, pic.height)));
    setNote(
      found
        ? demo
          ? "Sample group loaded. Corners found. Read the group — it should come out 1.3 inches right and 0.7 high."
          : "Corners locked onto the four anchors. Drag one if it missed, then read the group."
        : "Couldn’t see the four anchors. Drag the brass handles onto the centers of the corner marks.",
    );
  };

  const readGroup = () => {
    if (!source || !corners) return;
    const flatCanvas = rectify(source, corners);
    if (!flatCanvas) {
      setNote("Those four points don’t form a readable target. Spread the handles onto the corner marks.");
      return;
    }
    const found = findHoles(flatCanvas);
    setFlat(flatCanvas);
    setHoles(found);
    setManual(false);
    const center = groupCenter(found, bar / 5);
    if (center) {
      setRightIn(Number(center.rightIn.toFixed(2)));
      setHighIn(Number(center.highIn.toFixed(2)));
      setNote(`${found.length} hole${found.length === 1 ? "" : "s"} marked. Tap the flat target to add or remove one.`);
    } else {
      setNote("No holes inside the grid. Tap each bullet hole on the flattened target.");
    }
  };

  const onPointer = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = viewRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    if (flat) {
      if (e.type !== "pointerdown") return;
      const xin = (x / canvas.width) * 7;
      const yin = (y / canvas.height) * 7;
      const idx = holes.findIndex((h) => Math.hypot(h.x - xin, h.y - yin) < 0.28);
      const next = idx >= 0 ? holes.filter((_, i) => i !== idx) : [...holes, { x: xin, y: yin }];
      setHoles(next);
      setManual(false);
      const center = groupCenter(next, bar / 5);
      if (center) {
        setRightIn(Number(center.rightIn.toFixed(2)));
        setHighIn(Number(center.highIn.toFixed(2)));
      }
      return;
    }
    if (!corners) return;
    if (e.type === "pointerdown") {
      let best = 0;
      let bestD = Infinity;
      corners.forEach((p, i) => {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      drag.current = bestD < canvas.width / 8 ? best : null;
    } else if (e.type === "pointermove" && drag.current != null) {
      const next = corners.slice();
      next[drag.current] = { x, y };
      setCorners(next);
    } else if (e.type === "pointerup") {
      drag.current = null;
    }
  };

  const scale = bar / 5;
  const live = manual ? { rightIn, highIn } : (groupCenter(holes, scale) ?? { rightIn, highIn });
  const dial = zeroDial(live.rightIn, live.highIn, Math.max(10, range), glass.click, glass.clickUnit);
  const spread = extremeSpread(holes, scale);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{note}</p>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex h-11 cursor-pointer items-center rounded-md bg-brass px-3 text-sm font-medium text-bg">
          Photograph target
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void canvasFromFile(file).then((c) => loadCanvas(c, false));
            }}
          />
        </label>
        <Button onClick={() => loadCanvas(demoCanvas(), true)}>Sample group</Button>
        <Button onClick={readGroup} disabled={!source}>
          Read group
        </Button>
      </div>
      {source ? (
        <canvas
          ref={viewRef}
          onPointerDown={onPointer}
          onPointerMove={onPointer}
          onPointerUp={onPointer}
          className="h-auto w-full touch-none rounded-md border border-line bg-paper"
        />
      ) : (
        <canvas ref={viewRef} className="hidden" />
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Shot at (yd)">
          <input className={fieldClass} type="number" value={range} onChange={(e) => setRange(Number(e.target.value))} />
        </Field>
        <Field label="Bar measures (in)" hint="The printed line is 5.000 in if the scale is honest.">
          <input className={fieldClass} type="number" step={0.01} value={bar} onChange={(e) => setBar(Number(e.target.value) || 5)} />
        </Field>
        <Field label="Group right (in)">
          <input
            className={fieldClass}
            type="number"
            step={0.01}
            value={live.rightIn}
            onChange={(e) => {
              setManual(true);
              setRightIn(Number(e.target.value));
            }}
          />
        </Field>
        <Field label="Group high (in)">
          <input
            className={fieldClass}
            type="number"
            step={0.01}
            value={live.highIn}
            onChange={(e) => {
              setManual(true);
              setHighIn(Number(e.target.value));
            }}
          />
        </Field>
      </div>
      <div className="rounded-md border border-line bg-surface px-3 py-4 text-center">
        <p className="text-xs tracking-wide text-muted uppercase">
          {optic ? `${optic.maker} ${optic.name}` : "Optic"} · {glass.click > 0 ? `${glass.click} ${glass.clickUnit} / click` : "no clicks"}
        </p>
        <p className="mt-2 font-display text-4xl tracking-wide text-brass">
          {glass.click > 0 ? `${dial.elevWord}` : `${dial.highIn.toFixed(2)}″ ${dial.highIn >= 0 ? "HIGH" : "LOW"}`}
        </p>
        <p className="font-display text-4xl tracking-wide text-brass">
          {glass.click > 0 ? dial.windWord : `${Math.abs(dial.rightIn).toFixed(2)}″ ${dial.rightIn >= 0 ? "RIGHT" : "LEFT"}`}
        </p>
        <p className="mt-2 text-sm text-muted tabular-nums">
          {dial.moaHigh.toFixed(2)} MOA {dial.moaHigh >= 0 ? "high" : "low"} · {Math.abs(dial.moaRight).toFixed(2)} MOA{" "}
          {dial.moaRight >= 0 ? "right" : "left"}
          {holes.length > 1 ? ` · ${spread.toFixed(2)}″ extreme spread` : ""}
        </p>
        {glass.click > 0 ? (
          <p className="mt-1 text-xs text-muted">
            Exact: {dial.downExact.toFixed(2)} elevation clicks, {dial.leftExact.toFixed(2)} windage clicks before rounding. UP and RIGHT mean the direction printed on the turret — the way the next impact moves.
          </p>
        ) : null}
      </div>
      <p className="text-xs text-muted">
        The sample group is centered {DEMO_OFFSET.rightIn.toFixed(1)}″ right and {DEMO_OFFSET.highIn.toFixed(1)}″ high of the aim point. A real photo wants the whole 7-inch square, including all four corner marks, and no fingers on them.
      </p>
    </div>
  );
}
