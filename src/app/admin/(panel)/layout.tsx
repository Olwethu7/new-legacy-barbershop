import { Suspense } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/auth";

/** Protected admin area: sidebar + login check. */
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col bg-offwhite lg:flex-row">
      <AdminSidebar />
      <main className="min-w-0 flex-1">
        <Suspense fallback={<PanelSkeleton />}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
    </div>
  );
}

/** Nothing inside renders until the server confirms the visitor is signed in. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}

function PanelSkeleton() {
  return (
    <div className="space-y-6 p-6 sm:p-10" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-charcoal/10" />
      <div className="grid gap-5 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-charcoal/5" />
        ))}
      </div>
    </div>
  );
}
