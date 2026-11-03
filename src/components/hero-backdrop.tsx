/**
 * Ambient hero texture: drifting gold dust and film grain.
 * CSS-only (transform + opacity); both stop when "reduce motion" is on (see globals.css).
 */
export function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Gold dust (taller than the hero so the upward drift never shows an edge) */}
      <div className="hero-dust absolute inset-x-0 top-0 h-[calc(100%+320px)] opacity-70" />
      {/* Film grain (oversized by one tile on every side for the same reason) */}
      <div className="hero-grain absolute -inset-[160px] opacity-[0.06] mix-blend-overlay" />
    </div>
  );
}
