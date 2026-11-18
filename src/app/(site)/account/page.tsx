import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Gift, LayoutDashboard, Package, ShoppingBag, Ticket, UserRound, Users } from "lucide-react";
import { CustomerLogoutButton } from "@/components/account/customer-logout-button";
import { ProfileForm } from "@/components/account/profile-form";
import { ReferralLink } from "@/components/account/referral-link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { requireUser } from "@/lib/auth";
import type { OrderRow, PromoCodeRow } from "@/lib/database.types";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES, isOrderStatus } from "@/lib/order-status";
import { PROMO_STATE_LABELS, PROMO_STATE_STYLES, promoState, shortDate } from "@/lib/promo";
import { formatRand } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <AccountDashboard />
    </Suspense>
  );
}

type OrderSummary = Pick<OrderRow, "id" | "items" | "subtotal" | "discount" | "total" | "status" | "created_at" | "promo_code">;

async function AccountDashboard() {
  const user = await requireUser();
  const supabase = await createClient();

  const [ordersRes, referralsRes, promosRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, items, subtotal, discount, total, status, created_at, promo_code")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .overrideTypes<OrderSummary[], { merge: false }>(),
    supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user.id),
    supabase
      .from("promo_codes")
      .select("id, code, discount_percent, expires_at, max_uses, uses, active, source")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .overrideTypes<PromoCodeRow[], { merge: false }>(),
  ]);

  const profile = user.profile;
  const orders = ordersRes.data ?? [];
  const referralCount = referralsRes.count ?? 0;
  const rewards = promosRes.data ?? [];
  const firstName = profile?.first_name || user.email.split("@")[0];

  return (
    <>
      {/* Header band */}
      <section className="relative isolate overflow-hidden bg-charcoal text-offwhite">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(201,162,39,0.16),transparent_60%)]"
        />
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-14 sm:px-6 sm:py-20 md:flex-row md:items-end md:justify-between lg:px-8">
          <div>
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-gold">
              <span className="h-px w-10 bg-gold" />
              My Account
            </p>
            <h1 className="mt-5 font-display text-[clamp(3rem,9vw,6rem)] leading-[0.9] tracking-wide">
              Welcome back, <span className="text-gold">{firstName}</span>
            </h1>
            <p className="mt-4 text-offwhite/60">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {profile?.role === "admin" && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-light"
              >
                <LayoutDashboard className="size-4" />
                Admin panel
              </Link>
            )}
            <CustomerLogoutButton />
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div className="space-y-6 lg:col-span-2">
            {/* Refer a friend */}
            <ScrollReveal>
              <article className="relative overflow-hidden rounded-3xl bg-charcoal p-6 text-offwhite sm:p-8">
                <div aria-hidden="true" className="absolute -right-16 -top-16 size-56 rounded-full bg-gold/15 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-full bg-gold text-charcoal">
                      <Gift className="size-5" />
                    </span>
                    <h2 className="font-display text-4xl tracking-wide">Refer a Friend</h2>
                  </div>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-offwhite/65">
                    Share your link. When a friend creates an account with it, you get a personal promo code for 10% off
                    your next shop order.
                  </p>
                  {profile?.referral_code ? (
                    <div className="mt-6">
                      <ReferralLink code={profile.referral_code} />
                    </div>
                  ) : (
                    <p className="mt-6 rounded-xl border border-white/10 p-4 text-sm text-offwhite/60">
                      Your referral link is being set up. Please check back shortly.
                    </p>
                  )}
                  <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 sm:max-w-md">
                    <div>
                      <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-offwhite/50">
                        <Users className="size-3.5" /> Friends joined
                      </dt>
                      <dd className="mt-1 font-display text-5xl text-gold">{referralCount}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-offwhite/50">
                        <Ticket className="size-3.5" /> Codes earned
                      </dt>
                      <dd className="mt-1 font-display text-5xl text-gold">
                        {rewards.filter((r) => r.source === "referral").length}
                      </dd>
                    </div>
                  </dl>
                </div>
              </article>
            </ScrollReveal>

            {/* Order history */}
            <ScrollReveal>
              <article className="rounded-3xl border border-charcoal/10 bg-white p-6 sm:p-8">
                <CardTitle icon={Package} title="Order History" />
                {orders.length === 0 ? (
                  <div className="mt-6 flex flex-col items-center rounded-2xl bg-offwhite px-6 py-12 text-center">
                    <ShoppingBag className="size-10 text-gold/70" strokeWidth={1.25} />
                    <p className="mt-4 font-display text-2xl tracking-wide text-charcoal">No orders yet</p>
                    <p className="mt-1 text-sm text-charcoal/55">Orders you place while signed in show up here.</p>
                    <Link
                      href="/shop"
                      className="mt-6 rounded-full border border-gold px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.15em] text-gold transition-colors hover:bg-gold hover:text-charcoal"
                    >
                      Visit the shop
                    </Link>
                  </div>
                ) : (
                  <ul className="mt-6 divide-y divide-charcoal/10">
                    {orders.map((order) => {
                      const status = isOrderStatus(order.status) ? order.status : "pending";
                      const lines = Array.isArray(order.items) ? (order.items as { name?: string; quantity?: number }[]) : [];
                      const total = Number(order.total ?? order.subtotal) || 0;
                      const discount = Number(order.discount) || 0;
                      return (
                        <li key={order.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold text-charcoal">
                              #{order.id.slice(0, 8).toUpperCase()}
                              <span className="ml-2 text-sm font-normal text-charcoal/50">
                                {shortDate.format(new Date(order.created_at))}
                              </span>
                            </p>
                            <p className="mt-0.5 truncate text-sm text-charcoal/60">
                              {lines.map((l) => `${l.quantity ?? 1} × ${l.name ?? "Item"}`).join(", ")}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${ORDER_STATUS_STYLES[status]}`}
                            >
                              {ORDER_STATUS_LABELS[status]}
                            </span>
                            <span className="text-right">
                              <span className="block font-display text-2xl leading-none text-gold">{formatRand(total)}</span>
                              {discount > 0 && (
                                <span className="block text-xs text-emerald-700">
                                  −{formatRand(discount)} {order.promo_code}
                                </span>
                              )}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            </ScrollReveal>
          </div>

          <div className="space-y-6">
            {/* My rewards */}
            <ScrollReveal>
              <article className="rounded-3xl border border-charcoal/10 bg-white p-6 sm:p-8">
                <CardTitle icon={Ticket} title="My Promo Codes" />
                {rewards.length === 0 ? (
                  <p className="mt-4 text-sm text-charcoal/55">
                    Codes you earn from referrals appear here. Use them at checkout.
                  </p>
                ) : (
                  <ul className="mt-5 space-y-3">
                    {rewards.map((promo) => {
                      const state = promoState(promo);
                      return (
                        <li
                          key={promo.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-gold/50 bg-gold/[0.04] px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-bold tracking-wider text-charcoal">{promo.code}</p>
                            <p className="text-xs text-charcoal/55">
                              {promo.discount_percent}% off
                              {promo.expires_at && ` · until ${shortDate.format(new Date(promo.expires_at))}`}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ring-1 ring-inset ${PROMO_STATE_STYLES[state]}`}
                          >
                            {PROMO_STATE_LABELS[state]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            </ScrollReveal>

            {/* Profile */}
            <ScrollReveal>
              <article className="rounded-3xl border border-charcoal/10 bg-white p-6 sm:p-8">
                <CardTitle icon={UserRound} title="My Profile" />
                <div className="mt-5">
                  <ProfileForm
                    email={user.email}
                    firstName={profile?.first_name ?? ""}
                    lastName={profile?.last_name ?? ""}
                    phone={profile?.phone ?? ""}
                    marketingOptIn={profile?.marketing_opt_in ?? true}
                  />
                </div>
              </article>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </>
  );
}

function CardTitle({ icon: Icon, title }: { icon: typeof Package; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-full bg-charcoal text-gold">
        <Icon className="size-[1.1rem]" />
      </span>
      <h2 className="font-display text-3xl tracking-wide text-charcoal">{title}</h2>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your account">
      <div className="bg-charcoal">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          <div className="mt-6 h-16 w-2/3 max-w-lg animate-pulse rounded-lg bg-white/10" />
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="h-72 animate-pulse rounded-3xl bg-charcoal/10 lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-3xl bg-charcoal/5" />
      </div>
    </div>
  );
}
