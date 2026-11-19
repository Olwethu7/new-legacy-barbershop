"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, CircleDashed, Loader2, Mail, MessageSquare, Search, Send, Smartphone, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { sendMessage } from "@/lib/actions/communications";
import type { MessageChannel, MessageStatus } from "@/lib/database.types";
import { MAX_MESSAGE_LENGTH, MESSAGE_TEMPLATES, fillTemplate } from "@/lib/message-templates";
import { whatsappBookingUrl } from "@/lib/site";

export type HubCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  optedIn: boolean;
  joined: string;
};

export type HubLogEntry = {
  id: string;
  recipient: string;
  contact: string | null;
  channel: MessageChannel;
  subject: string | null;
  body: string;
  status: MessageStatus;
  note: string | null;
  date: string;
};

type Provider = { id: MessageChannel; label: string; connected: boolean };

const CHANNEL_ICONS: Record<MessageChannel, React.ComponentType<{ className?: string }>> = {
  sms: Smartphone,
  email: Mail,
  whatsapp: WhatsAppIcon,
};

const STATUS_STYLES: Record<MessageStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  sent: { label: "Sent", className: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2 },
  queued: { label: "Queued", className: "bg-amber-50 text-amber-800 ring-amber-200", icon: CircleDashed },
  failed: { label: "Failed", className: "bg-red-50 text-red-700 ring-red-200", icon: XCircle },
};

