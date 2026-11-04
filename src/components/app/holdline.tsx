import { BookOpen, Crosshair, Table, Target } from "lucide-react";
import { useEffect } from "react";
import { DopeView } from "@/components/dope/dope-view";
import { LibraryView } from "@/components/library/library-view";
import { SolveView } from "@/components/solve/solve-view";
import { ZeroView } from "@/components/zero/zero-view";
import { useHold, type TabId } from "@/lib/store";

const TABS: { id: TabId; label: string; icon: typeof Crosshair }[] = [
  { id: "solve", label: "Solve", icon: Crosshair },
  { id: "dope", label: "DOPE", icon: Table },
  { id: "zero", label: "Zero", icon: Target },
  { id: "library", label: "Library", icon: BookOpen },
];

export function Holdline() {
  const tab = useHold((s) => s.tab);
  const units = useHold((s) => s.units);
  const setTab = useHold((s) => s.setTab);
  const patch = useHold((s) => s.patch);

  useEffect(() => {
    const pending = useHold.persist.rehydrate();
    void Promise.resolve(pending).catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto min-h-dvh max-w-3xl">
      <header className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-display text-2xl leading-none tracking-widest text-brass">HOLD LINE</p>
          <p className="text-xs text-muted">Free ballistic solver</p>
        </div>
        <button
          type="button"
          className="h-11 rounded-md border border-line px-3 text-sm"
          onClick={() => patch({ units: units === "yd" ? "m" : "yd" })}
        >
          {units === "yd" ? "Yards" : "Meters"}
        </button>
      </header>
      <main className="px-4 pt-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        {tab === "solve" ? <SolveView /> : null}
        {tab === "dope" ? <DopeView /> : null}
        {tab === "zero" ? <ZeroView /> : null}
        {tab === "library" ? <LibraryView /> : null}
      </main>
      <nav className="dock no-print fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-3xl grid-cols-4">
          {TABS.map((item) => {
            const Icon = item.icon;
            const on = tab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-xs ${on ? "text-brass" : "text-muted"}`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
