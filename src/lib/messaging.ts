// Server-only delivery for the admin Communications hub.
// Each channel switches on by itself once its keys are in .env.local; until then
// messages are logged with status "queued" so nothing is lost.
//
//   Email    RESEND_API_KEY, EMAIL_FROM            (e.g. "New Legacy <hello@yourdomain.co.za>")
//   SMS      TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM       (e.g. "+15017122661")
//   WhatsApp TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM  (e.g. "+14155238886")

import type { MessageChannel } from "@/lib/database.types";

export type DeliveryResult =
  | { status: "sent"; providerMessageId: string | null }
  | { status: "queued"; reason: string }
  | { status: "failed"; error: string };

const env = (name: string) => process.env[name]?.trim() || "";

export function isChannelConfigured(channel: MessageChannel) {
  if (channel === "email") return Boolean(env("RESEND_API_KEY") && env("EMAIL_FROM"));
  const twilio = Boolean(env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN"));
  return channel === "sms" ? twilio && Boolean(env("TWILIO_SMS_FROM")) : twilio && Boolean(env("TWILIO_WHATSAPP_FROM"));
}

/** South African numbers to E.164: "071 234 5678" → "+27712345678". Returns null if it can't be a phone number. */
export function toE164(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  let e164: string;
  if (phone.trim().startsWith("+")) e164 = `+${digits}`;
  else if (digits.startsWith("27")) e164 = `+${digits}`;
  else if (digits.startsWith("0") && digits.length === 10) e164 = `+27${digits.slice(1)}`;
  else return null;
  return /^\+\d{9,15}$/.test(e164) ? e164 : null;
}

export async function deliver(
  channel: MessageChannel,
  to: string,
  message: { subject: string; body: string },
): Promise<DeliveryResult> {
  if (!isChannelConfigured(channel)) {
    return { status: "queued", reason: "Provider not connected yet" };
  }
  try {
    return channel === "email" ? await sendEmail(to, message) : await sendTwilio(channel, to, message.body);
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** https://resend.com/docs/api-reference/emails/send-email */
async function sendEmail(to: string, { subject, body }: { subject: string; body: string }): Promise<DeliveryResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env("EMAIL_FROM"), to: [to], subject: subject || "New Legacy Barbershop", text: body }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  return res.ok
    ? { status: "sent", providerMessageId: json.id ?? null }
    : { status: "failed", error: json.message ?? `Resend error ${res.status}` };
}

/** https://www.twilio.com/docs/messaging/api/message-resource#create-a-message-resource */
async function sendTwilio(channel: "sms" | "whatsapp", to: string, body: string): Promise<DeliveryResult> {
  const sid = env("TWILIO_ACCOUNT_SID");
  const from = channel === "sms" ? env("TWILIO_SMS_FROM") : `whatsapp:${env("TWILIO_WHATSAPP_FROM")}`;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${env("TWILIO_AUTH_TOKEN")}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: channel === "sms" ? to : `whatsapp:${to}`, From: from, Body: body }),
  });
  const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
  return res.ok
    ? { status: "sent", providerMessageId: json.sid ?? null }
    : { status: "failed", error: json.message ?? `Twilio error ${res.status}` };
}
