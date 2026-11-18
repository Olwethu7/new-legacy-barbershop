"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import type { MessageChannel, ProfileRow } from "@/lib/database.types";
import { MAX_MESSAGE_LENGTH, MESSAGE_TEMPLATES, fillTemplate, isMessageChannel } from "@/lib/message-templates";
import { deliver, toE164 } from "@/lib/messaging";
import { whatsappBookingUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export type SendInput = {
  /** "all" = every customer who allows marketing messages. */
  recipients: "all" | string[];
  channel: MessageChannel;
  template: string;
  subject: string;
  body: string;
};

export type SendResult =
  | { ok: true; sent: number; queued: number; failed: number; skipped: number }
  | { ok: false; error: string };

const MAX_RECIPIENTS = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Deliveries run a few at a time so one send doesn't hammer the provider. */
const CHUNK = 8;

type Recipient = Pick<ProfileRow, "id" | "email" | "first_name" | "last_name" | "phone" | "marketing_opt_in">;

export async function sendMessage(input: SendInput): Promise<SendResult> {
  const admin = await requireAdmin();

  const channel = input?.channel;
  if (!isMessageChannel(channel)) return { ok: false, error: "Choose SMS, Email or WhatsApp." };

  const template = MESSAGE_TEMPLATES.some((t) => t.id === input?.template) ? input.template : "custom";
  const subject = String(input?.subject ?? "").trim().slice(0, 150);
  const body = String(input?.body ?? "").trim();
  if (body.length < 2) return { ok: false, error: "Type a message first." };
  if (body.length > MAX_MESSAGE_LENGTH) return { ok: false, error: `Keep the message under ${MAX_MESSAGE_LENGTH} characters.` };
  if (channel === "email" && !subject) return { ok: false, error: "Emails need a subject." };

  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, email, first_name, last_name, phone, marketing_opt_in")
    .eq("role", "customer")
    .limit(MAX_RECIPIENTS + 1);

  if (input.recipients !== "all") {
    const ids = Array.isArray(input.recipients) ? input.recipients.filter((id) => UUID.test(String(id))) : [];
    if (ids.length === 0) return { ok: false, error: "Select at least one customer." };
    query = query.in("id", ids.slice(0, MAX_RECIPIENTS));
  }

  const { data, error } = await query.overrideTypes<Recipient[], { merge: false }>();
  if (error) {
    console.error("sendMessage (recipients):", error.message);
    return { ok: false, error: "Couldn't load customers. Has supabase/migrations/004 been run?" };
  }
  if ((data ?? []).length > MAX_RECIPIENTS) {
    return { ok: false, error: `That's more than ${MAX_RECIPIENTS} people. Please send in smaller groups.` };
  }

  // Respect customers who switched marketing messages off in their account.
  const recipients = (data ?? []).filter((r) => r.marketing_opt_in);
  const skipped = (data ?? []).length - recipients.length;
  if (recipients.length === 0) {
    return { ok: false, error: skipped > 0 ? "Those customers have opted out of messages." : "No customers to send to." };
  }

  const batchId = crypto.randomUUID();
  const bookingLink = whatsappBookingUrl();
  const rows = [];

  for (let i = 0; i < recipients.length; i += CHUNK) {
    const chunk = recipients.slice(i, i + CHUNK);
    rows.push(
      ...(await Promise.all(
        chunk.map(async (r) => {
          const values = { firstName: r.first_name, bookingLink };
          const text = fillTemplate(body, values);
          const subj = fillTemplate(subject, values);
          const contact = channel === "email" ? r.email : toE164(r.phone);
          const result = contact
            ? await deliver(channel, contact, { subject: subj, body: text })
            : ({ status: "failed", error: channel === "email" ? "No email address" : "No valid phone number" } as const);

          return {
            batch_id: batchId,
            recipient_id: r.id,
            recipient_name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email,
            recipient_contact: contact ?? (channel === "email" ? r.email : r.phone),
            channel,
            template,
            subject: channel === "email" ? subj : null,
            body: text,
            status: result.status,
            provider_message_id: result.status === "sent" ? result.providerMessageId : null,
            error: result.status === "failed" ? result.error : result.status === "queued" ? result.reason : null,
            sent_by: admin.id,
          };
        }),
      )),
    );
  }

  const { error: logError } = await supabase.from("message_log").insert(rows);
  if (logError) console.error("sendMessage (log):", logError.message);

  revalidatePath("/admin/communications");
  return {
    ok: true,
    sent: rows.filter((r) => r.status === "sent").length,
    queued: rows.filter((r) => r.status === "queued").length,
    failed: rows.filter((r) => r.status === "failed").length,
    skipped,
  };
}
