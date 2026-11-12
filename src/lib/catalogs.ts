import type { LineItem } from "@/lib/schemas/proposal";

export interface WeddingPackage {
  key: string;
  name: string;
  guests: number;
  /** Net package price before 21% tax & service. */
  price: number;
  additionalPax: number;
  inclusions: string[];
}

/** Wedding packages from Oshom Bali Wedding Package (prices subject to 21% tax & service). */
export const WEDDING_PACKAGES: WeddingPackage[] = [
  {
    key: "silver",
    name: "Silver Wedding Package",
    guests: 25,
    price: 109_000_000,
    additionalPax: 1_500_000,
    inclusions: [
      "Two-night Treehouse stay for bride & groom",
      "90-minute couples romantic spa treatment",
      "One candlelight dinner at Shell House",
      "3 hours of access to The Lawn",
      "2 hours preparation room",
      "Elegant arch decorations",
      "25 Tiffany chairs & 2 long tables",
      "Hand bouquet and boutonniere",
      "Shared platters menu for 25 guests",
      "3 hours alcoholic drinks + unlimited canapés for 25 guests",
      "Photography package (50 edited images)",
    ],
  },
  {
    key: "gold",
    name: "Gold Wedding Package",
    guests: 50,
    price: 151_250_000,
    additionalPax: 1_500_000,
    inclusions: [
      "2 nights Ocean Suite for bride & groom",
      "90-minute romantic spa treatment for two",
      "One candlelit dinner at Shell House",
      "4 hours of access to The Lawn",
      "2 hours preparation room",
      "Elegant arch decorations",
      "50 Tiffany chairs & 2 long tables",
      "Hand bouquet and boutonniere",
      "Dedicated wedding buggy",
      "Wedding dinner at Oshom Ocean Lounge",
      "Shared platters menu for 50 guests",
      "3 hours free-flow beverages + unlimited canapés for 50 guests",
      "Photo package (50 edited shots + 60-second video)",
    ],
  },
  {
    key: "platinum",
    name: "Platinum Wedding Package",
    guests: 70,
    price: 223_850_000,
    additionalPax: 1_500_000,
    inclusions: [
      "2 nights Majestic Haven Suite for bride & groom",
      "120-minute couples romantic spa experience",
      "Exclusive candlelight dinner at Shell House",
      "5 hours of access to The Lawn",
      "2 hours preparation room",
      "Beautifully decorated arch",
      "70 Tiffany chairs & 4 long tables",
      "Hand bouquet and boutonniere",
      "Private wedding buggy",
      "Wedding dinner at Oshom Ocean Lounge",
      "Shared platters menu for up to 70 guests",
      "3 hours luxe free-flow beverages + unlimited canapés for 70 guests",
      "Photo package (50 edited images + 60-second video)",
    ],
  },
];

/** Full venue buyout net day rate from Exclusive Hotel & Venue Buyout T&Cs. */
export const FULL_VENUE_BUYOUT_NET = 100_000_000;

export interface EntertainmentOption {
  category: string;
  name: string;
  desc: string;
  price: number;
}

