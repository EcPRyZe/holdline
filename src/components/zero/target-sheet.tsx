import { INK, targetShapes } from "@/lib/zero/target-spec";

export function TargetSheet() {
  const shapes = targetShapes();
  return (
    <div className="print-sheet bg-paper text-ink">
      <div className="mb-2 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-3xl leading-none tracking-wide">HOLD LINE</p>
          <p className="text-sm">Zero target · print at 100% · do not fit-to-page</p>
        </div>
        <p className="text-right text-xs">
          Aim at the open circle.
          <br />
          The corner marks are the scanner’s anchors.
        </p>
      </div>
      <svg viewBox="0 0 7 7" className="sheet-square block" role="img" aria-label="Seven inch zeroing target">
        {shapes.map((s, i) => {
          if (s.t === "rect") return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.fill} />;
          if (s.t === "circle") {
            return <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="none" stroke={s.stroke} strokeWidth={s.sw} />;
          }
          return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.stroke} strokeWidth={s.sw} />;
        })}
      </svg>
      <svg viewBox="0 0 7 0.7" className="sheet-bar mt-3 block" aria-hidden="true">
        <line x1="0.05" y1="0.2" x2="5.05" y2="0.2" stroke={INK} strokeWidth="0.06" />
        <line x1="0.05" y1="0.05" x2="0.05" y2="0.35" stroke={INK} strokeWidth="0.03" />
        <line x1="5.05" y1="0.05" x2="5.05" y2="0.35" stroke={INK} strokeWidth="0.03" />
        <text x="0.05" y="0.62" fill={INK} fontSize="0.16" fontFamily="sans-serif">
          5.000 INCHES — MEASURE THIS BAR AFTER PRINTING
        </text>
      </svg>
    </div>
  );
}
