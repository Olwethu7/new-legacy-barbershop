"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isOrderStatus } from "@/lib/order-status";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateOrderStatus(id: string, status: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isOrderStatus(status)) return { ok: false, error: "Invalid status." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select("id");

  if (error) {
    console.error("updateOrderStatus:", error.message);
    return { ok: false, error: "Couldn't update the order. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "That order no longer exists." };

  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function deleteOrder(id: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").delete().eq("id", id).select("id");

  if (error) {
    console.error("deleteOrder:", error.message);
    return { ok: false, error: "Couldn't delete the order. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "That order no longer exists." };

  revalidatePath("/admin/orders");
  return { ok: true };
}
