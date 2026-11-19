import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import { FadeIn } from "@/components/admin/admin-motion";
import { CommunicationsHub, type HubCustomer, type HubLogEntry } from "@/components/admin/communications-hub";
import type { MessageLogRow, ProfileRow } from "@/lib/database.types";
import { MESSAGE_CHANNELS } from "@/lib/message-templates";
import { isChannelConfigured } from "@/lib/messaging";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Communications" };

const dateFormat = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Johannesburg",
});

export default async function AdminCommunicationsPage() {
  const supabase = await createClient();

  const [customersRes, logRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name, phone, marketing_opt_in, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false })
      .overrideTypes<ProfileRow[], { merge: false }>(),
    supabase
      .from("message_log")
      .select("id, recipient_name, recipient_contact, channel, template, subject, body, status, error, created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .overrideTypes<MessageLogRow[], { merge: false }>(),
  ]);

  const customers: HubCustomer[] = (customersRes.data ?? []).map((c) => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "No name",
    email: c.email,
    phone: c.phone,
    optedIn: c.marketing_opt_in,
    joined: dateFormat.format(new Date(c.created_at)),
  }));

  const log: HubLogEntry[] = (logRes.data ?? []).map((m) => ({
    id: m.id,
    recipient: m.recipient_name ?? "Unknown",
    contact: m.recipient_contact,
    channel: m.channel,
    subject: m.subject,
    body: m.body,
    status: m.status,
    note: m.error,
    date: dateFormat.format(new Date(m.created_at)),
  }));

  const providers = MESSAGE_CHANNELS.map((c) => ({ ...c, connected: isChannelConfigured(c.id) }));

  return (
    <div className="px-4 py-6 sm:p-10">
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Marketing</p>
        <h1 className="mt-2 font-display text-4xl tracking-wide text-charcoal sm:text-6xl">Communications</h1>
        <p className="mt-1 text-sm text-charcoal/60 sm:text-base">
          {customers.length} registered {customers.length === 1 ? "customer" : "customers"} · send reminders, thank-yous
          and announcements.
        </p>
      </FadeIn>

      {customersRes.error ? (
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <AlertCircle className="size-5 shrink-0" />
          Couldn&apos;t load customers. Run supabase/migrations/004_customers_promos_referrals.sql in Supabase, then
          refresh.
        </div>
      ) : (
        <CommunicationsHub customers={customers} log={log} providers={providers} />
      )}
    </div>
  );
}
