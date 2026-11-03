// Hardcoded for now. Later this can be loaded from the Supabase `services` table
// (columns: name, description, price, addon_name, addon_price).

export type Service = {
  name: string;
  price: number;
  description: string;
  /** Optional upgrade. `price` is the total for the service with the add-on. */
  addOn?: { name: string; price: number };
};

export const services: Service[] = [
  {
    name: "Trimming",
    price: 15,
    description: "A quick clean-up to keep your shape sharp between cuts.",
  },
  {
    name: "Full Shave",
    price: 30,
    description: "A smooth, close shave with clean lines and a fresh finish.",
    addOn: { name: "Razor Deep Cleaning", price: 50 },
  },
  {
    name: "Brush",
    price: 30,
    description: "A neat brush-up that keeps your hair even, tidy and full of shape.",
    addOn: { name: "Dye", price: 50 },
  },
  {
    name: "Brush Cut",
    price: 50,
    description: "A classic, even all-over cut, clipped neat and brushed through.",
    addOn: { name: "Dye", price: 70 },
  },
  {
    name: "Normal Men's Fade",
    price: 50,
    description: "A clean blend from short to skin, tailored to your head shape.",
    addOn: { name: "Dye", price: 70 },
  },
  {
    name: "Taper Fade",
    price: 50,
    description: "A subtle fade at the temples and neckline for a sharp, low-key look.",
    addOn: { name: "Dye", price: 70 },
  },
  {
    name: "Ladies Cut / Fade",
    price: 50,
    description: "Bold, precise short cuts and fades styled for her.",
    addOn: { name: "Dye", price: 70 },
  },
];

export const featuredServiceNames = [
  "Trimming",
  "Full Shave",
  "Brush Cut",
  "Normal Men's Fade",
];

export function formatRand(amount: number) {
  return `R${amount}`;
}
