"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy } from "lucide-react";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

const noopSubscribe = () => () => {};

/** The customer's personal sign-up link, with copy and WhatsApp share buttons. */
export function ReferralLink({ code }: { code: string }) {
  // The site's address is only known in the browser; the server renders the path alone.
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const link = `${origin}/account/register?ref=${encodeURIComponent(code)}`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is still selectable in the box.
    }
  }

  const share = `https://wa.me/?text=${encodeURIComponent(
    `Join me at New Legacy Barbershop, the Barber with SuperGlue. Sign up with my link: ${link}`,
  )}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={link}
          aria-label="Your referral link"
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-charcoal px-4 py-3 font-mono text-sm text-offwhite/85 focus:border-gold/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="btn-luxe inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-charcoal hover:bg-gold-light"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <a
        href={share}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#25D366] transition-opacity hover:opacity-80"
      >
        <WhatsAppIcon className="size-4" />
        Share on WhatsApp
      </a>
    </div>
  );
}
