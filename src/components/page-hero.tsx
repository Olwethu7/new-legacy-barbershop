import type { ReactNode } from "react";
import { Stagger, StaggerItem } from "@/components/scroll-reveal";

type Props = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
};

/** Dark page header used at the top of inner pages. */
export function PageHero({ eyebrow, title, description }: Props) {
  return (
    <section className="relative isolate overflow-hidden bg-charcoal text-offwhite">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(201,162,39,0.16),transparent_60%)]"
      />
      {/* Eyebrow, title and description fade up one after another */}
      <Stagger className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <StaggerItem>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-gold">
            <span className="h-px w-10 bg-gold" />
            {eyebrow}
          </p>
        </StaggerItem>
        <StaggerItem>
          <h1 className="mt-6 font-display text-[clamp(3.5rem,10vw,7.5rem)] leading-[0.9] tracking-wide">{title}</h1>
        </StaggerItem>
        {description && (
          <StaggerItem>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-offwhite/70">{description}</p>
          </StaggerItem>
        )}
      </Stagger>
    </section>
  );
}
