"use client";

import { LoaderCircle, X } from "lucide-react";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const BUTTON_VARIANTS = {
  primary: "bg-espresso text-cream hover:bg-roast",
  accent: "bg-crema text-white hover:bg-crema-dark",
  secondary: "bg-paper text-espresso border border-latte hover:bg-foam",
  ghost: "text-roast hover:bg-foam",
  danger: "text-berry hover:bg-berry-soft",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crema",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        BUTTON_VARIANTS[variant],
        className,
      )}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-latte bg-paper p-5 shadow-[0_1px_2px_rgba(42,26,18,0.04)]", className)}>
      {children}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-foam text-roast",
  info: "bg-sky-soft text-sky",
  accent: "bg-honey-soft text-crema-dark",
  success: "bg-sage-soft text-sage",
  muted: "bg-foam text-mocha",
  danger: "bg-berry-soft text-berry",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", BADGE_TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-espresso">{label}</span>
      {children}
      {hint && <span className="text-xs text-mocha">{hint}</span>}
    </label>
  );
}

const CONTROL =
  "w-full rounded-xl border border-latte bg-paper px-3 text-sm text-espresso placeholder:text-mocha/70 focus:border-crema focus:outline-none focus:ring-2 focus:ring-crema/20";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(CONTROL, "h-10", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(CONTROL, "py-2 leading-relaxed", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(CONTROL, "h-10 pr-8", props.className)} />;
}

/** Free-text chips: type and press Enter (or comma) to add; click × to remove. */
export function TagInput({
  value,
  onChange,
  placeholder,
  ideas = [],
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  ideas?: readonly string[];
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const tag = raw.trim().replace(/,$/, "");
    if (tag && !value.some((v) => v.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setDraft("");
  };
  const unused = ideas.filter((i) => !value.includes(i));

  return (
    <div className="flex flex-col gap-2">
      <div className={cn(CONTROL, "flex min-h-10 flex-wrap items-center gap-1.5 py-1.5")}>
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-foam px-2.5 py-1 text-xs text-roast">
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(value.filter((v) => v !== tag))}
              className="text-mocha hover:text-berry"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="min-w-32 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-mocha/70"
        />
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => add(idea)}
              className="rounded-full border border-dashed border-latte px-2.5 py-1 text-xs text-mocha hover:border-crema hover:text-crema-dark"
            >
              + {idea}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-foam", className)}>
      <div className="h-full rounded-full bg-crema transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-mocha">
      <LoaderCircle className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-xl bg-berry-soft px-3 py-2 text-sm text-berry">{message}</p>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-espresso">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-mocha">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
