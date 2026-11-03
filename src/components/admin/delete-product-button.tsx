"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProduct } from "@/lib/actions/products";

/** Two-step delete: first click asks for confirmation, second click deletes. */
export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  // Drop back to the normal state if the admin doesn't confirm within a few seconds.
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteProduct(id);
      setConfirming(false);
      if (result.ok) toast.success(`Deleted “${name}”`);
      else toast.error(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={confirming ? `Confirm delete ${name}` : `Delete ${name}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
        confirming
          ? "bg-red-600 text-white hover:bg-red-700"
          : "text-charcoal/50 hover:bg-red-50 hover:text-red-600"
      }`}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      {pending ? "Deleting…" : confirming ? "Confirm" : "Delete"}
    </button>
  );
}
