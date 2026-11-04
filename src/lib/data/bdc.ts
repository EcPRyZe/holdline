import type { BdcSpec, ReticleId } from "./types";

/**
 * Factory reticle notes. Mark positions live in the sight picture so a
 * user's load cannot move a commercial BDC. Sources are the maker's manual.
 */
const SPECS: Partial<Record<ReticleId, BdcSpec>> = {
  "eotech-0": {
    caption:
      "EXPS3-0 · 68 MOA ring, quadrant ticks, 1 MOA dot (EOTech EXPS3 manual). For .223 62 gr at 2,900 fps the center dot is the 50- and 200-yard zero and the bottom of the ring is the 7-yard hold.",
    marks: [],
  },
  "eotech-1": {
    caption: "EXPS3-1 · single 1 MOA dot. No ring.",
    marks: [],
  },
  "eotech-2": {
    caption:
      "EXPS3-2 · same 68 MOA ring. EOTech's chart puts the lower 1 MOA dot at 500 yards when the center is zeroed at 50/200 for .223 62 gr, 2,900 fps. That is 9.8 MOA down. Bottom of the ring is still 7 yards.",
    marks: [],
  },
  "eotech-4": {
    caption:
      "EXPS3-4 · the manual specifies a 60 MOA ring, not 68, plus four 1 MOA dots, for 62 gr M855 near 2,680 fps from a 14.5″ barrel. EOTech does not print the dot spacing. The lower dots are that load's 300 / 500 / 700 yard come-ups on a 100-yard zero, which keeps the last dot inside the ring.",
    marks: [],
  },
  "acog-556": {
    caption:
      "TA31 RCO chevron · tip is the 100 m zero. Base is 5.53 MOA wide (Trijicon: 19 inches at 300 m). Stadia are 19 inches wide at 400–800 m. Heights are 62 gr M855 at 2,900 fps from a 100 m zero — Trijicon does not publish those angles. Horizontal ticks start 10 mils off the post, then every 5.",
    marks: [],
  },
  "nova-mil": {
    caption:
      "ACSS Nova · SFP, true at 6×. Four mil stadia, half-mil ticks 1 MOA wide, taper at 5 mil (Primary Arms manual). Stadia widths are 18 inches at 300 / 400 / 500 / 600 yards. Horizontal bars are the 3 mph and 6 mph leads; the taper point is 9 mph.",
    marks: [],
  },
  "nova-bdc": {
    caption:
      "ACSS Nova 5.56/.308 · same mil stadia as the MIL Nova, labeled 300–600. Primary Arms: with a 5.56 100-yard zero or a .308 50-yard zero the stadia can be used as the BDC. True at 6×.",
    marks: [],
  },
  "bdc-556": {
    caption:
      "Vortex AR-BDC3 · 1 MOA dot, 16.625 MOA broken circle, arc 1.275 MOA thick. Hashes are 2.4 / 5.6 / 9.5 / 14.6 MOA (300–600 yards for .223 55–77 gr, about 2,700–3,000 fps, 50/200 zero). Wind dots are 5/10/15 mph holds placed from the manual figure — Vortex does not print that spacing. The ladder above the circle is an 18-inch shoulder: widest is 300 yards, narrowest is 600. True at 6×.",
    marks: [],
  },
};

export function bdcSpec(id: ReticleId): BdcSpec | null {
  return SPECS[id] ?? null;
}
