import type { Metadata } from "next";
import { AlertCircle, BadgeCheck, Scissors, Users } from "lucide-react";
import { FadeIn } from "@/components/admin/admin-motion";
import { RedeemServiceButton, ReferralConfirm } from "@/components/admin/referral-confirm";
import type { ProfileRow, ReferralClaimRow } from "@/lib/database.types";
import { REFERRAL_SERVICE_PERCENT } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Referrals" };

const dateFormat = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Johannesburg",
});

type Person = Pick<ProfileRow, "first_name" | "last_name" | "email"> | null;
type ClaimWithPeople = ReferralClaimRow & { friend: Person; referrer: Person };

const nameOf = (p: Person) => (p ? [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Unknown" : "Unknown");

export default async function AdminReferralsPage() {
  const supabase = await createClient();

  const [claimedRes, pointsRes, eligibleRes, recentRes] = await Promise.all([
    supabase.from("referral_claims").select("id", { count: "exact", head: true }).not("claimed_at", "is", null),
    supabase.from("referrals").select("id", { count: "exact", head: true }).not("point_awarded_at", "is", null),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone")
      .eq("eligible_for_service_discount", true)
      .order("first_name")
      .overrideTypes<Pick<ProfileRow, "id" | "first_name" | "last_name" | "email" | "phone">[], { merge: false }>(),
    supabase
      .from("referral_claims")
      .select(
        "*, friend:profiles!referral_claims_referred_id_fkey(first_name, last_name, email), referrer:profiles!referral_claims_referrer_id_fkey(first_name, last_name, email)",
      )
      .not("claimed_at", "is", null)
      .order("claimed_at", { ascending: false })
      .limit(20)
      .overrideTypes<ClaimWithPeople[], { merge: false }>(),
  ]);

  const failed = claimedRes.error || pointsRes.error || eligibleRes.error || recentRes.error;
  const eligible = eligibleRes.data ?? [];
  const recent = recentRes.data ?? [];

  const stats = [
    { label: "Referrals claimed in-store", value: claimedRes.count ?? 0, icon: BadgeCheck },
    { label: "Points awarded (all)", value: pointsRes.count ?? 0, icon: Users },
    { label: "Haircut rewards waiting", value: eligible.length, icon: Scissors },
  ];

  return (
    <div className="px-4 py-6 sm:p-10">
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Marketing</p>
        <h1 className="mt-2 font-display text-4xl tracking-wide text-charcoal sm:text-6xl">Referrals</h1>
        <p className="mt-1 text-sm text-charcoal/60 sm:text-base">
          Confirm in-store referrals. Every 5 points earns the referrer a 10% shop code and{" "}
          {REFERRAL_SERVICE_PERCENT}% off their next haircut.
        </p>
      </FadeIn>

      {failed ? (
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <AlertCircle className="size-5 shrink-0" />
          Couldn&apos;t load referrals. Run supabase/migrations/005_referral_points.sql in Supabase, then refresh.
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <dl className="grid grid-cols-3 gap-3 sm:gap-5">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="min-w-0 rounded-2xl border border-charcoal/10 bg-white p-3 shadow-sm sm:p-5">
                <dt className="flex items-start gap-1.5 text-[0.65rem] font-semibold uppercase leading-tight tracking-wider text-charcoal/50 sm:text-xs">
                  <Icon className="hidden size-4 shrink-0 text-gold sm:block" />
                  {label}
                </dt>
                <dd className="mt-2 font-display text-4xl leading-none text-charcoal sm:text-5xl">{value}</dd>
              </div>
            ))}
          </dl>

          <ReferralConfirm />

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Haircut rewards */}
            <section className="rounded-2xl border border-charcoal/10 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-3xl tracking-wide text-charcoal">
                <Scissors className="size-5 text-gold" /> Haircut Rewards
              </h2>
              <p className="text-sm text-charcoal/55">
                Customers with {REFERRAL_SERVICE_PERCENT}% off their next cut. Mark it used once applied.
              </p>
              {eligible.length === 0 ? (
                <p className="mt-5 rounded-xl bg-offwhite p-6 text-center text-sm text-charcoal/55">No rewards waiting.</p>
              ) : (
                <ul className="mt-4 divide-y divide-charcoal/5">
                  {eligible.map((p) => {
                    const name = nameOf(p);
                    return (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-charcoal">{name}</p>
                          <p className="truncate text-xs text-charcoal/50">{[p.phone, p.email].filter(Boolean).join(" · ")}</p>
                        </div>
                        <RedeemServiceButton profileId={p.id} name={name} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Recent confirmations */}
            <section className="rounded-2xl border border-charcoal/10 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="font-display text-3xl tracking-wide text-charcoal">Recently Confirmed</h2>
              <p className="text-sm text-charcoal/55">The last 20 in-store referrals.</p>
              {recent.length === 0 ? (
                <p className="mt-5 rounded-xl bg-offwhite p-6 text-center text-sm text-charcoal/55">Nothing confirmed yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-charcoal/5">
                  {recent.map((c) => (
                    <li key={c.id} className="py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="font-mono text-sm font-bold tracking-wider text-charcoal">{c.code}</span>
                        <span className="text-xs text-charcoal/45">{dateFormat.format(new Date(c.claimed_at!))}</span>
                      </div>
                      <p className="mt-0.5 break-words text-sm text-charcoal/65">
                        {nameOf(c.friend)} <span className="text-charcoal/40">referred by</span> {nameOf(c.referrer)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
