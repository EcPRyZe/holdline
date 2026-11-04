import type { ReactNode } from "react";

export const fieldClass =
  "h-11 w-full min-w-0 rounded-md border border-line bg-surface-2 px-3 text-base text-fg outline-none focus-visible:ring-2 focus-visible:ring-brass";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Button({
  children,
  onClick,
  tone = "ghost",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "brass" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const toneClass =
    tone === "brass"
      ? "bg-brass text-bg hover:brightness-110"
      : tone === "danger"
        ? "bg-surface-2 text-fg border border-line"
        : "bg-surface-2 text-fg border border-line hover:border-brass";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </button>
  );
}

export function Seg({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`h-9 rounded-sm px-3 text-sm ${value === o.id ? "bg-brass text-bg" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
