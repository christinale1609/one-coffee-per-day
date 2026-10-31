"use client";

import { FileText, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { Button, cn, ErrorNote, Field, Input, Select, Spinner, TagInput, Textarea } from "@/components/ui";
import {
  CHAT_GOAL_OPTIONS,
  CONNECT_NOTE_LIMIT,
  CURRENT_STATUS_OPTIONS,
  INDUSTRY_IDEAS,
} from "@/lib/constants";
import type { Profile } from "@/lib/types";

export type ProfileDraft = Omit<Profile, "id" | "email" | "onboarded" | "nps_prompted">;

export type ParsedResume = Pick<
  Profile,
  | "full_name"
  | "location"
  | "school"
  | "degree"
  | "field_of_study"
  | "graduation_year"
  | "current_status"
  | "current_title"
  | "current_company"
  | "headline"
  | "skills"
  | "experiences"
  | "background_summary"
> & { suggested_industries: string[]; suggested_roles: string[] };

export function toDraft(p: Profile): ProfileDraft {
  const draft: Partial<Profile> = { ...p };
  delete draft.id;
  delete draft.email;
  delete draft.onboarded;
  delete draft.nps_prompted;
  return draft as ProfileDraft;
}

/** Fills the draft from a parsed resume, keeping anything the resume left blank. */
export function mergeResume(draft: ProfileDraft, r: ParsedResume): ProfileDraft {
  const pick = (next: string, prev: string) => (next.trim() ? next.trim() : prev);
  return {
    ...draft,
    full_name: pick(r.full_name, draft.full_name),
    location: pick(r.location, draft.location),
    school: pick(r.school, draft.school),
    degree: pick(r.degree, draft.degree),
    field_of_study: pick(r.field_of_study, draft.field_of_study),
    graduation_year: pick(r.graduation_year, draft.graduation_year),
    current_status: pick(r.current_status, draft.current_status),
    current_title: pick(r.current_title, draft.current_title),
    current_company: pick(r.current_company, draft.current_company),
    headline: pick(r.headline, draft.headline),
    background_summary: pick(r.background_summary, draft.background_summary),
    skills: r.skills.length ? r.skills : draft.skills,
    experiences: r.experiences.length ? r.experiences : draft.experiences,
    target_industries: draft.target_industries.length ? draft.target_industries : r.suggested_industries,
    target_roles: draft.target_roles.length ? draft.target_roles : r.suggested_roles,
    target_locations: draft.target_locations.length || !r.location ? draft.target_locations : [r.location],
  };
}

export function ResumeImport({ onParsed }: { onParsed: (r: ParsedResume) => void }) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(form: FormData) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/resume/parse", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't read that resume.");
      onParsed(data.profile as ParsedResume);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-latte bg-foam/50 px-6 py-12 text-center">
        <Spinner label={`Reading ${fileName ?? "your resume"}…`} />
        <p className="text-xs text-mocha">This usually takes 10-20 seconds.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {mode === "file" ? (
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-latte bg-foam/50 px-6 py-10 text-center transition-colors hover:border-crema hover:bg-honey-soft/40">
          <span className="flex size-12 items-center justify-center rounded-full bg-paper text-crema">
            <Upload className="size-5" aria-hidden />
          </span>
          <span className="font-medium text-espresso">Upload your resume</span>
          <span className="text-xs text-mocha">PDF, DOCX or TXT, up to 4 MB. We read it once and don&apos;t keep the file.</span>
          <input
            type="file"
            accept=".pdf,.docx,.txt,application/pdf"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFileName(file.name);
              const form = new FormData();
              form.append("file", file);
              void send(form);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your resume or LinkedIn 'About' and experience sections here…"
          />
          <Button
            variant="secondary"
            disabled={text.trim().length < 50}
            onClick={() => {
              setFileName(null);
              const form = new FormData();
              form.append("text", text);
              void send(form);
            }}
          >
            <FileText className="size-4" aria-hidden /> Fill my profile from this text
          </Button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setMode(mode === "file" ? "text" : "file")}
        className="self-start text-sm text-crema-dark hover:underline"
      >
        {mode === "file" ? "Or paste text instead" : "Or upload a file instead"}
      </button>
      <ErrorNote message={error} />
    </div>
  );
}

type FieldsProps = { draft: ProfileDraft; set: (patch: Partial<ProfileDraft>) => void };

