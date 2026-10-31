"use client";

import { Check, ExternalLink, Info, RefreshCw, Search, Sparkles, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useProfile } from "@/components/app-shell";
import { MessageComposer } from "@/components/message-composer";
import { Badge, Button, Card, cn, ErrorNote, PageHeader, Spinner } from "@/components/ui";
import { postJSON, track } from "@/lib/client";
import { LINKEDIN_SEARCH_URL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Contact, SearchIdea, Suggestion } from "@/lib/types";

const LOADING_STEPS = [
  "Reading your goals…",
  "Searching public LinkedIn profiles…",
  "Looking for shared ground…",
  "Ranking who's most likely to say yes…",
  "Writing why each person is worth a coffee…",
];

export default function DiscoverPage() {
  const { profile } = useProfile();
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [ideas, setIdeas] = useState<SearchIdea[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [finding, setFinding] = useState(false);
  const [step, setStep] = useState(0);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void createClient()
      .from("suggestions")
      .select("*")
      .eq("status", "new")
      .order("match_score", { ascending: false })
      .then(({ data }) => setSuggestions((data as Suggestion[]) ?? []));
  }, []);

  useEffect(() => {
    if (!finding) return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 6000);
    return () => clearInterval(timer);
  }, [finding]);

  async function findPeople() {
    setFinding(true);
    setStep(0);
    setError(null);
    setNotice(null);
    try {
      const data = await postJSON<{ suggestions: Suggestion[]; searchIdeas: SearchIdea[] }>("/api/discover", {});
      setIdeas(data.searchIdeas);
      if (data.suggestions.length === 0) {
        setNotice("We couldn't verify any new profiles this round. Try again, or broaden your goals on your profile.");
      }
      setSuggestions((prev) => [...data.suggestions, ...(prev ?? [])]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFinding(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function dismiss(s: Suggestion) {
    setSuggestions((prev) => prev?.filter((x) => x.id !== s.id) ?? null);
    setSelected((prev) => new Set([...prev].filter((id) => id !== s.id)));
    await createClient().from("suggestions").update({ status: "dismissed" }).eq("id", s.id);
    track("suggestion_dismissed", { match_score: s.match_score });
  }

  async function addSelected() {
    const picks = (suggestions ?? []).filter((s) => selected.has(s.id));
    if (!picks.length) return;
    setAdding(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("contacts")
      .insert(
        picks.map((s) => ({
          suggestion_id: s.id,
          full_name: s.full_name,
          headline: s.headline,
          company: s.company,
          location: s.location,
          linkedin_url: s.linkedin_url,
          why: s.why,
          shared_ground: s.shared_ground,
          conversation_hook: s.conversation_hook,
          source: "ai",
        })),
      )
      .select("*");
    if (error || !data) {
      setAdding(false);
      return setError("Couldn't add them to your tracker. Please try again.");
    }
    await supabase
      .from("suggestions")
      .update({ status: "selected" })
      .in(
        "id",
        picks.map((s) => s.id),
      );
    track("suggestion_selected", { count: picks.length });
    setSuggestions((prev) => prev?.filter((s) => !selected.has(s.id)) ?? null);
    setSelected(new Set());
    setAdded((prev) => [...(data as Contact[]), ...prev]);
    setAdding(false);
  }

  const list = suggestions ?? [];

  return (
    <div>
      <PageHeader
        title="Find people"
        subtitle="Real people on LinkedIn who are a few steps ahead of you, picked for what you have in common."
        actions={
          list.length > 0 && (
            <Button variant="secondary" onClick={findPeople} loading={finding}>
              <RefreshCw className="size-4" aria-hidden /> Show me new people
            </Button>
          )
        }
      />

      {added.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">Draft your notes</h2>
            <Link href="/tracker" className="text-sm font-medium text-crema-dark hover:underline">
              Everyone&apos;s saved in your tracker →
            </Link>
          </div>
          <div className="grid gap-4">
            {added.map((c) => (
              <Card key={c.id}>
                <div className="mb-3">
                  <Link href={`/contacts/${c.id}`} className="font-semibold hover:underline">
                    {c.full_name}
                  </Link>
                  <p className="text-sm text-mocha">{c.headline}</p>
                </div>
                <MessageComposer
                  contact={c}
                  kind="connect"
                  premium={profile!.linkedin_premium}
                  autoGenerate
                  onContactChange={(next) => setAdded((prev) => prev.map((x) => (x.id === next.id ? next : x)))}
                />
              </Card>
            ))}
          </div>
        </section>
      )}

      {finding && (
        <Card className="mb-6 flex flex-col items-center gap-3 py-10 text-center">
          <Spinner label={LOADING_STEPS[step]} />
          <p className="text-xs text-mocha">Searching takes about a minute. Grab a coffee ☕</p>
        </Card>
      )}

      <ErrorNote message={error} />
      {notice && <p className="mb-4 rounded-xl bg-honey-soft px-3 py-2 text-sm text-crema-dark">{notice}</p>}

      {suggestions === null ? (
        <Spinner label="Loading…" />
      ) : list.length === 0 && !finding ? (
        <Card className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-honey-soft text-crema-dark">
            <Search className="size-6" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold">
              {added.length ? "That's everyone for now" : "Let's find your first coffee chats"}
            </h2>
            <p className="mt-1 max-w-md text-sm text-mocha">
              We&apos;ll search public LinkedIn profiles for people who match your goals, then explain why each one is
              worth reaching out to.
            </p>
          </div>
          <Button variant="accent" size="lg" onClick={findPeople} loading={finding}>
            <Sparkles className="size-4" aria-hidden /> Find people for me
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((s) => (
            <SuggestionCard
              key={s.id}
              s={s}
              selected={selected.has(s.id)}
              onToggle={() => toggle(s.id)}
              onDismiss={() => dismiss(s)}
            />
          ))}
        </div>
      )}

      {ideas.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 text-sm font-medium">Want to look yourself? Try these LinkedIn searches:</p>
          <div className="flex flex-wrap gap-2">
            {ideas.map((idea) => (
              <a
                key={idea.keywords}
                href={`${LINKEDIN_SEARCH_URL}${encodeURIComponent(idea.keywords)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("search_idea_opened")}
                className="inline-flex items-center gap-1.5 rounded-full border border-latte bg-paper px-3 py-1.5 text-sm hover:bg-foam"
              >
                <Search className="size-3.5" aria-hidden /> {idea.label}
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 flex items-start gap-2 text-xs text-mocha">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Suggestions come from public web search results and are written by AI, so details can be out of date. Give each
        profile a quick look before you reach out. We only show people whose LinkedIn profile we actually found.
      </p>

      {selected.size > 0 && (
        <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-3 rounded-2xl bg-espresso p-3 pl-5 text-cream shadow-xl">
          <span className="text-sm">
            {selected.size} {selected.size === 1 ? "person" : "people"} selected
          </span>
          <Button variant="light" onClick={addSelected} loading={adding}>
            <UserPlus className="size-4" aria-hidden /> Add to tracker & draft notes
          </Button>
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  s,
  selected,
  onToggle,
  onDismiss,
}: {
  s: Suggestion;
  selected: boolean;
  onToggle: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "cursor-pointer rounded-2xl border bg-paper p-5 transition-all",
        selected ? "border-crema ring-2 ring-crema/30" : "border-latte hover:border-mocha/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
            selected ? "border-crema bg-crema text-white" : "border-latte",
          )}
        >
          {selected && <Check className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{s.full_name}</p>
              <p className="text-sm text-roast">{s.headline}</p>
              <p className="text-xs text-mocha">{[s.company, s.location].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="flex items-center gap-1">
              <Badge tone={s.match_score >= 80 ? "success" : s.match_score >= 60 ? "accent" : "neutral"}>
                {s.match_score}% match
              </Badge>
              <button
                type="button"
                aria-label={`Not interested in ${s.full_name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="rounded-full p-1 text-mocha hover:bg-foam hover:text-berry"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          {s.shared_ground.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {s.shared_ground.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          )}
          <p className="mt-3 text-sm leading-relaxed text-roast">{s.why}</p>
          {s.conversation_hook && (
            <p className="mt-2 text-xs text-mocha">
              <span className="font-medium text-roast">Ask about:</span> {s.conversation_hook}
            </p>
          )}
          <a
            href={s.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              track("linkedin_opened", { from: "suggestion" });
            }}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky hover:underline"
          >
            View on LinkedIn <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}
