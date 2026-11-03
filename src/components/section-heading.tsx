type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  tone?: "light" | "dark";
  align?: "left" | "center";
};

export function SectionHeading({ eyebrow, title, description, tone = "light", align = "left" }: Props) {
  const dark = tone === "dark";
  const centered = align === "center";

  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold ${centered ? "justify-center" : ""}`}>
        <span className="h-px w-8 bg-gold" />
        {eyebrow}
      </p>
      <h2 className={`mt-4 font-display text-5xl leading-[0.95] tracking-wide sm:text-6xl ${dark ? "text-offwhite" : "text-charcoal"}`}>
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-base leading-relaxed ${dark ? "text-offwhite/60" : "text-charcoal/65"}`}>
          {description}
        </p>
      )}
    </div>
  );
}
