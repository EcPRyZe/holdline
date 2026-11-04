import { holdToClicks } from "@/lib/ballistics/clicks";
import { sampleAt } from "@/lib/ballistics/engine";
import { useHold } from "@/lib/store";
import { useWork } from "@/lib/use-solution";
import { Button } from "@/components/ui";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";

export function DopeView() {
  const s = useHold();
  const work = useWork();
  const sol = work.solution;
  const [copied, setCopied] = useState(false);
  if (!sol || !work.load) {
    return <p className="text-sm text-muted">Pick a rifle and a load in the library.</p>;
  }
  const rows = sol.samples.filter((r) => r.yards % 50 === 0 || Math.abs(r.yards - s.distanceYards) < 0.6);
  const target = sampleAt(sol.samples, s.distanceYards);
  const chart = sol.samples.filter((r) => r.yards % 50 === 0).map((r) => ({
    yards: Math.round(s.units === "m" ? r.yards * 0.9144 : r.yards),
    drop: Number(r.pathIn.toFixed(1)),
    wind: Number(r.windageIn.toFixed(1)),
  }));
  const unit = s.glass.clickUnit;

  const copy = async () => {
    const lines = [
      `HOLD LINE`,
      `${work.rifle?.name ?? "Rifle"} · ${work.load?.name ?? ""} · ${work.optic?.name ?? ""}`,
      `MV ${work.mv} fps · ${work.shot?.drag} ${work.shot?.bc} · zero ${s.gun.zeroYards} yd`,
      `${s.tempF}°F · ${s.altitudeFt} ft · wind ${s.windMph} mph from ${s.windClock}:00`,
      `Range  Drop in  ${unit} up  Wind in  ${unit} R  fps`,
      ...rows.map((r) => {
        const up = unit === "MOA" ? r.comeUpMoa : r.comeUpMil;
        const rt = unit === "MOA" ? r.comeRightMoa : r.comeRightMil;
        const range = s.units === "m" ? (r.yards * 0.9144).toFixed(0) : r.yards.toFixed(0);
        return `${range.padStart(5)}  ${r.pathIn.toFixed(1).padStart(7)}  ${up.toFixed(2).padStart(6)}  ${r.windageIn.toFixed(1).padStart(7)}  ${rt.toFixed(2).padStart(6)}  ${r.velocityFps.toFixed(0)}`;
      }),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rise flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-wide">DOPE card</h2>
          <p className="text-sm text-muted">{work.mvNote}</p>
        </div>
        <Button onClick={() => void copy()}>{copied ? "Copied" : "Copy"}</Button>
      </div>
      <div className="h-56 w-full min-w-0 rounded-md border border-line bg-surface p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart}>
            <CartesianGrid stroke="var(--color-line)" />
            <XAxis dataKey="yards" stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
            <YAxis stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: "var(--color-surface-2)", border: "1px solid var(--color-line)", color: "var(--color-fg)" }}
            />
            <Line type="monotone" dataKey="drop" name="Path (in)" stroke="var(--color-brass)" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="wind" name="Windage (in)" stroke="var(--color-fg)" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="max-w-full overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[720px] text-left text-sm tabular-nums">
          <thead className="bg-surface text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">{s.units === "m" ? "m" : "yd"}</th>
              <th className="px-3 py-2 font-medium">Path in</th>
              <th className="px-3 py-2 font-medium">{unit} up</th>
              <th className="px-3 py-2 font-medium">Wind in</th>
              <th className="px-3 py-2 font-medium">{unit} right</th>
              <th className="px-3 py-2 font-medium">Clicks</th>
              <th className="px-3 py-2 font-medium">fps</th>
              <th className="px-3 py-2 font-medium">ft-lb</th>
              <th className="px-3 py-2 font-medium">s</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const up = unit === "MOA" ? r.comeUpMoa : r.comeUpMil;
              const rt = unit === "MOA" ? r.comeRightMoa : r.comeRightMil;
              const dial = holdToClicks(up, rt, s.glass.click);
              const hot = target ? Math.abs(r.yards - target.yards) < 0.6 : false;
              return (
                <tr key={r.yards} className={hot ? "bg-surface-2 text-brass" : "border-t border-line"}>
                  <td className="px-3 py-2">{s.units === "m" ? (r.yards * 0.9144).toFixed(0) : r.yards.toFixed(0)}</td>
                  <td className="px-3 py-2">{r.pathIn.toFixed(1)}</td>
                  <td className="px-3 py-2">{up.toFixed(2)}</td>
                  <td className="px-3 py-2">{r.windageIn.toFixed(1)}</td>
                  <td className="px-3 py-2">{rt.toFixed(2)}</td>
                  <td className="px-3 py-2">{dial ? `${dial.elevWord} / ${dial.windWord}` : "—"}</td>
                  <td className="px-3 py-2">
                    {r.velocityFps.toFixed(0)}
                    {r.mach < 1.2 ? " T" : ""}
                  </td>
                  <td className="px-3 py-2">{r.energyFtlb.toFixed(0)}</td>
                  <td className="px-3 py-2">{r.tofSec.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">T marks transonic. Path is inches above the line of sight, so a negative path is a come-up. Windage inches are where the bullet is, positive right — the click column is the correction.</p>
    </div>
  );
}
