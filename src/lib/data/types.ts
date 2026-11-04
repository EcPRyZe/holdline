import type { DragLaw } from "@/lib/ballistics/engine";
import type { ClickUnit } from "@/lib/ballistics/clicks";

export type ReticleId =
  | "eotech-0"
  | "eotech-1"
  | "eotech-2"
  | "eotech-4"
  | "ring-65"
  | "dot-1"
  | "dot-2"
  | "acog-556"
  | "nova-mil"
  | "nova-bdc"
  | "mil-hash"
  | "mil-tree"
  | "duplex"
  | "bdc-556";

export type Caliber = {
  id: string;
  name: string;
  diameterIn: number;
};

export type Rifle = {
  id: string;
  name: string;
  maker: string;
  caliberId: string;
  barrelIn: number;
  /** Inches per turn. Positive is right-hand. */
  twistIn: number;
  sightHeightIn: number;
  zeroYards: number;
  note: string;
  custom?: boolean;
};

export type Load = {
  id: string;
  name: string;
  maker: string;
  caliberId: string;
  weightGr: number;
  bc: number;
  drag: DragLaw;
  /** Published or typical muzzle velocity. */
  mvFps: number;
  testBarrelIn: number;
  /** Rough velocity change when the barrel isn't the test length. */
  fpsPerInch: number;
  lengthIn: number | null;
  source: string;
  custom?: boolean;
};

export type Optic = {
  id: string;
  name: string;
  maker: string;
  kind: "holo" | "dot" | "prism" | "scope" | "irons";
  /** Angular click. 0 means no turret (irons). */
  click: number;
  clickUnit: ClickUnit;
  reticle: ReticleId;
  magMin: number;
  magMax: number;
  /** Magnification where an SFP reticle subtends correctly. Null = FFP or a true 1×. */
  sfpCalMag: number | null;
  note: string;
  custom?: boolean;
};

export type BdcMark = { label: string; moaDown: number };

export type BdcSpec = { caption: string; marks: BdcMark[] };
