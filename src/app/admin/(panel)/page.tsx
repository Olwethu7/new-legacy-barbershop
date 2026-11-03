import type { Metadata } from "next";
import { Banknote, Package, ShoppingCart } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/admin/admin-motion";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

// Hardcoded for now. Replace with real counts from Supabase later.
const stats = [
  { label: "Total Products", value: "0", icon: Package, hint: "Items in your shop" },
  { label: "Total Orders", value: "0", icon: ShoppingCart, hint: "Orders received" },
  { label: "Total Sales", value: "R0", icon: Banknote, hint: "Revenue from orders" },
];

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const name = admin.email.split("@")[0];

  return (
    <div className="p-6 sm:p-10">
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Dashboard</p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-charcoal sm:text-6xl">
          Welcome back{name ? <span className="text-gold">, {name}</span> : null}
        </h1>
        <p className="mt-2 text-charcoal/60">Here&apos;s what&apos;s happening at New Legacy Barbershop.</p>
      </FadeIn>

      <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, hint }) => (
          <StaggerItem key={label}>
            <article className="group relative h-full overflow-hidden rounded-2xl border border-charcoal/10 bg-white p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-gold/50 hover:shadow-xl hover:shadow-gold/10">
              <span className="absolute inset-x-0 top-0 h-1 bg-gold" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-charcoal/60">{label}</p>
                  <p className="mt-3 font-display text-6xl leading-none tracking-wide text-charcoal">{value}</p>
                </div>
                <div className="flex size-12 items-center justify-center rounded-xl bg-charcoal text-gold transition-transform duration-500 group-hover:scale-110">
                  <Icon className="size-5" />
                </div>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-charcoal/40">{hint}</p>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
