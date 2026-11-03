// Shared animation settings so every animation feels like part of one system.

/** A long, soft "expo out" curve: quick to start, very gentle to settle. */
export const EASE_LUXE = [0.22, 1, 0.36, 1] as const;

/** Section scroll-reveal: fade + rise 20px over 0.6s. */
export const REVEAL = { y: 20, duration: 0.6 } as const;

/** Delay between siblings in a staggered reveal (seconds). */
export const STAGGER = 0.08;
