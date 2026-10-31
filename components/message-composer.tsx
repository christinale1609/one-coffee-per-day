"use client";

import { Check, Copy, ExternalLink, RefreshCw, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, cn, ErrorNote, Select, Spinner, Textarea } from "@/components/ui";
import { postJSON, track } from "@/lib/client";
import { messageLimit } from "@/lib/messages";
import { createClient } from "@/lib/supabase/client";
import type { Contact, MessageKind, MessageVariant } from "@/lib/types";

const KIND_COPY: Record<MessageKind, { title: string; hint: string }> = {
  connect: { title: "Connection note", hint: "Paste this into “Add a note” when you click Connect." },
  follow_up: { title: "Ask for the chat", hint: "Send this as a LinkedIn message now that you're connected." },
  thank_you: { title: "Thank-you note", hint: "Send within a day of your chat. Add your notes below first for a more specific message." },
};

export function MessageComposer({
  contact,
  kind,
  premium,
  autoGenerate = false,
  onContactChange,
}: {
  contact: Contact;
  kind: MessageKind;
  premium: boolean;
  autoGenerate?: boolean;
  onContactChange?: (c: Contact) => void;
}) {
  const limit = messageLimit(kind, premium);
  const [tone, setTone] = useState("warm");
  const [variants, setVariants] = useState<MessageVariant[]>([]);
  const [text, setText] = useState(kind === "connect" ? contact.message_draft : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [marking, setMarking] = useState(false);
  const started = useRef(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const data = await postJSON<{ variants: MessageVariant[] }>("/api/messages", {
        contactId: contact.id,
        kind,
        tone,
      });
      setVariants(data.variants);
      setText(data.variants[0]?.text ?? "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoGenerate && !started.current && !contact.message_draft) {
      started.current = true;
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate]);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    track("message_copied", { kind, edited: !variants.some((v) => v.text === text) });
    if (kind === "connect" && text !== contact.message_draft) {
      const { data } = await createClient()
        .from("contacts")
        .update({ message_draft: text })
        .eq("id", contact.id)
        .select("*")
        .single<Contact>();
      if (data) onContactChange?.(data);
    }
  }

  async function markSent() {
    setMarking(true);
    const { data } = await createClient()
      .from("contacts")
      .update({ status: "reached_out", message_draft: text })
      .eq("id", contact.id)
      .select("*")
      .single<Contact>();
    setMarking(false);
    if (data) {
      track("status_changed", { from: contact.status, to: "reached_out", via: "composer" });
      onContactChange?.(data);
    }
  }

  const over = text.length > limit;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{KIND_COPY[kind].title}</p>
          <p className="text-xs text-mocha">{KIND_COPY[kind].hint}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={tone} onChange={(e) => setTone(e.target.value)} className="h-8 w-auto text-xs" aria-label="Tone">
            <option value="warm">Warm</option>
            <option value="concise">Concise</option>
            <option value="professional">Professional</option>
          </Select>
          <Button size="sm" variant="secondary" onClick={generate} loading={loading}>
            {variants.length || text ? <RefreshCw className="size-3.5" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
            {variants.length || text ? "New drafts" : "Draft with AI"}
          </Button>
        </div>
      </div>

      {loading && variants.length === 0 && <Spinner label="Writing three options…" />}

      {variants.length > 1 && (
        <div className="grid gap-2 md:grid-cols-3">
          {variants.map((v) => (
            <button
              key={v.text}
              type="button"
              onClick={() => setText(v.text)}
              className={cn(
                "rounded-xl border p-3 text-left text-xs leading-relaxed transition-colors",
                text === v.text ? "border-crema bg-honey-soft/50" : "border-latte bg-paper hover:bg-foam",
              )}
            >
              <span className="mb-1 block font-semibold text-crema-dark">{v.angle}</span>
              <span className="text-roast">{v.text}</span>
            </button>
          ))}
        </div>
      )}

      <div>
        <Textarea
          rows={kind === "connect" ? 4 : 6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={loading ? "" : "Draft with AI, or write your own…"}
          aria-label={KIND_COPY[kind].title}
        />
        <p className={cn("mt-1 text-right text-xs", over ? "font-semibold text-berry" : "text-mocha")}>
          {text.length}/{limit}
          {over && " · too long for LinkedIn"}
        </p>
      </div>

      <ErrorNote message={error} />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={copy} disabled={!text || over}>
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </Button>
        {contact.linkedin_url && (
          <a
            href={contact.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("linkedin_opened", { from: kind })}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-latte bg-paper px-3 text-sm font-medium hover:bg-foam"
          >
            <ExternalLink className="size-3.5" aria-hidden /> Open LinkedIn
          </a>
        )}
        {kind === "connect" && contact.status === "to_reach_out" && (
          <Button size="sm" variant="accent" onClick={markSent} loading={marking} disabled={!text}>
            <Send className="size-3.5" aria-hidden /> I sent it
          </Button>
        )}
      </div>
    </div>
  );
}
