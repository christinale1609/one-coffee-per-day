"use client";

import { Bell, Check, Crown, Puzzle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { track } from "@/lib/client";
import { createClient } from "@/lib/supabase/client";

// Demand test ("button to nowhere"): none of these exist yet. Clicks are counted
// on the Insights page so we can see which one is worth building first.
const IDEAS = [
  {
    id: "reminders",
    icon: Bell,
    title: "Follow-up reminders",
    body: "A nudge by email when it's time to follow up or send a thank-you.",
  },
  {
    id: "extension",
    icon: Puzzle,
    title: "LinkedIn browser extension",
    body: "Draft your note right inside LinkedIn, on any profile you're viewing.",
  },
  {
    id: "pro",
    icon: Crown,
    title: "Pro · $4.99/month",
    body: "Unlimited people searches and a fresh set of matches every Monday.",
  },
];

export function FakeDoor() {
  const [joined, setJoined] = useState<Set<string>>(new Set());

  useEffect(() => {
    void createClient()
      .from("feedback")
      .select("context")
      .eq("kind", "waitlist")
      .then(({ data }) => setJoined(new Set((data ?? []).map((d) => d.context as string))));
  }, []);

  async function join(id: string) {
    setJoined((prev) => new Set(prev).add(id));
    track("fake_door_clicked", { feature: id });
    await createClient().from("feedback").insert({ kind: "waitlist", context: id });
  }

  return (
    <Card>
      <h2 className="font-semibold">Coming soon. Want one of these?</h2>
      <p className="mt-0.5 text-sm text-mocha">Tell us what to build next.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {IDEAS.map(({ id, icon: Icon, title, body }) => (
          <div key={id} className="flex flex-col gap-2 rounded-xl border border-latte p-4">
            <Icon className="size-5 text-crema" aria-hidden />
            <p className="text-sm font-medium">{title}</p>
            <p className="flex-1 text-xs text-mocha">{body}</p>
            {joined.has(id) ? (
              <p className="flex items-center gap-1 text-xs font-medium text-sage">
                <Check className="size-3.5" aria-hidden /> You&apos;re on the list
              </p>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => join(id)}>
                I want this
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
