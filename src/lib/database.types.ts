// Row types for the tables added in supabase/migrations/004_customers_promos_referrals.sql.
// Keep these in sync with the SQL. (To generate them automatically instead:
// `npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts`.)

export type ProfileRole = "customer" | "admin";

export type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: ProfileRole;
  referral_code: string;
  referred_by: string | null;
  marketing_opt_in: boolean;
  created_at: string;
};

export type PromoSource = "admin" | "referral";

export type PromoCodeRow = {
  id: string;
  code: string;
  discount_percent: number;
  /** Null = never expires. */
  expires_at: string | null;
  /** Null = unlimited. */
  max_uses: number | null;
  uses: number;
  active: boolean;
  /** Set for personal codes (referral rewards): only this customer can redeem it. */
  owner_id: string | null;
  source: PromoSource;
  created_at: string;
};

export type ReferralRow = {
  id: string;
  referrer_id: string;
  referred_id: string;
  reward_promo_id: string | null;
  created_at: string;
};

export type MessageChannel = "sms" | "email" | "whatsapp";
export type MessageStatus = "queued" | "sent" | "failed";

export type MessageLogRow = {
  id: string;
  batch_id: string;
  recipient_id: string | null;
  recipient_name: string | null;
  recipient_contact: string | null;
  channel: MessageChannel;
  template: string | null;
  subject: string | null;
  body: string;
  status: MessageStatus;
  provider_message_id: string | null;
  error: string | null;
  sent_by: string | null;
  created_at: string;
};

/** Columns added to `orders` by migration 004 (on top of the original ones). */
export type OrderRow = {
  id: string;
  customer_name: string;
  phone: string;
  items: unknown;
  subtotal: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  created_at: string;
  customer_id: string | null;
  promo_code: string | null;
  discount: number;
  total: number | null;
};

/** `gallery` gains an optional price, shown on hover next to the caption (the cut's name). */
export type GalleryRow = {
  id: string;
  image_url: string;
  caption: string | null;
  price: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
};
