import type { Metadata } from "next";
import { AlertCircle, BadgeCheck, Scissors, ShoppingBag } from "lucide-react";
import { FadeIn } from "@/components/admin/admin-motion";
import { RedeemServiceButton, ReferralConfirm } from "@/components/admin/referral-confirm";
import type { ProfileRow, ReferralClaimRow } from "@/lib/database.types";
import {
  REFERRAL_POINTS_GOAL,
  SERVICE_REWARD_DAYS,
  SERVICE_REWARD_PERCENT,
  SHOP_REWARD_DAYS,
  SHOP_REWARD_PERCENT,
} from "@/lib/referrals";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Referrals" };

const dateTime = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Johannesburg",
});
const dateOnly = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: "Africa/Johannesburg" });

type Person = Pick<ProfileRow, "first_name" | "last_name" | "email"> | null;
type ClaimWithPeople = ReferralClaimRow & { friend: Person; referrer: Person };
type RewardRow = Pick<ProfileRow, "id" | "first_name" | "last_name" | "email" | "phone" | "service_discount_expires_at">;
type ProgressRow = Pick<ProfileRow, "id" | "first_name" | "last_name" | "email" | "shop_points" | "service_points">;

const nameOf = (p: Person) => (p ? [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Unknown" : "Unknown");

/** This Server Component renders once per request, so reading the clock here is safe. */
function requestTimeIso() {
  return new Date().toISOString();
}

export default async function AdminReferralsPage() {
  const supabase = await createClient();
  const now = requestTimeIso();

  const [claimedRes, shopRes, rewardsRes, progressRes, recentRes] = await Promise.all([
    supabase.from("referral_claims").select("id", { count: "exact", head: true }).not("claimed_at", "is", null),
    supabase.from("referrals").select("id", { count: "exact", head: true }).not("shop_point_at", "is", null),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, service_discount_expires_at")
      .eq("has_service_discount", true)
      .gt("service_discount_expires_at", now)
      .order("service_discount_expires_at")
      .overrideTypes<RewardRow[], { merge: false }>(),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, shop_points, service_points")
      .or("shop_points.gt.0,service_points.gt.0")
      .order("service_points", { ascending: false })
      .limit(20)
      .overrideTypes<ProgressRow[], { merge: false }>(),
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

  const failed = claimedRes.error || shopRes.error || rewardsRes.error || progressRes.error || recentRes.error;
  const rewards = rewardsRes.data ?? [];
  const progress = progressRes.data ?? [];
  const recent = recentRes.data ?? [];

  const stats = [
    { label: "In-store visits confirmed", value: claimedRes.count ?? 0, icon: BadgeCheck },
    { label: "Online purchases credited", value: shopRes.count ?? 0, icon: ShoppingBag },
    { label: "Haircut rewards active", value: rewards.length, icon: Scissors },
  ];

  return (
    <div className="w-full min-w-0 px-4 py-6 sm:p-10">
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Marketing</p>
        <h1 className="mt-2 font-display text-4xl tracking-wide text-charcoal sm:text-6xl">Referrals</h1>
        <p className="mt-1 text-sm text-charcoal/60 sm:text-base">Two separate reward systems for customers who refer friends.</p>
      </FadeIn>

      {failed ? (
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <AlertCircle className="size-5 shrink-0" />
          Couldn&apos;t load referrals. Run supabase/migrations/006_split_referral_rewards.sql in Supabase, then refresh.
        </div>
      ) : (
        <div className="mt-6 space-y-6 sm:mt-8">
          {/* The two systems at a glance */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
            <RuleCard
              icon={ShoppingBag}
              title="A · Store Referrals"
              rule="A friend's online order is marked Completed"
              reward={`${SHOP_REWARD_PERCENT}% off shop promo code, valid ${SHOP_REWARD_DAYS} days`}
            />
            <RuleCard
              icon={Scissors}
              title="B · Service Referrals"
              rule="A friend shows their In-Store Proof Code and you confirm it below"
              reward={`${SERVICE_REWARD_PERCENT}% off next haircut, valid ${SERVICE_REWARD_DAYS} days`}
            />
          </div>

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

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Haircut rewards */}
            <section className="min-w-0 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-3xl tracking-wide text-charcoal">
                <Scissors className="size-5 text-gold" /> Haircut Rewards
              </h2>
              <p className="text-sm text-charcoal/55">
                {SERVICE_REWARD_PERCENT}% off their next cut. Mark it used once applied.
              </p>
              {rewards.length === 0 ? (
                <p className="mt-5 rounded-xl bg-offwhite p-6 text-center text-sm text-charcoal/55">No active rewards.</p>
              ) : (
                <ul className="mt-4 divide-y divide-charcoal/5">
                  {rewards.map((p) => {
                    const name = nameOf(p);
                    return (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-charcoal">{name}</p>
                          <p className="truncate text-xs text-charcoal/50">
                            Valid until {dateOnly.format(new Date(p.service_discount_expires_at!))}
                            {p.phone ? ` · ${p.phone}` : ""}
                          </p>
                        </div>
                        <RedeemServiceButton profileId={p.id} name={name} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Referrer progress, both systems */}
            <section className="min-w-0 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="font-display text-3xl tracking-wide text-charcoal">Referrer Progress</h2>
              <p className="text-sm text-charcoal/55">Customers on their way to a reward.</p>
              {progress.length === 0 ? (
                <p className="mt-5 rounded-xl bg-offwhite p-6 text-center text-sm text-charcoal/55">No points earned yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-charcoal/5">
                  {progress.map((p) => (
                    <li key={p.id} className="py-3">
                      <p className="truncate text-sm font-semibold text-charcoal">{nameOf(p)}</p>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <MiniBar label="Shop" value={p.shop_points} />
                        <MiniBar label="In-store" value={p.service_points} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Recent confirmations */}
          <section className="min-w-0 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="font-display text-3xl tracking-wide text-charcoal">Recently Confirmed</h2>
            <p className="text-sm text-charcoal/55">The last 20 in-store visits.</p>
            {recent.length === 0 ? (
              <p className="mt-5 rounded-xl bg-offwhite p-6 text-center text-sm text-charcoal/55">Nothing confirmed yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-charcoal/5">
                {recent.map((c) => (
                  <li key={c.id} className="py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="font-mono text-sm font-bold tracking-wider text-charcoal">{c.code}</span>
                      <span className="text-xs text-charcoal/45">{dateTime.format(new Date(c.claimed_at!))}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-charcoal/65 [overflow-wrap:anywhere]">
                      {nameOf(c.friend)} <span className="text-charcoal/40">referred by</span> {nameOf(c.referrer)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function RuleCard({ icon: Icon, title, rule, reward }: { icon: typeof Scissors; title: string; rule: string; reward: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-sm sm:p-5">
      <p className="flex items-center gap-2 font-display text-2xl tracking-wide text-charcoal">
        <Icon className="size-4 text-gold" /> {title}
      </p>
      <p className="mt-2 text-sm text-charcoal/65">
        <span className="font-semibold text-charcoal">1 point:</span> {rule}.
      </p>
      <p className="mt-1 text-sm text-charcoal/65">
        <span className="font-semibold text-charcoal">{REFERRAL_POINTS_GOAL} points:</span> {reward}.
      </p>
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.min(value, REFERRAL_POINTS_GOAL);
  return (
    <div className="min-w-0">
      <div className="flex justify-between text-[0.7rem] text-charcoal/55">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-charcoal">
          {clamped}/{REFERRAL_POINTS_GOAL}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-charcoal/10">
        <div className="h-full rounded-full bg-gold" style={{ width: `${(clamped / REFERRAL_POINTS_GOAL) * 100}%` }} />
      </div>
    </div>
  );
}
