import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import { FadeIn } from "@/components/admin/admin-motion";
import { PromoCodeManager, type AdminPromo } from "@/components/admin/promo-code-manager";
import type { PromoCodeRow } from "@/lib/database.types";
import { promoState, shortDate } from "@/lib/promo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Promo Codes" };

type Row = PromoCodeRow & { owner: { first_name: string | null; last_name: string | null; email: string | null } | null };

export default async function AdminPromoCodesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*, owner:profiles!promo_codes_owner_id_fkey(first_name, last_name, email)")
    .order("created_at", { ascending: false })
    .overrideTypes<Row[], { merge: false }>();

  const promos: AdminPromo[] = (data ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    percent: p.discount_percent,
    expires: p.expires_at ? shortDate.format(new Date(p.expires_at)) : null,
    uses: p.uses,
    maxUses: p.max_uses,
    active: p.active,
    state: promoState(p),
    source: p.source,
    owner: p.owner ? [p.owner.first_name, p.owner.last_name].filter(Boolean).join(" ") || p.owner.email : null,
  }));

  return (
    <div className="px-4 py-6 sm:p-10">
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Marketing</p>
        <h1 className="mt-2 font-display text-4xl tracking-wide text-charcoal sm:text-6xl">Promo Codes</h1>
        <p className="mt-1 text-charcoal/60">
          Create discount codes for the shop. Referral reward codes are created automatically when a customer reaches 5 shop referral points.
        </p>
      </FadeIn>

      {error ? (
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <AlertCircle className="size-5 shrink-0" />
          Couldn&apos;t load promo codes. Run supabase/migrations/004_customers_promos_referrals.sql in Supabase, then
          refresh.
        </div>
      ) : (
        <PromoCodeManager promos={promos} />
      )}
    </div>
  );
}
