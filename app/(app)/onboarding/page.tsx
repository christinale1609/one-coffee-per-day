"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProfile } from "@/components/app-shell";
import {
  AboutFields,
  GoalFields,
  mergeResume,
  ResumeImport,
  toDraft,
  type ProfileDraft,
} from "@/components/profile-form";
import { Button, Card, cn, ErrorNote } from "@/components/ui";
import { track } from "@/lib/client";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

const STEPS = ["Resume", "About you", "Your goals"];

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, setProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(profile!));
  const [method, setMethod] = useState<"resume" | "manual">("manual");
  const [roleIdeas, setRoleIdeas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...patch }));

  async function finish() {
    if (!draft.career_goal.trim()) return setError("Add a career goal so we know who to suggest.");
    if (!draft.full_name.trim()) {
      setStep(1);
      return setError("Add your name.");
    }
    setSaving(true);
    setError(null);
    const { data, error } = await createClient()
      .from("profiles")
      .update({ ...draft, onboarded: true })
      .eq("id", profile!.id)
      .select("*")
      .single<Profile>();
    setSaving(false);
    if (error || !data) return setError("Couldn't save your profile. Please try again.");
    track("onboarding_completed", { method });
    setProfile(data);
    router.replace("/discover");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Let&apos;s set you up</h1>
      <p className="mt-1 text-sm text-mocha">Three quick steps, then we&apos;ll find your first coffee chats.</p>

      <ol className="my-6 flex items-center gap-2 text-sm">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                i < step ? "bg-sage text-white" : i === step ? "bg-espresso text-cream" : "bg-foam text-mocha",
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={i === step ? "font-medium" : "text-mocha"}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-latte" />}
          </li>
        ))}
      </ol>

      <Card>
        {step === 0 && (
          <div>
            <h2 className="font-semibold">Start with your resume</h2>
            <p className="mb-4 mt-1 text-sm text-mocha">
              We&apos;ll pre-fill your profile from it. You can edit everything on the next step.
            </p>
            <ResumeImport
              onParsed={(r) => {
                setDraft((d) => mergeResume(d, r));
                setRoleIdeas(r.suggested_roles);
                setMethod("resume");
                setStep(1);
              }}
            />
            <div className="mt-6 border-t border-latte pt-4">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Skip and fill it in myself <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-semibold">About you</h2>
            <p className="mb-5 mt-1 text-sm text-mocha">
              {method === "resume" ? "Here's what we pulled from your resume. Fix anything that's off." : "Tell us a bit about yourself."}
            </p>
            <AboutFields draft={draft} set={set} />
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-semibold">Your goals</h2>
            <p className="mb-5 mt-1 text-sm text-mocha">This is what we&apos;ll use to find the right people for you.</p>
            <GoalFields draft={draft} set={set} roleIdeas={roleIdeas} />
          </div>
        )}

        {step > 0 && (
          <div className="mt-6 flex flex-col gap-3 border-t border-latte pt-4">
            <ErrorNote message={error} />
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="size-4" aria-hidden /> Back
              </Button>
              {step === 1 ? (
                <Button onClick={() => setStep(2)} disabled={!draft.full_name.trim()}>
                  Next <ArrowRight className="size-4" aria-hidden />
                </Button>
              ) : (
                <Button variant="accent" onClick={finish} loading={saving}>
                  Find my first coffee chats <ArrowRight className="size-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