/** Curated entertainment recommendations (net IDR) from the Entertainment Recommendations deck. */
export const ENTERTAINMENT_OPTIONS: EntertainmentOption[] = [
  { category: "Live music", name: "Trio Electone (3 pax)", desc: "Female singer, male singer, keyboardist · 3×30 mins", price: 5_250_000 },
  { category: "Live music", name: "Duo Electone (2 pax)", desc: "Female singer, keyboardist · 3×30 mins", price: 4_500_000 },
  { category: "Live music", name: "Kwartet Band (4 pax)", desc: "Bass besar, perkusi, 2× guitar · 3×30 mins", price: 10_500_000 },
  { category: "Live music", name: "Acoustic Band (5 pax)", desc: "Guitar, male vocalist, bass, drumpad · 2×45 mins", price: 11_250_000 },
  { category: "Live music", name: "Band Unplug (7 pax)", desc: "Full unplugged lineup · 2×45 mins", price: 22_500_000 },
  { category: "Live music", name: "Band Top 40 (7 pax)", desc: "Full electric lineup · 4×45 mins", price: 22_500_000 },
  { category: "Live music", name: "Duo Grand Piano", desc: "Female singer + baby grand piano · 2×45 mins", price: 22_500_000 },
  { category: "DJ", name: "DJ Player + equipment", desc: "2 hours", price: 11_250_000 },
  { category: "DJ", name: "DJ full sound package", desc: "DJ + speakers, subwoofer, mixer, sound man · 2 hours", price: 22_500_000 },
  { category: "MC", name: "MC Bahasa", desc: "Male/female · from 4 hours", price: 7_800_000 },
  { category: "MC", name: "MC English", desc: "Male/female · from 4 hours", price: 11_250_000 },
  { category: "MC", name: "MC Mandarin", desc: "Male/female · from 4 hours", price: 15_000_000 },
  { category: "Dance", name: "Balinese Dance (4 pax)", desc: "Cendrawasih / Sekar Jagat · 2×8 mins", price: 6_750_000 },
  { category: "Dance", name: "Balinese Dance (6 pax)", desc: "2×8 mins", price: 9_750_000 },
  { category: "Dance", name: "Barong Dance (15 pax)", desc: "With gambelan · 2×20 mins", price: 22_500_000 },
  { category: "Dance", name: "Kecak Dance (30 pax)", desc: "2×20 mins", price: 15_000_000 },
  { category: "Dance", name: "Fire Dance (4 pax)", desc: "Balinese / sexy fire dance · 2×6 mins", price: 6_750_000 },
  { category: "Dance", name: "Fire Dance (6 pax)", desc: "2×8 mins", price: 9_750_000 },
  { category: "Specialist", name: "Close-up Magician", desc: "2×45 mins", price: 3_000_000 },
  { category: "Specialist", name: "Artist Magician / Comedian", desc: "45 mins", price: 22_500_000 },
  { category: "Specialist", name: "Fire Juggler (2 pax)", desc: "2×6 mins", price: 7_500_000 },
  { category: "Lighting", name: "Lighting Paket Event 1", desc: "1 day · suitable for <50 pax", price: 3_750_000 },
  { category: "Lighting", name: "Lighting Paket Event 2", desc: "1 day · 50–80 pax", price: 5_625_000 },
  { category: "Lighting", name: "Lighting Paket Event 3", desc: "1 day · ~100 pax", price: 9_000_000 },
  { category: "Lighting", name: "Lighting Paket Event 4", desc: "1 day · ~200 pax", price: 18_750_000 },
  { category: "Lighting", name: "Lighting Paket Event 5", desc: "1 day · ~250 pax", price: 26_250_000 },
];

let catalogSeq = 0;
function nextId(prefix: string) {
  catalogSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${catalogSeq}`;
}

export function weddingPackageAsItem(pkg: WeddingPackage): LineItem {
  return {
    id: nextId("pkg"),
    name: pkg.name,
    desc: `For ${pkg.guests} guests. Additional pax IDR ${pkg.additionalPax.toLocaleString("id-ID")} ++/pax. ${pkg.inclusions.slice(0, 4).join("; ")}.`,
    qty: 1,
    price: pkg.price,
    perPax: false,
  };
}

export function entertainmentAsItem(opt: EntertainmentOption): LineItem {
  return {
    id: nextId("ent"),
    name: opt.name,
    desc: `${opt.category} · ${opt.desc}`,
    qty: 1,
    price: opt.price,
    perPax: false,
  };
}

export function buyoutAsItem(): LineItem {
  return {
    id: nextId("buyout"),
    name: "Full Venue Buyout (1 day)",
    desc: "Exclusive access to Restaurant, Courtyard, Lawn, Wellness Studio, Nest, Lava Shack, Rooftop, and Library. Net rate.",
    qty: 1,
    price: FULL_VENUE_BUYOUT_NET,
    perPax: false,
  };
}
