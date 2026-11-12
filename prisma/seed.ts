import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_PAYMENT_TERMS, DEFAULT_PICS, DEFAULT_TERMS } from "../src/lib/proposal-defaults";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // Venues from Oshom Bali wedding package & buyout materials.
  const venues = [
    {
      key: "lawn",
      name: "The Lawn",
      tagline: "Clifftop majesty · Golden hour magic",
      description:
        "A clifftop paradise where love meets the endless horizon. Perched high above the Indian Ocean, this enchanting venue offers a breathtaking backdrop of crashing waves and golden sunsets — 350 sqm of multi-purpose ocean-view space for ceremonies and celebrations.",
      seated: 100,
      standing: 300,
      features: [
        "350 sqm clifftop lawn",
        "Uninterrupted ocean views",
        "Golden hour sunsets",
        "Multi-purpose wedding venue",
        "Ceremony & reception capable",
      ],
      suitableFor: [
        "Weddings & ceremonies",
        "Sunset cocktails",
        "Private dinners",
        "Intimate to elevated gatherings",
      ],
      imageUrl: "/brand/venue-lawn.jpg",
      sortOrder: 1,
    },
    {
      key: "ocean-lounge",
      name: "Oshom Ocean Lounge",
      tagline: "Oceanfront dining for celebrations",
      description:
        "Wedding dinners and refined gatherings at Oshom Ocean Lounge, with coastal luxury and curated food & beverage experiences.",
      seated: 70,
      standing: 120,
      features: ["Ocean outlook", "Dinner service", "Bespoke F&B menus"],
      suitableFor: ["Wedding dinners", "Private celebrations", "Corporate hospitality"],
      imageUrl: "/brand/venue-ocean-lounge.jpg",
      sortOrder: 2,
    },
    {
      key: "full-buyout",
      name: "Full Venue Buyout",
      tagline: "Exclusive hotel & venue buyout",
      description:
        "Exclusive use of Oshom Bali venues including Restaurant, Courtyard, Lawn, Wellness Studio, Nest, Lava Shack, Rooftop, and Library. During the buyout period the hotel venues are closed to the public and dedicated to your party. Net day rate from IDR 100,000,000 (subject to 21% tax & service).",
      seated: 100,
      standing: 300,
      features: [
        "Restaurant, Courtyard, Lawn",
        "Wellness Studio, Nest, Lava Shack",
        "Rooftop & Library",
        "Full exclusivity during buyout period",
      ],
      suitableFor: ["Exclusive weddings", "Private buyouts", "Multi-space celebrations"],
      imageUrl: "/brand/aerial.jpg",
      sortOrder: 3,
    },
  ] as const;

  for (const venue of venues) {
    await prisma.venue.upsert({
      where: { key: venue.key },
      update: {
        name: venue.name,
        tagline: venue.tagline,
        description: venue.description,
        seated: venue.seated,
        standing: venue.standing,
        features: [...venue.features],
        suitableFor: [...venue.suitableFor],
        imageUrl: venue.imageUrl,
        sortOrder: venue.sortOrder,
        active: true,
      },
      create: { ...venue, features: [...venue.features], suitableFor: [...venue.suitableFor] },
    });
  }

  // Retire Luna venue if present from an earlier seed.
  await prisma.venue.updateMany({ where: { key: "elysium" }, data: { active: false } });

  // Editable defaults for new proposals.
  await prisma.setting.upsert({
    where: { key: "defaults" },
    update: {
      value: { pics: DEFAULT_PICS, paymentTerms: DEFAULT_PAYMENT_TERMS, terms: DEFAULT_TERMS },
    },
    create: {
      key: "defaults",
      value: { pics: DEFAULT_PICS, paymentTerms: DEFAULT_PAYMENT_TERMS, terms: DEFAULT_TERMS },
    },
  });

  // First admin user. Credentials come from the environment, never from source.
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Admin";
  if (!email || !password) {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set: skipping admin user.");
    return;
  }
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists; password left unchanged.`);
    return;
  }
  await prisma.user.create({
    data: { email, name, role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`Created admin user ${email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
