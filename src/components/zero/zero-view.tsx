import { ScanPanel } from "@/components/zero/scan-panel";
import { TargetSheet } from "@/components/zero/target-sheet";
import { Button } from "@/components/ui";

export function ZeroView() {
  return (
    <div className="rise flex flex-col gap-5">
      <div className="no-print flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-wide">Zero</h2>
          <p className="text-sm text-muted">Print the sheet at actual size, shoot it, and read the clicks off the group.</p>
        </div>
        <Button
          tone="brass"
          onClick={() => {
            document.body.classList.add("printing");
            window.print();
            window.setTimeout(() => document.body.classList.remove("printing"), 500);
          }}
        >
          Print
        </Button>
      </div>
      <TargetSheet />
      <div className="no-print">
        <ScanPanel />
      </div>
    </div>
  );
}
