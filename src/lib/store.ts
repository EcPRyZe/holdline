import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DragLaw } from "@/lib/ballistics/engine";
import type { ClickUnit } from "@/lib/ballistics/clicks";
import { LOADS, OPTICS, RIFLES } from "@/lib/data/catalog";
import type { Load, Optic, ReticleId, Rifle } from "@/lib/data/types";

export type TabId = "solve" | "dope" | "zero" | "library";
export type MvMode = "estimated" | "factory" | "custom";
export type UnitSystem = "yd" | "m";

export type Gun = {
  rifleId: string;
  barrelIn: number;
  twistIn: number;
  sightHeightIn: number;
  zeroYards: number;
};

export type Ammo = {
  loadId: string;
  weightGr: number;
  bc: number;
  drag: DragLaw;
  mvMode: MvMode;
  customMv: number;
};

export type Glass = {
  opticId: string;
  click: number;
  clickUnit: ClickUnit;
  mag: number;
};

type State = {
  hydrated: boolean;
  tab: TabId;
  gun: Gun;
  ammo: Ammo;
  glass: Glass;
  distanceYards: number;
  elevationFt: number;
  windMph: number;
  windClock: number;
  tempF: number;
  altitudeFt: number;
  pressureInHg: number | null;
  humidityPct: number;
  latitudeDeg: number;
  azimuthDeg: number;
  useCoriolis: boolean;
  useSpinDrift: boolean;
  targetWIn: number;
  targetHIn: number;
  maxYards: number;
  viewZoom: number;
  units: UnitSystem;
  customRifles: Rifle[];
  customLoads: Load[];
  customOptics: Optic[];
  setTab: (tab: TabId) => void;
  patch: (partial: Partial<State>) => void;
  selectRifle: (id: string) => void;
  selectLoad: (id: string) => void;
  selectOptic: (id: string) => void;
  addRifle: (rifle: Rifle) => void;
  addLoad: (load: Load) => void;
  addOptic: (optic: Optic) => void;
  removeCustom: (kind: "rifle" | "load" | "optic", id: string) => void;
};

function gunFrom(r: Rifle): Gun {
  return {
    rifleId: r.id,
    barrelIn: r.barrelIn,
    twistIn: r.twistIn,
    sightHeightIn: r.sightHeightIn,
    zeroYards: r.zeroYards,
  };
}

function ammoFrom(l: Load): Ammo {
  return {
    loadId: l.id,
    weightGr: l.weightGr,
    bc: l.bc,
    drag: l.drag,
    mvMode: "estimated",
    customMv: l.mvFps,
  };
}

function glassFrom(o: Optic): Glass {
  return { opticId: o.id, click: o.click, clickUnit: o.clickUnit, mag: o.magMax };
}

const dd = RIFLES.find((r) => r.id === "dd-v7")!;
const smk = LOADS.find((l) => l.id === "smk77")!;
const exps = OPTICS.find((o) => o.id === "exps3-0")!;

export const useHold = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      tab: "solve",
      gun: gunFrom(dd),
      ammo: ammoFrom(smk),
      glass: glassFrom(exps),
      distanceYards: 300,
      elevationFt: 0,
      windMph: 10,
      windClock: 3,
      tempF: 59,
      altitudeFt: 800,
      pressureInHg: null,
      humidityPct: 40,
      latitudeDeg: 35,
      azimuthDeg: 90,
      useCoriolis: false,
      useSpinDrift: true,
      targetWIn: 18,
      targetHIn: 30,
      maxYards: 1000,
      viewZoom: 1,
      units: "yd",
      customRifles: [],
      customLoads: [],
      customOptics: [],
      setTab: (tab) => set({ tab }),
      patch: (partial) => set(partial),
      selectRifle: (id) => {
        const r = [...get().customRifles, ...RIFLES].find((x) => x.id === id);
        if (r) set({ gun: gunFrom(r) });
      },
      selectLoad: (id) => {
        const l = [...get().customLoads, ...LOADS].find((x) => x.id === id);
        if (l) set({ ammo: ammoFrom(l) });
      },
      selectOptic: (id) => {
        const o = [...get().customOptics, ...OPTICS].find((x) => x.id === id);
        if (o) set({ glass: glassFrom(o) });
      },
      addRifle: (rifle) => set({ customRifles: [rifle, ...get().customRifles], gun: gunFrom(rifle) }),
      addLoad: (load) => set({ customLoads: [load, ...get().customLoads], ammo: ammoFrom(load) }),
      addOptic: (optic) => set({ customOptics: [optic, ...get().customOptics], glass: glassFrom(optic) }),
      removeCustom: (kind, id) => {
        if (kind === "rifle") {
          const customRifles = get().customRifles.filter((r) => r.id !== id);
          const gun = get().gun.rifleId === id ? gunFrom(dd) : get().gun;
          set({ customRifles, gun });
        } else if (kind === "load") {
          const customLoads = get().customLoads.filter((l) => l.id !== id);
          const ammo = get().ammo.loadId === id ? ammoFrom(smk) : get().ammo;
          set({ customLoads, ammo });
        } else {
          const customOptics = get().customOptics.filter((o) => o.id !== id);
          const glass = get().glass.opticId === id ? glassFrom(exps) : get().glass;
          set({ customOptics, glass });
        }
      },
    }),
    {
      name: "holdline-v1",
      skipHydration: true,
      partialize: (s) => ({
        tab: s.tab,
        gun: s.gun,
        ammo: s.ammo,
        glass: s.glass,
        distanceYards: s.distanceYards,
        elevationFt: s.elevationFt,
        windMph: s.windMph,
        windClock: s.windClock,
        tempF: s.tempF,
        altitudeFt: s.altitudeFt,
        pressureInHg: s.pressureInHg,
        humidityPct: s.humidityPct,
        latitudeDeg: s.latitudeDeg,
        azimuthDeg: s.azimuthDeg,
        useCoriolis: s.useCoriolis,
        useSpinDrift: s.useSpinDrift,
        targetWIn: s.targetWIn,
        targetHIn: s.targetHIn,
        maxYards: s.maxYards,
        viewZoom: s.viewZoom,
        units: s.units,
        customRifles: s.customRifles,
        customLoads: s.customLoads,
        customOptics: s.customOptics,
      }),
    },
  ),
);

export function allRifles(custom: Rifle[]): Rifle[] {
  return [...custom, ...RIFLES];
}
export function allLoads(custom: Load[]): Load[] {
  return [...custom, ...LOADS];
}
export function allOptics(custom: Optic[]): Optic[] {
  return [...custom, ...OPTICS];
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export const RETICLE_CHOICES: { id: ReticleId; label: string }[] = [
  { id: "eotech-0", label: "EOTech ring + dot" },
  { id: "eotech-1", label: "EOTech single dot" },
  { id: "eotech-2", label: "EOTech two-dot" },
  { id: "eotech-4", label: "EOTech four-dot" },
  { id: "ring-65", label: "65 MOA ring + 2 MOA dot" },
  { id: "dot-2", label: "2 MOA dot" },
  { id: "dot-1", label: "1 MOA dot" },
  { id: "acog-556", label: "ACOG-style BDC" },
  { id: "nova-mil", label: "ACSS Nova mil" },
  { id: "nova-bdc", label: "ACSS Nova BDC" },
  { id: "mil-tree", label: "Mil tree" },
  { id: "mil-hash", label: "Mil hash" },
  { id: "duplex", label: "Duplex" },
  { id: "bdc-556", label: "5.56 BDC dots" },
];
