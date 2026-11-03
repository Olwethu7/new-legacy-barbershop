// Shared business details used across the site.

export const site = {
  name: "New Legacy Barbershop",
  tagline: "Growing Together, Leaving a Legacy",
  phoneDisplay: "069 592 2556",
  phoneHref: "tel:+27695922556",
  whatsappUrl: "https://wa.me/27695922556",
  email: "cweleolwethu6@gmail.com",
  locations: ["Bizana Nomlacu", "Durban CBD"],
} as const;

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/gallery", label: "Gallery" },
  { href: "/shop", label: "Shop" },
  { href: "/contact", label: "Contact" },
] as const;

/** WhatsApp link with a pre-filled booking message. */
export function whatsappBookingUrl(service?: string) {
  const text = service
    ? `Hi New Legacy, I'd like to book a ${service}.`
    : "Hi New Legacy, I'd like to book a cut.";
  return `${site.whatsappUrl}?text=${encodeURIComponent(text)}`;
}
