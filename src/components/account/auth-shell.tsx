import type { ReactNode } from "react";

/** Dark, centred card used by the customer Login and Register pages. */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-center justify-center overflow-hidden bg-charcoal px-4 py-16 sm:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(201,162,39,0.14),transparent_70%)]"
      />
      <div className="w-full max-w-lg">
        <p className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-gold">
          <span className="h-px w-8 bg-gold" />
          {eyebrow}
          <span className="h-px w-8 bg-gold" />
        </p>
        <div className="mt-8 rounded-3xl border border-white/10 bg-charcoal-soft/80 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
          <h1 className="font-display text-5xl tracking-wide text-offwhite">{title}</h1>
          <p className="mt-1 text-sm text-offwhite/50">{description}</p>
          {children}
        </div>
      </div>
    </section>
  );
}

/** Placeholder while the form (which reads ?ref= from the URL) loads. */
export function AuthFormSkeleton() {
  return (
    <div className="mt-8 space-y-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-[3.25rem] animate-pulse rounded-xl bg-white/5" />
      ))}
      <div className="h-14 animate-pulse rounded-full bg-gold/20" />
    </div>
  );
}