export function CommunicationsHub({
  customers,
  log,
  providers,
}: {
  customers: HubCustomer[];
  log: HubLogEntry[];
  providers: Provider[];
}) {
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<MessageChannel>("whatsapp");
  const [templateId, setTemplateId] = useState(MESSAGE_TEMPLATES[0].id);
  const [subject, setSubject] = useState(MESSAGE_TEMPLATES[0].subject);
  const [body, setBody] = useState(MESSAGE_TEMPLATES[0].body);
  const [sending, startSending] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => [c.name, c.email, c.phone].some((v) => v?.toLowerCase().includes(q)));
  }, [customers, search]);

  const optedIn = customers.filter((c) => c.optedIn);
  const recipientCount = audience === "all" ? optedIn.length : [...selected].filter((id) => optedIn.some((c) => c.id === id)).length;
  const provider = providers.find((p) => p.id === channel);
  const previewName = (audience === "selected" ? customers.find((c) => selected.has(c.id)) : optedIn[0])?.name.split(" ")[0] ?? "Sipho";

  function chooseTemplate(id: string) {
    const t = MESSAGE_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setSubject(t.subject);
    setBody(t.body);
  }

  function toggle(id: string) {
    setAudience("selected");
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSend() {
    if (recipientCount === 0) {
      toast.error(audience === "all" ? "No customers to send to yet." : "Select at least one customer.");
      return;
    }
    const who = audience === "all" ? `all ${recipientCount} customers` : `${recipientCount} customer${recipientCount === 1 ? "" : "s"}`;
    if (!window.confirm(`Send this ${provider?.label ?? channel} message to ${who}?`)) return;

    startSending(async () => {
      const result = await sendMessage({
        recipients: audience === "all" ? "all" : [...selected],
        channel,
        template: templateId,
        subject,
        body,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const parts = [
        result.sent && `${result.sent} sent`,
        result.queued && `${result.queued} queued (provider not connected)`,
        result.failed && `${result.failed} failed`,
        result.skipped && `${result.skipped} skipped (opted out)`,
      ].filter(Boolean);
      (result.failed ? toast.warning : toast.success)(parts.join(" · ") || "Done");
    });
  }

  return (
    <div className="mt-6 w-full min-w-0 max-w-full space-y-6 sm:mt-8 sm:space-y-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Recipients */}
        <section className="flex min-w-0 flex-col rounded-2xl border border-charcoal/10 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-3xl tracking-wide text-charcoal">
            <Users className="size-5 text-gold" /> Recipients
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-offwhite p-1" role="radiogroup" aria-label="Send to">
            {(["all", "selected"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={audience === value}
                onClick={() => setAudience(value)}
                className={`min-w-0 truncate rounded-full px-2 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
                  audience === value ? "bg-charcoal text-gold shadow" : "text-charcoal/60 hover:text-charcoal"
                }`}
              >
                {value === "all" ? `All customers (${optedIn.length})` : `Selected (${selected.size})`}
              </button>
            ))}
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-charcoal/35" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or phone"
              aria-label="Search customers"
              className="w-full rounded-xl border border-charcoal/15 bg-offwhite/60 py-2.5 pl-10 pr-4 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
          </div>

          {customers.length === 0 ? (
            <p className="mt-6 rounded-xl bg-offwhite p-6 text-center text-sm text-charcoal/55">
              No customers yet. They appear here once they register on the website.
            </p>
          ) : (
            <ul className="mt-4 max-h-[26rem] divide-y divide-charcoal/5 overflow-y-auto rounded-xl border border-charcoal/10">
              {filtered.map((c) => {
                const checked = audience === "all" ? c.optedIn : selected.has(c.id);
                return (
                  <li key={c.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors sm:px-4 hover:bg-gold/[0.04] ${
                        c.optedIn ? "" : "opacity-55"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!c.optedIn}
                        onChange={() => toggle(c.id)}
                        className="size-4 shrink-0 accent-[#c9a227]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-charcoal">{c.name}</span>
                        <span className="block truncate text-xs text-charcoal/55">
                          {[c.email, c.phone].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-right text-[0.7rem] text-charcoal/45 sm:block">
                        {c.optedIn ? `Joined ${c.joined}` : "Opted out"}
                      </span>
                    </label>
                  </li>
                );
              })}
              {filtered.length === 0 && <li className="p-4 text-center text-sm text-charcoal/50">No matches.</li>}
            </ul>
          )}
        </section>

        {/* Composer */}
        <section className="min-w-0 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-3xl tracking-wide text-charcoal">
            <MessageSquare className="size-5 text-gold" /> Message
          </h2>

          <fieldset className="mt-4">
            <legend className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/55">Delivery method</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {providers.map((p) => {
                const Icon = CHANNEL_ICONS[p.id];
                const active = channel === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setChannel(p.id)}
                    aria-pressed={active}
                    className={`flex min-w-[5.5rem] flex-1 basis-0 flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-all sm:text-sm ${
                      active
                        ? "border-gold bg-charcoal text-gold shadow-lg shadow-gold/10"
                        : "border-charcoal/10 text-charcoal/70 hover:border-gold/50"
                    }`}
                  >
                    <Icon className="size-5" />
                    {p.label}
                    <span className={`text-center text-[0.55rem] font-medium uppercase leading-tight sm:text-[0.6rem] sm:tracking-wider ${p.connected ? "text-emerald-500" : "text-charcoal/40"}`}>
                      {p.connected ? "Connected" : "Not connected"}
                    </span>
                  </button>
                );
              })}
            </div>
            {provider && !provider.connected && (
              <p className="mt-2 text-xs text-amber-700">
                {provider.label} isn&apos;t connected yet, so messages are saved to the log as &ldquo;Queued&rdquo; and not
                delivered.
              </p>
            )}
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/55">Template</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {MESSAGE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => chooseTemplate(t.id)}
                  aria-pressed={templateId === t.id}
                  className={`max-w-full rounded-full px-3 py-1.5 text-left text-xs font-medium ring-1 [overflow-wrap:anywhere] sm:px-4 sm:py-2 sm:text-sm ring-inset transition-colors ${
                    templateId === t.id ? "bg-gold text-charcoal ring-gold" : "text-charcoal/70 ring-charcoal/15 hover:ring-gold/60"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>

          {channel === "email" && (
            <div className="mt-5">
              <label htmlFor="msg-subject" className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/55">
                Subject
              </label>
              <input
                id="msg-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={150}
                className="mt-1.5 w-full rounded-xl border border-charcoal/15 bg-offwhite/60 px-4 py-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
            </div>
          )}

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="msg-body" className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/55">
                Message
              </label>
              <span className={`text-xs tabular-nums ${body.length > MAX_MESSAGE_LENGTH ? "text-red-600" : "text-charcoal/45"}`}>
                {body.length}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
            <textarea
              id="msg-body"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (templateId !== "custom" && !MESSAGE_TEMPLATES.some((t) => t.body === e.target.value)) setTemplateId("custom");
              }}
              rows={6}
              placeholder="Type your message…"
              className="mt-1.5 block w-full min-w-0 max-w-full resize-y rounded-xl border border-charcoal/15 bg-offwhite/60 px-4 py-3 text-sm leading-relaxed focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
            <p className="mt-1 text-xs text-charcoal/45">
              Use <code className="rounded bg-offwhite px-1">{"{first_name}"}</code> and{" "}
              <code className="rounded bg-offwhite px-1">{"{booking_link}"}</code> to personalise.
            </p>
          </div>

          {body.trim() && (
            <div className="mt-5 rounded-xl bg-charcoal p-4 text-sm leading-relaxed text-offwhite/85">
              <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gold">Preview</p>
              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                {fillTemplate(body, { firstName: previewName, bookingLink: whatsappBookingUrl() })}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !body.trim() || body.length > MAX_MESSAGE_LENGTH}
            className="btn-luxe mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-4 py-4 text-sm font-semibold sm:px-6 sm:text-base text-charcoal hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
            {sending ? "Sending…" : `Send to ${recipientCount} ${recipientCount === 1 ? "customer" : "customers"}`}
          </button>
        </section>
      </div>

      {/* Log */}
      <section className="min-w-0 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-display text-3xl tracking-wide text-charcoal">Message Log</h2>
        <p className="text-sm text-charcoal/55">The last 100 messages.</p>
        {log.length === 0 ? (
          <p className="mt-6 rounded-xl bg-offwhite p-6 text-center text-sm text-charcoal/55">Nothing sent yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-charcoal/5 sm:mt-5">
            {log.map((m) => {
              const Icon = CHANNEL_ICONS[m.channel];
              const status = STATUS_STYLES[m.status];
              const StatusIcon = status.icon;
              return (
                <li key={m.id} className="flex items-start gap-3 py-4 sm:gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-charcoal text-gold sm:size-9">
                    <Icon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-charcoal">
                        <span className="[overflow-wrap:anywhere]">{m.recipient}</span>
                        {m.contact && (
                          <span className="block text-xs font-normal text-charcoal/50 [overflow-wrap:anywhere] sm:ml-2 sm:inline sm:text-sm">
                            {m.contact}
                          </span>
                        )}
                      </p>
                      {m.subject && <p className="[overflow-wrap:anywhere] text-sm font-medium text-charcoal/80">{m.subject}</p>}
                      <p className="line-clamp-2 text-sm text-charcoal/60 [overflow-wrap:anywhere]">{m.body}</p>
                      {m.note && <p className="mt-0.5 [overflow-wrap:anywhere] text-xs text-charcoal/45">{m.note}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 sm:flex-col sm:items-end sm:gap-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.className}`}>
                        <StatusIcon className="size-3.5" />
                        {status.label}
                      </span>
                      <span className="text-xs text-charcoal/45">{m.date}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
