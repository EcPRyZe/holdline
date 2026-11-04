export type Pt = { x: number; y: number };

/** Map `from` → `to` with a plane homography. Returns 8 coefficients, h8 fixed at 1. */
export function homography(from: readonly Pt[], to: readonly Pt[]): number[] | null {
  if (from.length !== 4 || to.length !== 4) return null;
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const x = from[i]!.x;
    const y = from[i]!.y;
    const X = to[i]!.x;
    const Y = to[i]!.y;
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]);
    b.push(Y);
  }
  return solve8(A, b);
}

export function applyH(h: number[], p: Pt): Pt {
  const d = h[6]! * p.x + h[7]! * p.y + 1;
  if (Math.abs(d) < 1e-9) return { x: 0, y: 0 };
  return {
    x: (h[0]! * p.x + h[1]! * p.y + h[2]!) / d,
    y: (h[3]! * p.x + h[4]! * p.y + h[5]!) / d,
  };
}

function solve8(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    }
    if (Math.abs(M[piv]![c]!) < 1e-10) return null;
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const div = M[c]![c]!;
    for (let k = c; k <= n; k++) M[c]![k]! /= div;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]!;
      if (f === 0) continue;
      for (let k = c; k <= n; k++) M[r]![k]! -= f * M[c]![k]!;
    }
  }
  return M.map((row) => row[n]!);
}
