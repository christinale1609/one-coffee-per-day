"use client";

import { ArrowLeft, ExternalLink, PartyPopper, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useProfile } from "@/components/app-shell";
import { MessageComposer } from "@/components/message-composer";
import { PrepBrief } from "@/components/prep-brief";
import { StatusSelect, updateStatus } from "@/components/status-select";
import { Badge, Button, Card, Field, Input, Spinner, Textarea } from "@/components/ui";
import { daysSince, firstName, track } from "@/lib/client";
import { displayName, maskName } from "@/lib/privacy";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/lib/types";

export default function ContactPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useProfile();
  const [contact, setContact] = useState<Contact | null | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    void createClient()
      .from("contacts")
      .select("*")
      .eq("id", id)
      .maybeSingle<Contact>()
      .then(({ data }) => {
        setContact(data ?? null);
        setNotes(data?.notes ?? "");
      });
  }, [id]);

  if (contact === undefined) return <Spinner label="Loading…" />;
  if (contact === null) {
    return (
      <Card className="text-center">
        <p>We couldn&apos;t find that contact.</p>
        <Link href="/tracker" className="text-sm text-crema-dark hover:underline">
          Back to tracker
        </Link>
      </Card>
    );
  }

  const c = contact;
  const premium = profile!.linkedin_premium;

  async function save(patch: Partial<Contact>) {
    const { data } = await createClient().from("contacts").update(patch).eq("id", c.id).select("*").single<Contact>();
    if (data) setContact(data);
  }

  async function moveTo(status: Contact["status"]) {
    setMoving(true);
    const next = await updateStatus(c, status);
    setMoving(false);
    if (next) setContact(next);
  }

  async function remove() {
    if (!confirm(`Remove ${c.full_name} from your tracker?`)) return;
    await createClient().from("contacts").delete().eq("id", c.id);
    track("contact_deleted", { status: c.status });
    router.replace("/tracker");
  }

  const waited = daysSince(c.reached_out_at);
  const name = firstName(c.full_name);

  return (
    <div>
      <Link href="/tracker" className="mb-4 inline-flex items-center gap-1 text-sm text-mocha hover:text-espresso">
        <ArrowLeft className="size-4" aria-hidden /> Tracker
      </Link>

      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">{displayName(c.full_name)}</h1>
            <p className="text-sm text-roast">{c.headline}</p>
            <p className="text-xs text-mocha">{[c.company, c.location].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusSelect contact={c} onChange={setContact} />
            {c.linkedin_url && (
              <a
                href={c.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("linkedin_opened", { from: "contact" })}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-latte px-3 text-sm hover:bg-foam"
              >
                LinkedIn <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
            <Button size="sm" variant="danger" onClick={remove} aria-label="Remove contact">
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          {c.status === "to_reach_out" && (
            <Card>
              <MessageComposer contact={c} kind="connect" premium={premium} onContactChange={setContact} />
            </Card>
          )}

          {c.status === "reached_out" && (
            <>
              <Card className="bg-sky-soft/50">
                <p className="text-sm">
                  You reached out {waited === 0 ? "today" : `${waited} day${waited === 1 ? "" : "s"} ago`}.
                  {waited !== null && waited >= 7
                    ? " No reply yet? That's normal. Many people only check LinkedIn weekly."
                    : " Replies often take a few days."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="accent" onClick={() => moveTo("accepted")} loading={moving}>
                    <PartyPopper className="size-4" aria-hidden /> {name} said yes to a chat
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => moveTo("no_response")}>
                    Mark as no response
                  </Button>
                </div>
              </Card>
              <Card>
                <MessageComposer contact={c} kind="follow_up" premium={premium} />
              </Card>
            </>
          )}

          {c.status === "accepted" && <PrepBrief contact={c} onContactChange={setContact} />}

          {c.status === "completed" && (
            <>
              <Card>
                <MessageComposer contact={c} kind="thank_you" premium={premium} />
              </Card>
              {c.research && <PrepBrief contact={c} onContactChange={setContact} />}
            </>
          )}

          {(c.status === "no_response" || c.status === "declined") && (
            <Card className="text-sm text-roast">
              No worries, it happens to everyone. You can move {name} back into your pipeline any time from the status menu.
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          {(c.why || c.shared_ground.length > 0) && (
            <Card>
              <h2 className="mb-2 text-sm font-semibold">Why {name}</h2>
              {c.shared_ground.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {c.shared_ground.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              )}
              <p className="text-sm leading-relaxed text-roast">{maskName(c.why, c.full_name)}</p>
              {c.conversation_hook && (
                <p className="mt-2 text-xs text-mocha">
                  <span className="font-medium text-roast">Ask about:</span> {maskName(c.conversation_hook, c.full_name)}
                </p>
              )}
            </Card>
          )}

          {(c.status === "accepted" || c.status === "completed") && (
            <Card>
              <Field label="Chat date">
                <Input
                  type="datetime-local"
                  defaultValue={c.chat_date ? toLocalInput(c.chat_date) : ""}
                  onBlur={(e) => save({ chat_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </Field>
              {c.status === "accepted" && (
                <Button className="mt-3 w-full" variant="secondary" onClick={() => moveTo("completed")} loading={moving}>
                  We had our chat ☕
                </Button>
              )}
            </Card>
          )}

          <Card>
            <Field label="Your notes" hint="Private. Saved when you click away. Used to personalize your thank-you note.">
              <Textarea
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => notes !== c.notes && save({ notes })}
                placeholder="How you met, what you talked about, follow-ups…"
              />
            </Field>
          </Card>

          <Card>
            <h2 className="mb-2 text-sm font-semibold">Timeline</h2>
            <ul className="flex flex-col gap-1 text-xs text-mocha">
              <TimelineItem label="Added" at={c.created_at} />
              <TimelineItem label="Reached out" at={c.reached_out_at} />
              <TimelineItem label="Chat accepted" at={c.accepted_at} />
              <TimelineItem label="Chat done" at={c.completed_at} />
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function TimelineItem({ label, at }: { label: string; at: string | null }) {
  if (!at) return null;
  return (
    <li className="flex justify-between">
      <span>{label}</span>
      <span>{new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
    </li>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}
