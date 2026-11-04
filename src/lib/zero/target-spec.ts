import type { Pt } from "./homography";

/** Inches. The scanned square is this board; the calibration bar sits outside it. */
export const BOARD_IN = 7;
export const FID_IN = 0.55;
export const POA: Pt = { x: 3.5, y: 3.5 };
/** Fiducial centers: TL, TR, BR, BL. */
export const FIDUCIALS: readonly Pt[] = [
  { x: 0.42, y: 0.42 },
  { x: 6.58, y: 0.42 },
  { x: 6.58, y: 6.58 },
  { x: 0.42, y: 6.58 },
];

export const INK = "#161616";
export const PAPER = "#f3f0e6";
export const RULE = "#c9c3b4";

export type Shape =
  | { t: "rect"; x: number; y: number; w: number; h: number; fill: string }
  | { t: "circle"; x: number; y: number; r: number; stroke: string; sw: number }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; sw: number };

export function targetShapes(holes: readonly Pt[] = []): Shape[] {
  const shapes: Shape[] = [{ t: "rect", x: 0, y: 0, w: BOARD_IN, h: BOARD_IN, fill: PAPER }];
  for (let i = 1; i < BOARD_IN; i++) {
    shapes.push({ t: "line", x1: i, y1: 0.85, x2: i, y2: BOARD_IN - 0.85, stroke: RULE, sw: 0.012 });
    shapes.push({ t: "line", x1: 0.85, y1: i, x2: BOARD_IN - 0.85, y2: i, stroke: RULE, sw: 0.012 });
  }
  for (const c of FIDUCIALS) {
    const o = FID_IN;
    const m = FID_IN * 0.62;
    const k = FID_IN * 0.28;
    shapes.push({ t: "rect", x: c.x - o / 2, y: c.y - o / 2, w: o, h: o, fill: INK });
    shapes.push({ t: "rect", x: c.x - m / 2, y: c.y - m / 2, w: m, h: m, fill: PAPER });
    shapes.push({ t: "rect", x: c.x - k / 2, y: c.y - k / 2, w: k, h: k, fill: INK });
  }
  shapes.push({ t: "circle", x: POA.x, y: POA.y, r: 0.32, stroke: RULE, sw: 0.02 });
  const tick = 0.22;
  shapes.push(
    { t: "line", x1: POA.x - 0.55, y1: POA.y, x2: POA.x - tick, y2: POA.y, stroke: RULE, sw: 0.018 },
    { t: "line", x1: POA.x + tick, y1: POA.y, x2: POA.x + 0.55, y2: POA.y, stroke: RULE, sw: 0.018 },
    { t: "line", x1: POA.x, y1: POA.y - 0.55, x2: POA.x, y2: POA.y - tick, stroke: RULE, sw: 0.018 },
    { t: "line", x1: POA.x, y1: POA.y + tick, x2: POA.x, y2: POA.y + 0.55, stroke: RULE, sw: 0.018 },
  );
  for (const h of holes) {
    shapes.push({ t: "circle", x: h.x, y: h.y, r: 0.09, stroke: INK, sw: 0.18 });
  }
  return shapes;
}

/** Sample group used by the in-app demo photo. Inches, y down. Center is 1.30 right, 0.70 high. */
export const DEMO_HOLES: readonly Pt[] = [
  { x: 5.05, y: 2.72 },
  { x: 4.55, y: 2.88 },
];

export const DEMO_OFFSET = { rightIn: 1.3, highIn: 0.7 };
