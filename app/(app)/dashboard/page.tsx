"use client";

import { ArrowRight, Coffee, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useProfile } from "@/components/app-shell";
import { FakeDoor } from "@/components/fake-door";
import { Card, ProgressBar, Spinner } from "@/components/ui";
import { daysSince, firstName } from "@/lib/client";
import { PIPELINE, statusLabel } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/lib/types";

type NextStep = { title: string; body: string; href: string; cta: string };

/** The single most useful thing to do today, in priority order. */
function pickNextStep(contacts: Contact[], newSuggestions: number): NextStep {
  const needsPrep = contacts.find((c) => c.status === "accepted" && !c.research);
  if (needsPrep) {
    return {
      title: `Prep for your chat with ${firstName(needsPrep.full_name)}`,
      body: "Get a research brief and questions tailored to them, so you walk in ready.",
      href: `/contacts/${needsPrep.id}`,
      cta: "Prepare",
    };
  }
  const done = contacts.find((c) => c.status === "completed" && daysSince(c.completed_at)! <= 2);
  if (done) {
    return {
      title: `Send ${firstName(done.full_name)} a thank-you`,
      body: "A short, specific note within a day keeps the relationship going.",
      href: `/contacts/${done.id}`,
      cta: "Write it",
    };
  }
  const toSend = contacts.find((c) => c.status === "to_reach_out");
  if (toSend) {
    return {
      title: `Send your note to ${firstName(toSend.full_name)}`,
      body: toSend.why || "Your connection note is ready to draft.",
      href: `/contacts/${toSend.id}`,
      cta: "Draft & send",
    };
  }
  if (newSuggestions > 0) {
    return {
      title: `${newSuggestions} people are waiting for you`,
      body: "Pick the ones you'd like to meet and we'll draft your notes.",
      href: "/discover",
      cta: "Review",
    };
  }
  return {
    title: "Find today's coffee",
    body: "Get a fresh set of people matched to your goals.",
    href: "/discover",
    cta: "Find people",
  };
}

export default function DashboardPage() {
  const { profile } = useProfile();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [newSuggestions, setNewSuggestions] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("contacts")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => setContacts((data as Contact[]) ?? []));
    void supabase
      .from("suggestions")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")
      .then(({ count }) => setNewSuggestions(count ?? 0));
  }, []);

  if (!contacts) return <Spinner label="Brewing…" />;

  const p = profile!;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const reachedThisWeek = contacts.filter((c) => c.reached_out_at && new Date(c.reached_out_at) >= weekStart).length;
  const chatsThisMonth = contacts.filter((c) => c.completed_at && new Date(c.completed_at) >= monthStart).length;
  const booked = contacts.filter((c) => c.status === "accepted").length;
  const stale = contacts.filter((c) => c.status === "reached_out" && (daysSince(c.reached_out_at) ?? 0) >= 7);
  const next = pickNextStep(contacts, newSuggestions);
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {greeting}, {firstName(p.full_name) || "there"}
        </h1>
        <p className="mt-1 text-sm text-mocha">One coffee a day adds up fast.</p>
      </div>

      <Card className="flex flex-col gap-4 border-none bg-espresso text-cream sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-crema text-white">
            <Coffee className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-latte">Today&apos;s coffee</p>
            <p className="mt-1 font-display text-xl font-semibold">{next.title}</p>
            <p className="mt-1 text-sm text-latte">{next.body}</p>
          </div>
        </div>
        <Link
          href={next.href}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-paper px-5 text-sm font-medium text-espresso hover:bg-foam"
        >
          {next.cta} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <div className="flex items-center gap-2">
            <Target className="size-4 text-crema" aria-hidden />
            <h2 className="font-semibold">Your networking OKR</h2>
            <Link href="/profile" className="ml-auto text-xs text-mocha hover:underline">
              Edit
            </Link>
          </div>
          <p className="mt-2 text-sm text-roast">
            <span className="font-medium">Objective:</span> {p.career_goal || "Set a career goal on your profile."}
          </p>
          <div className="mt-5 flex flex-col gap-4">
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span>KR1 · Reach out to {p.weekly_outreach_goal} people this week</span>
                <span className="font-medium">
                  {reachedThisWeek}/{p.weekly_outreach_goal}
                </span>
              </div>
              <ProgressBar value={reachedThisWeek} max={p.weekly_outreach_goal} />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span>KR2 · Have {p.monthly_chat_goal} coffee chats this month</span>
                <span className="font-medium">
                  {chatsThisMonth}/{p.monthly_chat_goal}
                </span>
              </div>
              <ProgressBar value={chatsThisMonth} max={p.monthly_chat_goal} />
              {booked > 0 && <p className="mt-1 text-xs text-mocha">+{booked} booked and coming up</p>}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Your pipeline</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {PIPELINE.map((status) => (
              <Link key={status} href="/tracker" className="rounded-xl bg-foam/70 p-3 hover:bg-foam">
                <p className="text-2xl font-semibold">{contacts.filter((c) => c.status === status).length}</p>
                <p className="text-xs text-mocha">{statusLabel(status)}</p>
              </Link>
            ))}
          </div>
          {stale.length > 0 && (
            <p className="mt-4 rounded-xl bg-honey-soft px-3 py-2 text-xs text-crema-dark">
              {stale.length} {stale.length === 1 ? "person hasn't" : "people haven't"} replied in a week.{" "}
              <Link href="/tracker" className="font-medium underline">
                Review
              </Link>
            </p>
          )}
        </Card>
      </div>

      <FakeDoor />
    </div>
  );
}
