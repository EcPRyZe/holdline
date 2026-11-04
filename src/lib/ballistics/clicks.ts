import { inchesToMil, inchesToMoa } from "./engine";

export type ClickUnit = "MOA" | "MIL";

export function angleInUnit(moa: number, mil: number, unit: ClickUnit): number {
  return unit === "MOA" ? moa : mil;
}

export type Dial = {
  /** Rounded clicks. Positive elevation = UP, positive wind = RIGHT. */
  elev: number;
  wind: number;
  elevExact: number;
  windExact: number;
  elevWord: string;
  windWord: string;
};

/** Trajectory correction: positive come-up means the shot is low, so dial UP. */
export function holdToClicks(comeUp: number, comeRight: number, click: number): Dial | null {
  if (!(click > 0)) return null;
  const elevExact = comeUp / click;
  const windExact = comeRight / click;
  const elev = Math.round(elevExact);
  const wind = Math.round(windExact);
  return {
    elev,
    wind,
    elevExact,
    windExact,
    elevWord: elev === 0 ? "NO ELEVATION" : elev > 0 ? `UP ${elev}` : `DOWN ${Math.abs(elev)}`,
    windWord: wind === 0 ? "NO WINDAGE" : wind > 0 ? `RIGHT ${wind}` : `LEFT ${Math.abs(wind)}`,
  };
}

export type ZeroDial = {
  rightIn: number;
  highIn: number;
  moaRight: number;
  moaHigh: number;
  milRight: number;
  milHigh: number;
  /** Positive = dial LEFT (impact is right). */
  leftClicks: number;
  /** Positive = dial DOWN (impact is high). */
  downClicks: number;
  leftExact: number;
  downExact: number;
  elevWord: string;
  windWord: string;
};

/** Group-to-zero: move the next impact onto the point of aim. */
export function zeroDial(
  rightIn: number,
  highIn: number,
  yards: number,
  click: number,
  unit: ClickUnit,
): ZeroDial {
  const moaRight = inchesToMoa(rightIn, yards);
  const moaHigh = inchesToMoa(highIn, yards);
  const milRight = inchesToMil(rightIn, yards);
  const milHigh = inchesToMil(highIn, yards);
  const angRight = unit === "MOA" ? moaRight : milRight;
  const angHigh = unit === "MOA" ? moaHigh : milHigh;
  const leftExact = click > 0 ? angRight / click : 0;
  const downExact = click > 0 ? angHigh / click : 0;
  const leftClicks = Math.round(leftExact);
  const downClicks = Math.round(downExact);
  return {
    rightIn,
    highIn,
    moaRight,
    moaHigh,
    milRight,
    milHigh,
    leftClicks,
    downClicks,
    leftExact,
    downExact,
    elevWord:
      downClicks === 0 ? "NO ELEVATION" : downClicks > 0 ? `DOWN ${downClicks}` : `UP ${Math.abs(downClicks)}`,
    windWord:
      leftClicks === 0 ? "NO WINDAGE" : leftClicks > 0 ? `LEFT ${leftClicks}` : `RIGHT ${Math.abs(leftClicks)}`,
  };
}
