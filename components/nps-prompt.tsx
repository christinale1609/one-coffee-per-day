"use client";

import { Check, Copy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useProfile } from "@/components/app-shell";
import { CHAT_COMPLETED_EVENT } from "@/components/status-select";
import { Button, cn, Textarea } from "@/components/ui";
import { track } from "@/lib/client";
import { APP_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

/** Asks for an NPS score (and a referral) once, right after someone's first coffee chat. */
export function NpsPrompt() {
  const { profile, setProfile } = useProfile();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const show = () => {
      if (profile && !profile.nps_prompted) setOpen(true);
    };
    window.addEventListener(CHAT_COMPLETED_EVENT, show);
    return () => window.removeEventListener(CHAT_COMPLETED_EVENT, show);
  }, [profile]);

  async function markPrompted() {
    const { data } = await createClient()
      .from("profiles")
      .update({ nps_prompted: true })
      .eq("id", profile!.id)
      .select("*")
      .single<Profile>();
    if (data) setProfile(data);
  }

  async function submit() {
    if (score === null) return;
    await createClient().from("feedback").insert({ kind: "nps", score, comment, context: "first_chat_completed" });
    track("nps_submitted", { score });
    await markPrompted();
    setDone(true);
  }

  async function close() {
    setOpen(false);
    if (!done) {
      track("nps_dismissed");
      await markPrompted();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/40 p-4 sm:items-center" role="dialog" aria-modal>
      <div className="relative w-full max-w-lg rounded-2xl bg-paper p-6 shadow-2xl">
        <button onClick={close} aria-label="Close" className="absolute right-4 top-4 text-mocha hover:text-espresso">
          <X className="size-5" />
        </button>
        {!done ? (
          <>
            <p className="text-sm font-medium text-crema-dark">🎉 You had a coffee chat!</p>
            <h2 className="mt-1 font-display text-xl font-semibold">
              How likely are you to recommend {APP_NAME} to a friend?
            </h2>
            <div className="mt-4 grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  onClick={() => setScore(n)}
                  className={cn(
                    "h-9 rounded-lg border text-sm font-medium",
                    score === n ? "border-crema bg-crema text-white" : "border-latte hover:bg-foam",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-mocha">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
            <Textarea
              className="mt-4"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What's the main reason for your score? (optional)"
            />
            <Button className="mt-4 w-full" onClick={submit} disabled={score === null}>
              Send
            </Button>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl font-semibold">Thank you!</h2>
            <p className="mt-2 text-sm text-mocha">
              Know a classmate or friend who&apos;s networking right now? Send them the link. It&apos;s the best way to help
              us grow.
            </p>
            <Button
              className="mt-4 w-full"
              variant="accent"
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.origin);
                setCopied(true);
                track("referral_link_copied");
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Link copied" : "Copy invite link"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
