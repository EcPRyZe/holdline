import type { ReactNode } from "react";
import { bdcSpec } from "@/lib/data/bdc";

import type { ReticleId } from "@/lib/data/types";

const MIL = 3.43774677;

type Props = {
  reticle: ReticleId;
  /** >1 when an SFP reticle is below its calibrated magnification. */
  sfp: number;
  comeUpMoa: number;
  comeRightMoa: number;
  targetWMoa: number;
  targetHMoa: number;
  zoom: number;
  frame: "hold" | "reticle";
};

export function SightPicture(props: Props) {
  const spec = bdcSpec(props.reticle);
  const ring = patternRadius(props.reticle) * props.sfp;
  const holdFrame = Math.max(
    7,
    Math.abs(props.comeUpMoa) + props.targetHMoa / 2 + 2.4,
    Math.abs(props.comeRightMoa) + props.targetWMoa / 2 + 2.4,
  );
  const full = ring > 0 ? Math.max(holdFrame, ring * 1.18) : holdFrame;
  const half = (props.frame === "reticle" ? full : holdFrame) / Math.max(0.45, props.zoom);
  const label = half * 0.055;
  const s = props.sfp;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-full border border-brass-dim bg-glass">
      <svg viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`} className="h-full w-full text-illum">
        <Target {...props} />
        <g fill="none" stroke="currentColor" strokeLinecap="round">
          <Reticle reticle={props.reticle} sfp={s} half={half} label={label} />
          {spec?.marks.map((m) =>
            m.moaDown > 0.35 && m.moaDown < half ? (
              <g key={m.label}>
                {props.reticle === "acog-556" ? (
                  <line
                    x1={-2.2 * s}
                    x2={2.2 * s}
                    y1={m.moaDown}
                    y2={m.moaDown}
                    strokeWidth={0.45 * s}
                  />
                ) : props.reticle === "eotech-2" || props.reticle === "eotech-4" ? (
                  <circle cx={0} cy={m.moaDown} r={0.5} fill="currentColor" stroke="none" />
                ) : (
                  <circle cx={0} cy={m.moaDown} r={0.28 * s} fill="currentColor" stroke="none" />
                )}
                <text
                  x={props.reticle === "acog-556" ? 3.2 * s : 1.6 * s}
                  y={m.moaDown + label * 0.3}
                  fill="currentColor"
                  stroke="none"
                  fontSize={label}
                  className="font-sans"
                >
                  {m.label}
                </text>
              </g>
            ) : null,
          )}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_48px_rgba(0,0,0,0.55)]" />
    </div>
  );
}

function Target({ comeUpMoa, comeRightMoa, targetWMoa, targetHMoa }: Props) {
  const round = Math.abs(targetWMoa - targetHMoa) < 0.2;
  return (
    <g transform={`translate(${-comeRightMoa} ${comeUpMoa})`}>
      {round ? (
        <ellipse
          rx={targetWMoa / 2}
          ry={targetHMoa / 2}
          fill="var(--color-brass)"
          fillOpacity={0.28}
          stroke="var(--color-brass)"
          strokeWidth={0.12}
        />
      ) : (
        <rect
          x={-targetWMoa / 2}
          y={-targetHMoa / 2}
          width={targetWMoa}
          height={targetHMoa}
          rx={0.25}
          fill="var(--color-brass)"
          fillOpacity={0.28}
          stroke="var(--color-brass)"
          strokeWidth={0.12}
        />
      )}
      <circle r={0.28} fill="var(--color-brass)" />
    </g>
  );
}

function patternRadius(id: ReticleId): number {
  if (id === "eotech-0" || id === "eotech-2") return 42;
  if (id === "eotech-4") return 38;
  if (id === "ring-65") return 36;
  if (id === "nova-mil" || id === "nova-bdc") return 28;
  if (id === "acog-556") return 74;
  if (id === "bdc-556") return 40;
  return 0;
}

function Reticle({ reticle, sfp, half, label }: { reticle: ReticleId; sfp: number; half: number; label: number }) {
  if (reticle === "eotech-0" || reticle === "eotech-2" || reticle === "eotech-4") {
    const dots = reticle === "eotech-0" ? [0] : reticle === "eotech-2" ? [0, 9.8] : [0, 4.74, 13.57, 26.95];
    return <Eotech radius={reticle === "eotech-4" ? 30 : 34} dots={dots} />;
  }
  if (reticle === "eotech-1" || reticle === "dot-1") {
    return <circle r={0.5} fill="currentColor" stroke="none" />;
  }
  if (reticle === "dot-2") return <circle r={1} fill="currentColor" stroke="none" />;
  if (reticle === "ring-65") {
    return (
      <g>
        <circle r={32.5} strokeWidth={0.9} />
        <circle r={1} fill="currentColor" stroke="none" />
      </g>
    );
  }
  if (reticle === "nova-mil" || reticle === "nova-bdc") {
    return <Nova sfp={sfp} half={half} label={label} yards={reticle === "nova-bdc"} />;
  }
  if (reticle === "mil-hash") return <MilHash mils={8} sfp={sfp} half={half} />;
  if (reticle === "mil-tree") return <MilTree sfp={sfp} half={half} />;
  if (reticle === "acog-556") return <Acog sfp={sfp} label={label} />;
  if (reticle === "bdc-556") return <ArBdc3 sfp={sfp} half={half} label={label} />;
  return <Duplex sfp={sfp} half={half} />;
}

/** EXPS3-0 / -2 use a 68 MOA ring. EXPS3-4 uses 60. Quadrant ticks are drawn; EOTech does not publish their length. */
function Eotech({ radius, dots }: { radius: number; dots: number[] }) {
  const tick = [0, 90, 180, 270].map((deg) => {
    const t = (deg * Math.PI) / 180;
    const inner = radius - 2.2;
    const outer = radius + 7.5;
    return (
      <line
        key={deg}
        x1={inner * Math.sin(t)}
        y1={-inner * Math.cos(t)}
        x2={outer * Math.sin(t)}
        y2={-outer * Math.cos(t)}
        strokeWidth={1.65}
      />
    );
  });
  return (
    <g>
      <circle r={radius} strokeWidth={1.55} />
      {tick}
      {dots.map((y) => (
        <circle key={y} cy={y} r={0.5} fill="currentColor" stroke="none" />
      ))}
    </g>
  );
}

/**
 * ACSS Nova. SFP subtensions are in mils at the calibrated magnification.
 * Stadia widths are 18 inches at 300/400/500/600. Lead positions are measured
 * from the Primary Arms figure — the manual gives mph, not mils.
 */
function Nova({ sfp, half, label, yards }: { sfp: number; half: number; label: number; yards: boolean }) {
  const u = MIL * sfp;
  const thin = 0.09 * u;
  const heavy = 0.38 * u;
  const edge = Math.max(half * 0.96, 7.2 * u);
  const widths = [1.6667, 1.25, 1, 0.8333];
  const yard = ["300", "400", "500", "600"];
  const hashes: ReactNode[] = [];
  for (let i = 1; i <= 4; i++) {
    const y = i * u;
    const w = (widths[i - 1]! * u) / 2;
    hashes.push(<line key={`m${i}`} x1={-w} x2={w} y1={y} y2={y} strokeWidth={0.11 * u} />);
    if (yards) {
      hashes.push(
        <text key={`t${i}`} x={w + 0.35 * u} y={y + label * 0.32} fill="currentColor" stroke="none" fontSize={label} className="font-sans">
          {yard[i - 1]}
        </text>,
      );
    }
  }
  for (let i = 0.5; i <= 4.51; i += 1) {
    const y = i * u;
    const w = 0.5 * sfp;
    hashes.push(<line key={`h${i}`} x1={-w} x2={w} y1={y} y2={y} strokeWidth={0.08 * u} />);
  }
  const walk = 1.7 * u;
  const jog = 3.4 * u;
  const sprint = 5.1 * u;
  const post = (x: number) => {
    const dir = Math.sign(x) || 1;
    const tip = dir * sprint;
    const shoulder = dir * (sprint + 0.85 * u);
    return `M ${tip} 0 L ${shoulder} ${-heavy / 2} L ${dir * edge} ${-heavy / 2} L ${dir * edge} ${heavy / 2} L ${shoulder} ${heavy / 2} Z`;
  };
  return (
    <g>
      <line x1={-sprint} x2={sprint} y1={0} y2={0} strokeWidth={thin} />
      <path d={post(1)} fill="currentColor" stroke="none" />
      <path d={post(-1)} fill="currentColor" stroke="none" />
      {[1, -1].map((dir) => (
        <g key={dir}>
          <line x1={dir * walk} x2={dir * walk} y1={-0.18 * u} y2={0.22 * u} strokeWidth={0.14 * u} />
          <line x1={dir * jog} x2={dir * jog} y1={-0.28 * u} y2={0.32 * u} strokeWidth={0.16 * u} />
        </g>
      ))}
      <line x1={0} x2={0} y1={-edge} y2={-0.55 * u} strokeWidth={heavy} />
      <line x1={0} x2={0} y1={0.35 * u} y2={5 * u} strokeWidth={thin} />
      <path
        d={`M 0 ${5 * u} L ${-heavy / 2} ${5.7 * u} L ${-heavy / 2} ${edge} L ${heavy / 2} ${edge} L ${heavy / 2} ${5.7 * u} Z`}
        fill="currentColor"
        stroke="none"
      />
      {hashes}
      <circle r={0.5 * sfp} fill="currentColor" stroke="none" />
    </g>
  );
}

/** TA31 RCO. Chevron base is 19 in at 300 m. Stadia heights are a computed M855 path, not a Trijicon angle. */
function Acog({ sfp, label }: { sfp: number; label: number }) {
  const s = sfp;
  const baseY = 4.58 * s;
  const halfW = (5.53 * s) / 2;
  const stadia: { y: number; w: number; t: string }[] = [
    { y: 8.42, w: 4.147, t: "4" },
    { y: 13.25, w: 3.318, t: "5" },
    { y: 19.3, w: 2.765, t: "6" },
    { y: 26.85, w: 2.37, t: "7" },
    { y: 36.13, w: 2.073, t: "8" },
  ];
  const mils = [10, 15, 20];
  return (
    <g>
      <polygon points={`${-halfW},${baseY} 0,0 ${halfW},${baseY}`} fill="currentColor" stroke="none" />
      <line x1={0} x2={0} y1={baseY} y2={38 * s} strokeWidth={0.28 * s} />
      {stadia.map((m) => (
        <g key={m.t}>
          <line x1={(-m.w * s) / 2} x2={(m.w * s) / 2} y1={m.y * s} y2={m.y * s} strokeWidth={0.34 * s} />
          <text x={(m.w * s) / 2 + 0.8 * s} y={m.y * s + label * 0.32} fill="currentColor" stroke="none" fontSize={label} className="font-sans">
            {m.t}
          </text>
        </g>
      ))}
      <line x1={-72 * s} x2={72 * s} y1={baseY} y2={baseY} strokeWidth={0.12 * s} />
      {mils.map((m) => {
        const x = m * MIL * s;
        return (
          <g key={m}>
            <line x1={-x} x2={-x} y1={baseY - 1.1 * s} y2={baseY + 1.1 * s} strokeWidth={0.45 * s} />
            <line x1={x} x2={x} y1={baseY - 1.1 * s} y2={baseY + 1.1 * s} strokeWidth={0.45 * s} />
          </g>
        );
      })}
    </g>
  );
}

/** Vortex AR-BDC3. Hash drops and the 16.625 MOA circle are published. Wind-dot spacing is taken from the manual figure. */
function ArBdc3({ sfp, half, label }: { sfp: number; half: number; label: number }) {
  const s = sfp;
  const outer = 8.3125 * s;
  const stroke = 1.275 * s;
  const r = outer - stroke / 2;
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => {
      const t = (a * Math.PI) / 180;
      return [r * Math.sin(t), -r * Math.cos(t)] as const;
    };
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const rows: { y: number; w: number; dots: number[]; tag: string }[] = [
    { y: 2.4, w: 2.8, dots: [3.1, 4.7], tag: "300" },
    { y: 5.6, w: 2.1, dots: [2.2, 4.5, 6.6], tag: "400" },
    { y: 9.5, w: 1.7, dots: [3.0, 5.9, 8.9], tag: "500" },
    { y: 14.6, w: 1.4, dots: [3.8, 7.5, 11.5], tag: "600" },
  ];
  const range = [
    { y: -18.4, w: 5.73 },
    { y: -16.2, w: 4.3 },
    { y: -14.0, w: 3.44 },
    { y: -11.8, w: 2.87 },
  ];
  const edge = Math.max(half * 0.92, 16 * s);
  return (
    <g>
      <path d={arc(-42, 42)} strokeWidth={stroke} />
      <path d={arc(70, 110)} strokeWidth={stroke} />
      <path d={arc(-110, -70)} strokeWidth={stroke} />
      <circle r={0.5 * s} fill="currentColor" stroke="none" />
      <line x1={-2.2 * s} x2={2.2 * s} y1={-10.2 * s} y2={-10.2 * s} strokeWidth={0.22 * s} />
      <line x1={0} x2={0} y1={range[0]!.y * s} y2={range[3]!.y * s} strokeWidth={0.16 * s} />
      {range.map((bar) => (
        <line key={bar.y} x1={(-bar.w * s) / 2} x2={(bar.w * s) / 2} y1={bar.y * s} y2={bar.y * s} strokeWidth={0.28 * s} />
      ))}
      <line x1={0} x2={0} y1={1.2 * s} y2={17.1 * s} strokeWidth={0.25 * s} />
      {rows.map((row) => (
        <g key={row.tag}>
          <line x1={(-row.w * s) / 2} x2={(row.w * s) / 2} y1={row.y * s} y2={row.y * s} strokeWidth={0.22 * s} />
          {row.dots.map((d) => (
            <g key={d}>
              <circle cx={-d * s} cy={row.y * s} r={0.22 * s} fill="currentColor" stroke="none" />
              <circle cx={d * s} cy={row.y * s} r={0.22 * s} fill="currentColor" stroke="none" />
            </g>
          ))}
          <text x={12 * s} y={row.y * s + label * 0.3} fill="currentColor" stroke="none" fontSize={label * 0.8} className="font-sans">
            {row.tag}
          </text>
        </g>
      ))}
      <polygon points={`${-edge},${0.7 * s} ${-13 * s},0 ${-edge},${-0.7 * s}`} fill="currentColor" stroke="none" />
      <polygon points={`${edge},${0.7 * s} ${13 * s},0 ${edge},${-0.7 * s}`} fill="currentColor" stroke="none" />
      <polygon points={`${-1.15 * s},${36 * s} 0,${32.5 * s} ${1.15 * s},${36 * s}`} fill="currentColor" stroke="none" />
    </g>
  );
}

function Duplex({ sfp, half }: { sfp: number; half: number }) {
  const gap = 8 * sfp;
  const thick = 1.5 * sfp;
  const edge = half * 0.96;
  return (
    <g>
      <line x1={-gap} x2={gap} y1={0} y2={0} strokeWidth={0.16 * sfp} />
      <line x1={0} x2={0} y1={-gap} y2={gap} strokeWidth={0.16 * sfp} />
      <line x1={-edge} x2={-gap} y1={0} y2={0} strokeWidth={thick} />
      <line x1={gap} x2={edge} y1={0} y2={0} strokeWidth={thick} />
      <line x1={0} x2={0} y1={-edge} y2={-gap} strokeWidth={thick} />
      <line x1={0} x2={0} y1={gap} y2={edge} strokeWidth={thick} />
    </g>
  );
}

function MilHash({ mils, sfp, half, taper = false }: { mils: number; sfp: number; half: number; taper?: boolean }) {
  const u = MIL * sfp;
  const lines: ReactNode[] = [];
  for (let i = 0.5; i <= mils + 0.01; i += 0.5) {
    const y = i * u;
    if (y > half * 0.92) break;
    const major = Math.abs(i - Math.round(i)) < 0.01;
    const w = (major ? 0.55 : 0.28) * u;
    lines.push(<line key={`v${i}`} x1={-w} x2={w} y1={y} y2={y} strokeWidth={0.12 * sfp} />);
    if (i <= 4) {
      lines.push(<line key={`h${i}`} x1={-y} x2={-y + 0} y1={-w * 0.7} y2={w * 0.7} strokeWidth={0.12 * sfp} />);
      lines.push(<line key={`hr${i}`} x1={y} x2={y} y1={-w * 0.7} y2={w * 0.7} strokeWidth={0.12 * sfp} />);
    }
  }
  return (
    <g>
      <line x1={-half} x2={half} y1={0} y2={0} strokeWidth={0.1 * sfp} />
      <line x1={0} x2={0} y1={-half * 0.25} y2={taper ? mils * u : half * 0.92} strokeWidth={0.1 * sfp} />
      {lines}
      <circle r={0.18 * sfp} fill="currentColor" stroke="none" />
    </g>
  );
}

function MilTree({ sfp, half }: { sfp: number; half: number }) {
  const u = MIL * sfp;
  const dots: ReactNode[] = [];
  for (const row of [2, 4, 6, 8]) {
    const y = row * u;
    if (y > half * 0.9) continue;
    for (const col of [-1.5, -1, -0.5, 0.5, 1, 1.5]) {
      dots.push(<circle key={`${row}-${col}`} cx={col * u} cy={y} r={0.1 * u} fill="currentColor" stroke="none" />);
    }
  }
  return (
    <g>
      <MilHash mils={10} sfp={sfp} half={half} />
      {dots}
    </g>
  );
}
