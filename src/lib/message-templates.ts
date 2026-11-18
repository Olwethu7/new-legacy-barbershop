import type { MessageChannel } from "@/lib/database.types";

export const MESSAGE_CHANNELS: { id: MessageChannel; label: string }[] = [
  { id: "sms", label: "SMS" },
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp" },
];

export function isMessageChannel(value: unknown): value is MessageChannel {
  return value === "sms" || value === "email" || value === "whatsapp";
}

export type MessageTemplate = {
  id: string;
  label: string;
  subject: string;
  body: string;
};

/**
 * Starting points for the admin's messages. Placeholders are filled in per customer:
 *   {first_name}   the customer's first name (or "there")
 *   {booking_link} WhatsApp booking link
 */
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "we_miss_you",
    label: "We miss you",
    subject: "We miss you at New Legacy ✂️",
    body: "Hi {first_name}, we miss you at New Legacy! It's been a while, so it's time for a fresh cut. Book your slot on WhatsApp: {booking_link}",
  },
  {
    id: "thank_you",
    label: "Thank you for your visit",
    subject: "Thank you for your visit",
    body: "Hi {first_name}, thank you for your visit to New Legacy Barbershop! We hope you love the cut. See you next time. The Barber with SuperGlue.",
  },
  {
    id: "announcement",
    label: "Special announcement",
    subject: "Special announcement from New Legacy",
    body: "Hi {first_name}, we have some exciting news at New Legacy Barbershop: [your announcement here]. Book on WhatsApp: {booking_link}",
  },
  { id: "custom", label: "Custom message", subject: "", body: "" },
];

export const MAX_MESSAGE_LENGTH = 1000;

export function fillTemplate(text: string, values: { firstName: string | null; bookingLink: string }) {
  return text
    .replaceAll("{first_name}", values.firstName?.trim() || "there")
    .replaceAll("{booking_link}", values.bookingLink);
}
