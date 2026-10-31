"use client";

import { useState } from "react";
import { cn, Select } from "@/components/ui";
import { track } from "@/lib/client";
import { CONTACT_STATUSES, type ContactStatus } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/lib/types";

export const CHAT_COMPLETED_EVENT = "ocpd:chat-completed";

export async function updateStatus(contact: Contact, status: ContactStatus): Promise<Contact | null> {
  const { data } = await createClient()
    .from("contacts")
    .update({ status })
    .eq("id", contact.id)
    .select("*")
    .single<Contact>();
  if (!data) return null;
  track("status_changed", { from: contact.status, to: status });
  // The app shell listens for this to ask for an NPS score after a first chat.
  if (status === "completed") window.dispatchEvent(new Event(CHAT_COMPLETED_EVENT));
  return data;
}

export function StatusSelect({
  contact,
  onChange,
  className,
}: {
  contact: Contact;
  onChange: (c: Contact) => void;
  className?: string;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <Select
      aria-label={`Status for ${contact.full_name}`}
      value={contact.status}
      disabled={saving}
      onClick={(e) => e.stopPropagation()}
      onChange={async (e) => {
        setSaving(true);
        const next = await updateStatus(contact, e.target.value as ContactStatus);
        setSaving(false);
        if (next) onChange(next);
      }}
      className={cn("h-8 w-auto text-xs", className)}
    >
      {CONTACT_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </Select>
  );
}
