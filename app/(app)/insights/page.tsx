"use client";

import { useEffect, useState } from "react";
import { Card, cn, PageHeader, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Metrics = {
  users_total: number;
  users_onboarded: number;
  wau: number;
  mau: number;
  suggestions_total: number;
  contacts_total: number;
  reached_out_total: number;
  accepted_total: number;
  completed_total: number;
  accepted_7d: number;
  accepted_prev_7d: number;
  north_star_weekly: { week: string; accepted: number }[];
  funnel: Record<string, number>;
  avg_contacts_per_active_user: number;
  avg_features_per_user: number;
  feature_users: Record<string, number>;
  nps: { responses: number; score: number | null };
  waitlist: Record<string, number>;
};

const FUNNEL_STEPS: [string, string][] = [
  ["signed_up", "Signed up"],
  ["onboarded", "Finished onboarding"],
  ["got_suggestions", "Got suggestions"],
  ["saved_contact", "Saved a contact"],
  ["reached_out", "Reached out"],
  ["got_accepted", "Got a chat accepted"],
  ["had_chat", "Had a coffee chat"],
];

const WAITLIST_LABELS: Record<string, string> = {
  reminders: "Follow-up reminders",
  extension: "LinkedIn browser extension",
  pro: "Pro · $4.99/month",
};

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "–");

export default function InsightsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    void createClient()
      .rpc("product_metrics")
      .then(({ data, error }) => {
        if (error) setDenied(true);
        else setMetrics(data as Metrics);
      });
  }, []);

  if (denied) {
    return (
      <Card>
        Insights are only visible to the product team. Add your email to the <code>admins</code> table in Supabase.
      </Card>
    );
  }
  if (!metrics) return <Spinner label="Crunching numbers…" />;

  const m = metrics;
  const delta = m.accepted_7d - m.accepted_prev_7d;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Product insights"
        subtitle="Live usage data for the whole app. Aggregates only: no individual user data is shown."
      />

      <Card>
        <p className="text-sm font-medium text-mocha">North Star metric · coffee chats accepted, last 7 days</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <span className="text-6xl font-semibold tracking-tight">{m.accepted_7d}</span>
          <span className={cn("text-sm font-medium", delta > 0 ? "text-sage" : delta < 0 ? "text-berry" : "text-mocha")}>
            {delta > 0 ? "+" : ""}
            {delta} vs previous 7 days
          </span>
          <span className="text-sm text-mocha">· {m.accepted_total} all time</span>
        </div>
        <WeeklyColumns data={m.north_star_weekly} />
        <p className="mt-3 text-xs text-mocha">
          Why this metric: an accepted chat is the moment users get real value (a conversation that moves their career
          forward), and it leads retention and referrals rather than lagging them.
        </p>
      </Card>

      <div>
        <h2 className="mb-3 font-semibold">Input metrics</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Breadth · AI features used per user" value={String(m.avg_features_per_user)} note="of 5 core features" />
          <StatTile label="Depth · contacts per active user" value={String(m.avg_contacts_per_active_user)} note={`${m.contacts_total} contacts total`} />
          <StatTile label="Frequency · weekly active users" value={String(m.wau)} note={`${m.mau} monthly active`} />
          <StatTile
            label="Acceptance rate"
            value={pct(m.accepted_total, m.reached_out_total)}
            note={`${m.accepted_total} of ${m.reached_out_total} outreach`}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <h2 className="font-semibold">Activation funnel</h2>
          <p className="text-xs text-mocha">Users who reached each step, as a share of sign-ups</p>
          <HBars
            className="mt-4"
            rows={FUNNEL_STEPS.map(([key, label]) => ({
              label,
              value: m.funnel[key] ?? 0,
              display: `${m.funnel[key] ?? 0} · ${pct(m.funnel[key] ?? 0, m.funnel.signed_up)}`,
            }))}
          />
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="font-semibold">Net Promoter Score</h2>
            <p className="mt-2 text-5xl font-semibold tracking-tight">{m.nps.score ?? "–"}</p>
            <p className="mt-1 text-xs text-mocha">
              {m.nps.responses} response{m.nps.responses === 1 ? "" : "s"}, asked after a user&apos;s first coffee chat
            </p>
          </Card>
          <Card>
            <h2 className="font-semibold">Demand test · “I want this” clicks</h2>
            <p className="text-xs text-mocha">Unique users per feature that doesn&apos;t exist yet</p>
            <HBars
              className="mt-4"
              rows={Object.keys(WAITLIST_LABELS).map((key) => ({
                label: WAITLIST_LABELS[key],
                value: m.waitlist[key] ?? 0,
                display: String(m.waitlist[key] ?? 0),
              }))}
            />
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="font-semibold">Feature usage</h2>
        <p className="text-xs text-mocha">Unique users who triggered each tracked event</p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-latte text-left text-xs text-mocha">
              <th className="py-2 font-medium">Event</th>
              <th className="py-2 text-right font-medium">Users</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(m.feature_users)
              .sort((a, b) => b[1] - a[1])
              .map(([name, users]) => (
                <tr key={name} className="border-b border-foam">
                  <td className="py-1.5 font-mono text-xs">{name}</td>
                  <td className="py-1.5 text-right tabular-nums">{users}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-mocha">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-xs text-mocha">{note}</p>}
    </Card>
  );
}

