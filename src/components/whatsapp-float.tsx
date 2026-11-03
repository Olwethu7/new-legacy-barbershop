import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { whatsappBookingUrl } from "@/lib/site";

export function WhatsAppFloat() {
  return (
    <a
      href={whatsappBookingUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/30 ring-4 ring-white/10 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold sm:bottom-8 sm:right-8 sm:size-16"
    >
      <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 motion-safe:animate-ping [animation-duration:2.5s]" />
      <WhatsAppIcon className="relative size-7 sm:size-8" />
    </a>
  );
}
