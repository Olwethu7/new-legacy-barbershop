"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";

/** Charcoal-and-gold success toast, for the moments worth celebrating (referrals, rewards). */
export function goldToast(title: string, description?: string) {
  toast.success(title, {
    description,
    icon: <Sparkles className="size-4 text-gold" />,
    duration: 5000,
    style: {
      background: "linear-gradient(135deg, #111111 0%, #1b1b1b 100%)",
      color: "#f5f3ef",
      border: "1px solid rgba(201, 162, 39, 0.7)",
      boxShadow: "0 18px 50px -12px rgba(201, 162, 39, 0.45)",
    },
    classNames: {
      title: "font-semibold text-gold!",
      description: "text-offwhite/75!",
    },
  });
}
