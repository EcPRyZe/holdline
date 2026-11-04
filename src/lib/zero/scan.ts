import { applyH, homography, type Pt } from "./homography";
import { BOARD_IN, FIDUCIALS, targetShapes, type Shape } from "./target-spec";

export function paintTarget(
  ctx: CanvasRenderingContext2D,
  px: number,
  holes: readonly Pt[] = [],
): void {
  const k = px / BOARD_IN;
  ctx.clearRect(0, 0, px, px);
  for (const shape of targetShapes(holes)) drawShape(ctx, shape, k);
}

function drawShape(ctx: CanvasRenderingContext2D, s: Shape, k: number): void {
  if (s.t === "rect") {
    ctx.fillStyle = s.fill;
    ctx.fillRect(s.x * k, s.y * k, s.w * k, s.h * k);
    return;
  }
  if (s.t === "circle") {
    ctx.beginPath();
    ctx.arc(s.x * k, s.y * k, Math.max(0.5, s.r * k), 0, Math.PI * 2);
    ctx.strokeStyle = s.stroke;
    ctx.lineWidth = Math.max(1, s.sw * k);
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(s.x1 * k, s.y1 * k);
  ctx.lineTo(s.x2 * k, s.y2 * k);
  ctx.strokeStyle = s.stroke;
  ctx.lineWidth = Math.max(1, s.sw * k);
  ctx.stroke();
}

export async function canvasFromFile(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const max = 1400;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

export function demoCanvas(): HTMLCanvasElement {
  const px = 900;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  paintTarget(ctx, px);
  // Two holes, drawn solid so the scanner can see them.
  const k = px / BOARD_IN;
  ctx.fillStyle = "#161616";
  for (const h of [
    { x: 5.05, y: 2.72 },
    { x: 4.55, y: 2.88 },
  ]) {
    ctx.beginPath();
    ctx.arc(h.x * k, h.y * k, 0.11 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

type Comp = { cx: number; cy: number; area: number; w: number; h: number };

export function detectCorners(canvas: HTMLCanvasElement): Pt[] | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  const n = w * h;
  for (let i = 0; i < n; i += 8) {
    const o = i * 4;
    sum += (data[o]! + data[o + 1]! + data[o + 2]!) / 3;
  }
  const mean = sum / Math.ceil(n / 8);
  const thresh = Math.min(70, mean * 0.42);
  const seen = new Uint8Array(n);
  const blobs: Comp[] = [];
  const stack: number[] = [];
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const start = y * w + x;
      if (seen[start]) continue;
      const o = start * 4;
      if ((data[o]! + data[o + 1]! + data[o + 2]!) / 3 > thresh) continue;
      let count = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let sx = 0;
      let sy = 0;
      stack.push(start);
      seen[start] = 1;
      while (stack.length) {
        const i = stack.pop()!;
        count++;
        const px = i % w;
        const py = (i - px) / w;
        sx += px;
        sy += py;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        const neigh = [
          [px - 1, py],
          [px + 1, py],
          [px, py - 1],
          [px, py + 1],
        ] as const;
        for (const [nx, ny] of neigh) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (seen[j]) continue;
          const jo = j * 4;
          if ((data[jo]! + data[jo + 1]! + data[jo + 2]!) / 3 > thresh) continue;
          seen[j] = 1;
          stack.push(j);
        }
      }
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const aspect = bw / bh;
      const fill = count / (bw * bh);
      if (bw < w * 0.02 || bh < h * 0.02) continue;
      if (bw > w * 0.28 || bh > h * 0.28) continue;
      if (aspect < 0.65 || aspect > 1.45) continue;
      if (fill < 0.28 || fill > 0.92) continue;
      blobs.push({ cx: sx / count, cy: sy / count, area: count, w: bw, h: bh });
    }
  }
  if (blobs.length < 4) return null;
  blobs.sort((a, b) => b.area - a.area);
  const maxA = blobs[0]!.area;
  const big = blobs.filter((b) => b.area > maxA * 0.35).slice(0, 12);
  const anchors = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  const used = new Set<number>();
  const out: Pt[] = [];
  for (const a of anchors) {
    let best = -1;
    let bestD = Infinity;
    big.forEach((b, i) => {
      if (used.has(i)) return;
      const d = (b.cx - a.x) ** 2 + (b.cy - a.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best < 0) return null;
    used.add(best);
    out.push({ x: big[best]!.cx, y: big[best]!.cy });
  }
  return out;
}

export function defaultCorners(w: number, h: number): Pt[] {
  const mx = w * 0.1;
  const my = h * 0.1;
  return [
    { x: mx, y: my },
    { x: w - mx, y: my },
    { x: w - mx, y: h - my },
    { x: mx, y: h - my },
  ];
}

/** Flatten the photo so fiducial centers land on the 7-inch board. */
export function rectify(source: HTMLCanvasElement, corners: readonly Pt[]): HTMLCanvasElement | null {
  const H = homography(FIDUCIALS, corners);
  if (!H) return null;
  const N = 700;
  const out = document.createElement("canvas");
  out.width = N;
  out.height = N;
  const sctx = source.getContext("2d", { willReadFrequently: true });
  const dctx = out.getContext("2d");
  if (!sctx || !dctx) return null;
  const src = sctx.getImageData(0, 0, source.width, source.height);
  const dst = dctx.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const p = applyH(H, { x: (x / N) * BOARD_IN, y: (y / N) * BOARD_IN });
      const sx = Math.round(p.x);
      const sy = Math.round(p.y);
      const di = (y * N + x) * 4;
      if (sx < 0 || sy < 0 || sx >= source.width || sy >= source.height) {
        dst.data[di] = 243;
        dst.data[di + 1] = 240;
        dst.data[di + 2] = 230;
        dst.data[di + 3] = 255;
        continue;
      }
      const si = (sy * source.width + sx) * 4;
      dst.data[di] = src.data[si]!;
      dst.data[di + 1] = src.data[si + 1]!;
      dst.data[di + 2] = src.data[si + 2]!;
      dst.data[di + 3] = 255;
    }
  }
  dctx.putImageData(dst, 0, 0);
  return out;
}

export function findHoles(flat: HTMLCanvasElement): Pt[] {
  const ctx = flat.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  const w = flat.width;
  const h = flat.height;
  const data = ctx.getImageData(0, 0, w, h).data;
  const pxPerIn = w / BOARD_IN;
  const seen = new Uint8Array(w * h);
  const holes: Pt[] = [];
  const stack: number[] = [];
  const dark = (i: number) => {
    const o = i * 4;
    return (data[o]! + data[o + 1]! + data[o + 2]!) / 3 < 78;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const xin = x / pxPerIn;
      const yin = y / pxPerIn;
      const start = y * w + x;
      if (xin < 0.9 || xin > 6.1 || yin < 0.9 || yin > 6.1) continue;
      if (seen[start] || !dark(start)) continue;
      let count = 0;
      let sx = 0;
      let sy = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      stack.push(start);
      seen[start] = 1;
      while (stack.length) {
        const i = stack.pop()!;
        count++;
        const px = i % w;
        const py = (i - px) / w;
        sx += px;
        sy += py;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        for (const [nx, ny] of [
          [px - 1, py],
          [px + 1, py],
          [px, py - 1],
          [px, py + 1],
        ] as const) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (seen[j] || !dark(j)) continue;
          const ix = nx / pxPerIn;
          const iy = ny / pxPerIn;
          if (ix < 0.85 || ix > 6.15 || iy < 0.85 || iy > 6.15) continue;
          seen[j] = 1;
          stack.push(j);
        }
      }
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const aspect = bw / Math.max(1, bh);
      if (count < 18 || count > 5000) continue;
      if (aspect < 0.45 || aspect > 2.2) continue;
      holes.push({ x: sx / count / pxPerIn, y: sy / count / pxPerIn });
    }
  }
  return holes.slice(0, 16);
}

export function groupCenter(holes: readonly Pt[], scale = 1): { rightIn: number; highIn: number } | null {
  if (holes.length === 0) return null;
  const x = holes.reduce((s, h) => s + h.x, 0) / holes.length;
  const y = holes.reduce((s, h) => s + h.y, 0) / holes.length;
  return { rightIn: (x - 3.5) * scale, highIn: (3.5 - y) * scale };
}

export function extremeSpread(holes: readonly Pt[], scale = 1): number {
  let best = 0;
  for (let i = 0; i < holes.length; i++) {
    for (let j = i + 1; j < holes.length; j++) {
      const d = Math.hypot(holes[i]!.x - holes[j]!.x, holes[i]!.y - holes[j]!.y) * scale;
      if (d > best) best = d;
    }
  }
  return best;
}
