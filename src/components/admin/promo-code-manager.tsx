"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Gift, Loader2, Plus, Ticket, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { createPromoCode, deletePromoCode, setPromoCodeActive } from "@/lib/actions/promo-codes";
import type { PromoSource } from "@/lib/database.types";
import { PROMO_STATE_LABELS, PROMO_STATE_STYLES, type PromoState } from "@/lib/promo";

export type AdminPromo = {
  id: string;
  code: string;
  percent: number;
  expires: string | null;
  uses: number;
  maxUses: number | null;
  active: boolean;
  state: PromoState;
  source: PromoSource;
  /** Customer a personal (referral) code belongs to. */
  owner: string | null;
};

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `LEGACY-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

export function PromoCodeManager({ promos }: { promos: AdminPromo[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState("");
  const [creating, startCreating] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startCreating(async () => {
      const result = await createPromoCode({
        code,
        discountPercent: String(form.get("percent") ?? ""),
        expiresOn: String(form.get("expires") ?? ""),
        maxUses: String(form.get("maxUses") ?? ""),
      });
      if (result.ok) {
        toast.success(`${code.toUpperCase()} created`);
        setCode("");
        formRef.current?.reset();
      } else {
        toast.error(result.error);
      }
    });
  }

  const input =
    "mt-1.5 w-full rounded-xl border border-charcoal/15 bg-offwhite/60 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/35 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20";
  const label = "text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/55";

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      {/* Create */}
      <section className="h-fit rounded-2xl border border-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-3xl tracking-wide text-charcoal">
          <Plus className="size-5 text-gold" /> New Code
        </h2>
        <form ref={formRef} onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="promo-code" className={label}>Code</label>
            <div className="flex gap-2">
              <input
                id="promo-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                required
                maxLength={24}
                placeholder="LEGACY20"
                className={`${input} font-mono tracking-wider`}
              />
              <button
                type="button"
                onClick={() => setCode(randomCode())}
                aria-label="Generate a random code"
                title="Generate a random code"
                className="mt-1.5 inline-flex shrink-0 items-center justify-center rounded-xl border border-charcoal/15 px-3.5 text-charcoal/60 transition-colors hover:border-gold hover:text-gold"
              >
                <Wand2 className="size-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="promo-percent" className={label}>Discount %</label>
              <input id="promo-percent" name="percent" type="number" min={1} max={100} step={1} required defaultValue={20} className={input} />
            </div>
            <div>
              <label htmlFor="promo-max" className={label}>Max uses</label>
              <input id="promo-max" name="maxUses" type="number" min={1} step={1} placeholder="Unlimited" className={input} />
            </div>
          </div>
          <div>
            <label htmlFor="promo-expires" className={label}>Expiry date</label>
            <input id="promo-expires" name="expires" type="date" className={input} />
            <p className="mt-1 text-xs text-charcoal/45">Valid until the end of this day. Leave blank to never expire.</p>
          </div>
          <button
            type="submit"
            disabled={creating || !code}
            className="btn-luxe flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 font-semibold text-charcoal hover:bg-gold-light disabled:opacity-60"
          >
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Ticket className="size-4" />}
            {creating ? "Creating…" : "Create code"}
          </button>
        </form>
      </section>

      {/* List */}
      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-3xl tracking-wide text-charcoal">All Codes</h2>
        {promos.length === 0 ? (
          <p className="mt-6 rounded-xl bg-offwhite p-6 text-center text-sm text-charcoal/55">No promo codes yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-charcoal/5">
            {promos.map((p) => (
              <PromoRow key={p.id} promo={p} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PromoRow({ promo }: { promo: AdminPromo }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  function toggleActive() {
    startTransition(async () => {
      const result = await setPromoCodeActive(promo.id, !promo.active);
      if (!result.ok) toast.error(result.error);
    });
  }

  function remove() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await deletePromoCode(promo.id);
      if (result.ok) toast.success(`${promo.code} deleted`);
      else {
        setConfirming(false);
        toast.error(result.error);
      }
    });
  }

  return (
    <li className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center ${pending ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-dashed border-gold/60 bg-gold/[0.05] px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-charcoal">
            {promo.code}
          </span>
          <span className="font-display text-2xl leading-none text-gold">{promo.percent}% off</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ring-1 ring-inset ${PROMO_STATE_STYLES[promo.state]}`}>
            {PROMO_STATE_LABELS[promo.state]}
          </span>
          {promo.source === "referral" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-charcoal px-2.5 py-0.5 text-[0.7rem] font-semibold text-gold">
              <Gift className="size-3" /> Referral
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs text-charcoal/55">
          Used {promo.uses}
          {promo.maxUses !== null ? ` / ${promo.maxUses}` : ""} · {promo.expires ? `Expires ${promo.expires}` : "No expiry"}
          {promo.owner && ` · For ${promo.owner} only`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-charcoal/60">
          <input type="checkbox" checked={promo.active} onChange={toggleActive} disabled={pending} className="peer sr-only" />
          <span className="relative h-6 w-11 rounded-full bg-charcoal/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-emerald-500 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-gold" />
          {promo.active ? "On" : "Off"}
        </label>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={confirming ? `Confirm delete ${promo.code}` : `Delete ${promo.code}`}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
            confirming ? "bg-red-600 text-white" : "text-red-600 hover:bg-red-50"
          }`}
        >
          {pending && confirming ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          {confirming ? "Confirm" : "Delete"}
        </button>
      </div>
    </li>
  );
}