/** Single-series column chart: one hue, capped column width, value on the latest column, hover for the rest. */
function WeeklyColumns({ data }: { data: { week: string; accepted: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.accepted));
  const fmt = (week: string) =>
    new Date(`${week}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="mt-6">
      <div className="relative flex h-40 items-end gap-2 border-b border-latte">
        {data.map((d, i) => {
          const last = i === data.length - 1;
          return (
            <button
              key={d.week}
              type="button"
              className="group relative flex h-full flex-1 flex-col items-center justify-end outline-none"
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`Week of ${fmt(d.week)}: ${d.accepted} accepted`}
            >
              {(last || active === i) && (
                <span className="mb-1 text-xs font-semibold tabular-nums text-espresso">{d.accepted}</span>
              )}
              <span
                className={cn(
                  "w-full max-w-6 rounded-t bg-crema transition-opacity",
                  active !== null && active !== i && "opacity-60",
                )}
                style={{ height: `${(d.accepted / max) * 85}%`, minHeight: d.accepted > 0 ? 4 : 0 }}
              />
              {active === i && (
                <span className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-espresso px-2 py-1 text-xs text-cream">
                  <strong className="tabular-nums">{d.accepted}</strong> · week of {fmt(d.week)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex gap-2">
        {data.map((d, i) => (
          <span key={d.week} className="flex-1 text-center text-[10px] text-mocha">
            {i % 2 === data.length % 2 || i === data.length - 1 ? fmt(d.week) : ""}
          </span>
        ))}
      </div>
      <button type="button" onClick={() => setShowTable(!showTable)} className="mt-2 text-xs text-crema-dark hover:underline">
        {showTable ? "Hide table" : "Show as table"}
      </button>
      {showTable && (
        <table className="mt-2 w-full max-w-xs text-xs">
          <tbody>
            {data.map((d) => (
              <tr key={d.week} className="border-b border-foam">
                <td className="py-1">Week of {fmt(d.week)}</td>
                <td className="py-1 text-right tabular-nums">{d.accepted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Single-series horizontal bars with the value at each bar's tip. */
function HBars({
  rows,
  className,
}: {
  rows: { label: string; value: number; display: string }[];
  className?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {rows.map((r) => (
        <li key={r.label}>
          <p className="mb-1 text-xs text-roast">{r.label}</p>
          <div className="flex items-center gap-2">
            <div className="h-4 flex-1">
              <div
                className="h-full rounded-r bg-crema"
                style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value > 0 ? 4 : 0 }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-xs font-medium tabular-nums text-espresso">{r.display}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