export function AboutFields({ draft, set }: FieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name">
        <Input value={draft.full_name} onChange={(e) => set({ full_name: e.target.value })} required />
      </Field>
      <Field label="Location">
        <Input value={draft.location} onChange={(e) => set({ location: e.target.value })} placeholder="Toronto, ON" />
      </Field>
      <Field label="School">
        <Input value={draft.school} onChange={(e) => set({ school: e.target.value })} placeholder="University of Toronto" />
      </Field>
      <Field label="Degree">
        <Input value={draft.degree} onChange={(e) => set({ degree: e.target.value })} placeholder="Master of Management Analytics" />
      </Field>
      <Field label="Field of study">
        <Input value={draft.field_of_study} onChange={(e) => set({ field_of_study: e.target.value })} />
      </Field>
      <Field label="Graduation year">
        <Input value={draft.graduation_year} onChange={(e) => set({ graduation_year: e.target.value })} placeholder="2026" />
      </Field>
      <Field label="Where you are now">
        <Select value={draft.current_status} onChange={(e) => set({ current_status: e.target.value })}>
          <option value="">Choose one…</option>
          {CURRENT_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Current title">
        <Input value={draft.current_title} onChange={(e) => set({ current_title: e.target.value })} placeholder="Student" />
      </Field>
      <Field label="Current company or organization">
        <Input value={draft.current_company} onChange={(e) => set({ current_company: e.target.value })} />
      </Field>
      <Field label="One-line headline">
        <Input
          value={draft.headline}
          onChange={(e) => set({ headline: e.target.value })}
          placeholder="Analytics student heading into product management"
        />
      </Field>
      <Field label="Skills" className="sm:col-span-2">
        <TagInput value={draft.skills} onChange={(skills) => set({ skills })} placeholder="SQL, Python, stakeholder management…" />
      </Field>
      <Field
        label="Background summary"
        hint="Used to personalize your matches and messages. Edit anything that's off."
        className="sm:col-span-2"
      >
        <Textarea
          rows={4}
          value={draft.background_summary}
          onChange={(e) => set({ background_summary: e.target.value })}
        />
      </Field>
      {draft.experiences.length > 0 && (
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium">Experience</p>
          <ul className="flex flex-col gap-2">
            {draft.experiences.map((exp, i) => (
              <li key={`${exp.title}-${i}`} className="flex items-start justify-between gap-3 rounded-xl bg-foam/60 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {exp.title} · {exp.organization}
                  </p>
                  <p className="text-xs text-mocha">
                    {[exp.start, exp.end].filter(Boolean).join(" – ")}
                    {exp.summary ? ` · ${exp.summary}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Remove experience"
                  onClick={() => set({ experiences: draft.experiences.filter((_, j) => j !== i) })}
                  className="text-mocha hover:text-berry"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function GoalFields({ draft, set, roleIdeas = [] }: FieldsProps & { roleIdeas?: string[] }) {
  return (
    <div className="grid gap-5">
      <Field label="Your career goal" hint="Be specific: it shapes who we suggest and what your notes say.">
        <Textarea
          rows={3}
          value={draft.career_goal}
          onChange={(e) => set({ career_goal: e.target.value })}
          placeholder="Land a product manager role at a Canadian bank or fintech after I graduate in 2026."
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Roles you're curious about">
          <TagInput
            value={draft.target_roles}
            onChange={(target_roles) => set({ target_roles })}
            placeholder="Product Manager, Data Scientist…"
            ideas={roleIdeas}
          />
        </Field>
        <Field label="Industries">
          <TagInput
            value={draft.target_industries}
            onChange={(target_industries) => set({ target_industries })}
            placeholder="Type and press Enter"
            ideas={INDUSTRY_IDEAS}
          />
        </Field>
        <Field label="Dream companies (optional)">
          <TagInput
            value={draft.target_companies}
            onChange={(target_companies) => set({ target_companies })}
            placeholder="RBC, Shopify, Deloitte…"
          />
        </Field>
        <Field label="Locations">
          <TagInput
            value={draft.target_locations}
            onChange={(target_locations) => set({ target_locations })}
            placeholder="Toronto, Remote…"
          />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">What do you want from coffee chats?</p>
        <div className="flex flex-wrap gap-2">
          {CHAT_GOAL_OPTIONS.map((goal) => {
            const on = draft.chat_goals.includes(goal);
            return (
              <button
                key={goal}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  set({ chat_goals: on ? draft.chat_goals.filter((g) => g !== goal) : [...draft.chat_goals, goal] })
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  on ? "border-crema bg-honey-soft text-crema-dark" : "border-latte bg-paper text-roast hover:bg-foam",
                )}
              >
                {goal}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Your LinkedIn account</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { premium: false, title: "Free", body: `Connection notes up to ${CONNECT_NOTE_LIMIT.free} characters` },
            { premium: true, title: "Premium", body: `Connection notes up to ${CONNECT_NOTE_LIMIT.premium} characters` },
          ].map((opt) => (
            <button
              key={opt.title}
              type="button"
              aria-pressed={draft.linkedin_premium === opt.premium}
              onClick={() => set({ linkedin_premium: opt.premium })}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                draft.linkedin_premium === opt.premium
                  ? "border-crema bg-honey-soft/60"
                  : "border-latte bg-paper hover:bg-foam",
              )}
            >
              <p className="text-sm font-medium">{opt.title}</p>
              <p className="text-xs text-mocha">{opt.body}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-foam/70 p-4">
        <p className="text-sm font-medium">Your networking OKR</p>
        <p className="mt-0.5 text-xs text-mocha">Objective: your career goal above. Key results we&apos;ll track for you:</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Reach out to … people per week">
            <Input
              type="number"
              min={1}
              max={50}
              value={draft.weekly_outreach_goal}
              onChange={(e) => set({ weekly_outreach_goal: Math.max(1, Number(e.target.value) || 1) })}
            />
          </Field>
          <Field label="Have … coffee chats per month">
            <Input
              type="number"
              min={1}
              max={30}
              value={draft.monthly_chat_goal}
              onChange={(e) => set({ monthly_chat_goal: Math.max(1, Number(e.target.value) || 1) })}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
