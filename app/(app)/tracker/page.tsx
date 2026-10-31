"use client";

import { CalendarDays, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { StatusSelect } from "@/components/status-select";
import { Badge, Button, Card, ErrorNote, Field, Input, PageHeader, Spinner, Textarea } from "@/components/ui";
import { daysSince, track } from "@/lib/client";
import { CLOSED, PIPELINE, statusLabel } from "@/lib/constants";
import { canonicalLinkedinUrl } from "@/lib/linkedin";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/lib/types";

export default function TrackerPage() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void createClient()
      .from("contacts")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => setContacts((data as Contact[]) ?? []));
  }, []);

  const replace = (c: Contact) => setContacts((prev) => prev?.map((x) => (x.id === c.id ? c : x)) ?? null);

  if (!contacts) return <Spinner label="Loading your tracker…" />;

  const closed = contacts.filter((c) => CLOSED.includes(c.status));

  return (
    <div>
      <PageHeader
        title="Tracker"
        subtitle="Everyone you're reaching out to, from first note to thank-you."
        actions={
          <>
            <Button variant="secondary" onClick={() => setAdding(!adding)}>
              <Plus className="size-4" aria-hidden /> Add someone you know
            </Button>
            <Link
              href="/discover"
              className="inline-flex h-10 items-center rounded-full bg-espresso px-4 text-sm font-medium text-cream hover:bg-roast"
            >
              Find people
            </Link>
          </>
        }
      />

      {adding && (
        <AddContactForm
          onAdded={(c) => {
            setContacts((prev) => [c, ...(prev ?? [])]);
            setAdding(false);
          }}
        />
      )}

      {contacts.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="font-display text-xl font-semibold">Your tracker is empty</p>
          <p className="mt-1 text-sm text-mocha">Pick people on Find people and they&apos;ll show up here.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {PIPELINE.map((status) => {
            const items = contacts.filter((c) => c.status === status);
            return (
              <section key={status} className="rounded-2xl bg-foam/60 p-3">
                <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">
                  {statusLabel(status)}
                  <span className="rounded-full bg-paper px-2 text-xs font-medium text-mocha">{items.length}</span>
                </h2>
                <div className="flex flex-col gap-2">
                  {items.map((c) => (
                    <ContactCard key={c.id} contact={c} onChange={replace} />
                  ))}
                  {items.length === 0 && <p className="px-1 py-4 text-center text-xs text-mocha">Nobody here yet</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {closed.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-mocha">Closed ({closed.length})</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {closed.map((c) => (
              <ContactCard key={c.id} contact={c} onChange={replace} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ContactCard({ contact: c, onChange }: { contact: Contact; onChange: (c: Contact) => void }) {
  const waited = daysSince(c.reached_out_at);
  const needsNudge = c.status === "reached_out" && waited !== null && waited >= 7;
  const needsPrep = c.status === "accepted" && !c.research;

  return (
    <div className="rounded-xl border border-latte bg-paper p-3">
      <Link href={`/contacts/${c.id}`} className="block">
        <p className="font-medium leading-snug hover:underline">{c.full_name}</p>
        <p className="line-clamp-2 text-xs text-mocha">{c.headline || c.company}</p>
      </Link>
      <div className="mt-2 flex flex-wrap gap-1">
        {c.source === "manual" && <Badge tone="muted">Added by you</Badge>}
        {needsNudge && <Badge tone="accent">Follow up?</Badge>}
        {needsPrep && <Badge tone="info">Prep ready to go</Badge>}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs text-mocha">
          {c.chat_date ? (
            <>
              <CalendarDays className="size-3" aria-hidden />
              {new Date(c.chat_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </>
          ) : waited !== null && c.status === "reached_out" ? (
            <>
              <Clock className="size-3" aria-hidden /> {waited === 0 ? "Today" : `${waited}d ago`}
            </>
          ) : null}
        </span>
        <StatusSelect contact={c} onChange={onChange} />
      </div>
    </div>
  );
}

function AddContactForm({ onAdded }: { onAdded: (c: Contact) => void }) {
  const [form, setForm] = useState({ full_name: "", linkedin_url: "", headline: "", company: "", why: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const url = form.linkedin_url.trim() ? canonicalLinkedinUrl(form.linkedin_url) : "";
    if (url === null) return setError("That doesn't look like a linkedin.com/in/… profile link.");
    setSaving(true);
    const { data, error } = await createClient()
      .from("contacts")
      .insert({ ...form, linkedin_url: url, source: "manual" })
      .select("*")
      .single<Contact>();
    setSaving(false);
    if (error || !data) return setError("Couldn't add them. Please try again.");
    track("contact_added_manually");
    onAdded(data);
  }

  return (
    <Card className="mb-6">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        </Field>
        <Field label="LinkedIn profile URL">
          <Input
            value={form.linkedin_url}
            onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
            placeholder="https://www.linkedin.com/in/…"
          />
        </Field>
        <Field label="Title">
          <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
        </Field>
        <Field label="Company">
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </Field>
        <Field label="How you know them / why you want to talk" className="sm:col-span-2">
          <Textarea rows={2} value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })} />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" loading={saving}>
            Add to tracker
          </Button>
          <ErrorNote message={error} />
        </div>
      </form>
    </Card>
  );
}
