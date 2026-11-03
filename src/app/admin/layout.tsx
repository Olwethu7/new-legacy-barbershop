import type { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | New Legacy" },
  robots: { index: false, follow: false },
};

/**
 * Wraps every /admin page, including the login page.
 * The sidebar and the login check live in app/admin/(panel)/layout.tsx,
 * so the login page itself stays reachable when signed out.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col bg-charcoal">
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ style: { fontFamily: "var(--font-geist-sans)" } }}
      />
    </div>
  );
}
