"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await createClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-offwhite/60 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-[1.1rem] animate-spin" /> : <LogOut className="size-[1.1rem]" />}
      {pending ? "Logging out…" : "Logout"}
    </button>
  );
}
