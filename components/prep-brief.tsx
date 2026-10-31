"use client";

import { Check, Copy, ExternalLink, Info, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, ErrorNote, Spinner } from "@/components/ui";
import { firstName, postJSON, track } from "@/lib/client";
import type { Contact, ResearchBrief } from "@/lib/types";

const LOADING_STEPS = [
  "Looking up their public work…",
  "Reading talks, articles and news…",
  "Finding common ground with you…",
  "Writing questions worth asking…",
];

export function PrepBrief({ contact, onContactChange }: { contact: Contact; onContactChange: (c: Contact) => void }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const brief = contact.research;

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 7000);
    return () => clearInterval(timer);
  }, [loading]);

  async function generate() {
    setLoading(true);
    setStep(0);
    setError(null);
    try {
      const { research } = await postJSON<{ research: ResearchBrief }>("/api/prep", { contactId: contact.id });
      onContactChange({ ...contact, research });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copyQuestions() {
    if (!brief) return;
    await navigator.clipboard.writeText(brief.questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    track("questions_copied");
  }

  if (loading) {
    return (
      <Card className="flex flex-col items-center gap-2 py-10 text-center">
        <Spinner label={LOADING_STEPS[step]} />
        <p className="text-xs text-mocha">This takes about a minute.</p>
      </Card>
    );
  }

  if (!brief) {
    return (
      <Card className="flex flex-col items-start gap-3 bg-honey-soft/40">
        <div>
          <h2 className="font-display text-xl font-semibold">Get ready for your chat with {firstName(contact.full_name)}</h2>
          <p className="mt-1 text-sm text-mocha">
            We&apos;ll look up their public work and career path, and suggest questions tailored to them and your goals.
          </p>
        </div>
        <Button variant="accent" onClick={generate}>
          <Sparkles className="size-4" aria-hidden /> Prepare my brief
        </Button>
        <ErrorNote message={error} />
      </Card>
    );
  }

  const categories = [...new Set(brief.questions.map((q) => q.category))];

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-semibold">Coffee chat brief</h2>
          <p className="text-xs text-mocha">
            Researched {new Date(brief.generated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={generate}>
          <RefreshCw className="size-3.5" aria-hidden /> Refresh
        </Button>
      </div>

      <Section title="Snapshot">
        <p className="text-sm leading-relaxed text-roast">{brief.snapshot}</p>
      </Section>

      {brief.career_path.length > 0 && (
        <Section title="Career path">
          <ol className="flex flex-col gap-1.5 border-l-2 border-latte pl-4 text-sm text-roast">
            {brief.career_path.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Section>
      )}

      {brief.recent_activity.length > 0 && (
        <Section title="Recent public activity">
          <ul className="flex flex-col gap-3">
            {brief.recent_activity.map((a) => (
              <li key={a.title} className="text-sm">
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sky hover:underline">
                    {a.title} <ExternalLink className="inline size-3" aria-hidden />
                  </a>
                ) : (
                  <span className="font-medium">{a.title}</span>
                )}
                <p className="text-roast">{a.takeaway}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {brief.talking_points.length > 0 && (
        <Section title="Talking points">
          <ul className="list-disc space-y-1 pl-5 text-sm text-roast">
            {brief.talking_points.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        title="Questions to ask"
        action={
          <Button size="sm" variant="secondary" onClick={copyQuestions}>
            {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy all"}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-crema-dark">{cat}</p>
              <ul className="flex flex-col gap-2">
                {brief.questions
                  .filter((q) => q.category === cat)
                  .map((q) => (
                    <li key={q.question} className="rounded-xl bg-foam/60 px-3 py-2">
                      <p className="text-sm font-medium">{q.question}</p>
                      <p className="mt-0.5 text-xs text-mocha">{q.why}</p>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {brief.avoid.length > 0 && (
        <Section title="Steer clear of">
          <ul className="list-disc space-y-1 pl-5 text-sm text-roast">
            {brief.avoid.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Section>
      )}

      {brief.sources.length > 0 && (
        <Section title="Sources">
          <ul className="flex flex-col gap-1 text-xs">
            {brief.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sky hover:underline">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className="flex items-start gap-2 text-xs text-mocha">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Built by AI from public web pages, so it can be incomplete or out of date. Check anything you plan to mention, and
        leave out anything that feels too personal.
      </p>
      <ErrorNote message={error} />
    </Card>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
