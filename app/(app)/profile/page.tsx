"use client";

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
import { Button, Card, ErrorNote, PageHeader } from "@/components/ui";
import { track } from "@/lib/client";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function ProfilePage() {
  const { profile, setProfile } = useProfile();
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(profile!));
  const [roleIdeas, setRoleIdeas] = useState<string[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<ProfileDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaved(false);
  };

  async function save() {
    setSaving(true);
    setError(null);
    const { data, error } = await createClient()
      .from("profiles")
      .update(draft)
      .eq("id", profile!.id)
      .select("*")
      .single<Profile>();
    setSaving(false);
    if (error || !data) return setError("Couldn't save. Please try again.");
    setProfile(data);
    setSaved(true);
    track("profile_updated");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Your profile"
        subtitle="Everything here shapes who we suggest and how your messages sound."
        actions={
          <Button variant="secondary" onClick={() => setShowImport(!showImport)}>
            {showImport ? "Cancel" : "Re-import resume"}
          </Button>
        }
      />
      {showImport && (
        <Card className="mb-6">
          <ResumeImport
            onParsed={(r) => {
              setDraft((d) => mergeResume(d, r));
              setRoleIdeas(r.suggested_roles);
              setShowImport(false);
              setSaved(false);
            }}
          />
        </Card>
      )}
      <Card className="mb-6">
        <h2 className="mb-4 font-semibold">About you</h2>
        <AboutFields draft={draft} set={set} />
      </Card>
      <Card className="mb-6">
        <h2 className="mb-4 font-semibold">Goals</h2>
        <GoalFields draft={draft} set={set} roleIdeas={roleIdeas} />
      </Card>
      <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-2xl border border-latte bg-paper/95 p-3 backdrop-blur">
        <ErrorNote message={error} />
        {saved && <span className="text-sm text-sage">Saved</span>}
        <Button onClick={save} loading={saving}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
