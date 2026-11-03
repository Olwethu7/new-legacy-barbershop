import Link from "next/link";

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="group flex flex-col leading-none" aria-label="New Legacy Barbershop home">
      <span className="font-display text-3xl tracking-wide text-offwhite">
        NEW <span className="text-gold">LEGACY</span>
      </span>
      <span className="mt-0.5 text-[0.6rem] font-medium uppercase tracking-[0.35em] text-offwhite/50">
        Barbershop
      </span>
    </Link>
  );
}
