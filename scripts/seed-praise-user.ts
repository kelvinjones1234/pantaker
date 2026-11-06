import { config } from "dotenv";
import pg from "pg";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";

config({ quiet: true });

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required in .env");
  process.exit(1);
}

const USER_EMAIL = "praisejournal2@gmail.com";
const USER_PASSWORD = "@Kelvin1234";
const USER_NAME = "Praise Journal";
const USER_USERNAME = "praisejournal2";

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

interface SeedListing {
  categorySlug: string;
  slug: string;
  title: string;
  description: string;
  condition: "working" | "used" | "for_parts" | "partially_usable" | "scrap";
  pricingType: "fixed" | "negotiable";
  price: number;
  quantity: number;
  unit: string;
  area: string;
  pickupNotes: string;
  images: { src: string; alt: string }[];
}

const items: SeedListing[] = [
  {
    categorySlug: "metals",
    slug: "praise-industrial-aluminum-extrusion-profiles",
    title: "Industrial Aluminum Extrusion Profiles — 6063-T5 (30kg bundle)",
    description:
      "Surplus 6063-T5 structural aluminum extrusion profiles from a completed partition installation. Clean cuts, minor surface handling scuffs, no bends or warping. Lengths between 1.8m and 2.4m, total weight approx 30kg. Suitable for fabrication, shelving frames, solar mounting, or scrap recycling.",
    condition: "used",
    pricingType: "fixed",
    price: 75000,
    quantity: 1,
    unit: "bundle",
    area: "Idu Industrial",
    pickupNotes: "Collection from our Idu workshop. We have a scale on site if you want to re-weigh.",
    images: [
      { src: photo("1588854337236-6889d631faa8"), alt: "Aluminum extrusion profiles in workshop" },
      { src: photo("1504307651254-35680f356dfd"), alt: "Stacked industrial metal profiles" },
    ],
  },
  {
    categorySlug: "plastics",
    slug: "praise-hdpe-plastic-sheets-10mm",
    title: "HDPE High-Density Plastic Sheets (10mm thick, 4ft x 8ft)",
    description:
      "Two full sheets of black HDPE (high-density polyethylene) plastic sheeting, 10mm thickness, 1.2m x 2.4m (4ft x 8ft). Leftover stock from tank lining fabrication. High impact resistance, waterproof, and chemical-safe. Great for cutting boards, machinery guards, or agricultural lining. Sold as a pair.",
    condition: "working",
    pricingType: "negotiable",
    price: 85000,
    quantity: 2,
    unit: "sheets",
    area: "Dei-Dei",
    pickupNotes: "Pickup in Dei-Dei building materials market. Can assist with loading onto a truck or van.",
    images: [
      { src: photo("1532996122724-e3c354a0b15b"), alt: "HDPE plastic polymer sheets" },
    ],
  },
  {
    categorySlug: "electronics",
    slug: "praise-hp-prodesk-400-g5-mini-pc",
    title: "HP ProDesk 400 G5 Mini PC — Core i5 8th Gen, 16GB RAM, 256GB SSD",
    description:
      "Compact HP ProDesk mini desktop PC removed from an office upgrade. Intel Core i5-8500T, 16GB DDR4 RAM, 256GB NVMe SSD, original HP power adapter included. Clean install of Windows 10 Pro, boots quickly and runs completely quiet. DisplayPort and VGA outputs, built-in Wi-Fi.",
    condition: "working",
    pricingType: "fixed",
    price: 125000,
    quantity: 1,
    unit: "item",
    area: "Wuse 2",
    pickupNotes: "Pickup at Aminu Kano Crescent, Wuse 2. You can test it on our monitor before payment.",
    images: [
      { src: photo("1550009158-9ebf69173e03"), alt: "Compact desktop PC motherboard and internals" },
      { src: photo("1587202372775-e229f172b9d7"), alt: "Desktop PC computer setup" },
    ],
  },
  {
    categorySlug: "appliances",
    slug: "praise-commercial-stainless-food-processor",
    title: "Commercial Stainless Steel Food Processor & Grinder (1500W)",
    description:
      "Heavy-duty commercial food cutter and grinder with a stainless steel bowl and dual speed motor. Used for 8 months in a catering setup. Motor runs strong with no abnormal noise; blades are sharp and locking mechanism is intact. Perfect for restaurants, pepper grinding, or food prep businesses.",
    condition: "working",
    pricingType: "negotiable",
    price: 95000,
    quantity: 1,
    unit: "item",
    area: "Garki",
    pickupNotes: "Collection in Garki Area 11. Available weekdays after 3pm or anytime Saturday.",
    images: [
      { src: photo("1556911220-e15b29be8c8f"), alt: "Stainless steel food prep appliance in commercial kitchen" },
    ],
  },
  {
    categorySlug: "furniture",
    slug: "praise-ergonomic-high-back-mesh-chair",
    title: "Ergonomic High-Back Executive Mesh Swivel Chair",
    description:
      "High-back mesh executive desk chair with adjustable lumbar support, 3D armrests, and pneumatic height adjustment. Mesh is tight with no tears, tilt lock and gas lift work smoothly. Castors glide easily on hard floors and carpets. Surplus from an office renovation.",
    condition: "working",
    pricingType: "fixed",
    price: 48000,
    quantity: 1,
    unit: "item",
    area: "Maitama",
    pickupNotes: "Collection from Maitama near Farmers Market. Easily fits in the back seat of a sedan.",
    images: [
      { src: photo("1593062096033-9a26b09da705"), alt: "Ergonomic mesh desk chair in office" },
    ],
  },
  {
    categorySlug: "vehicle-parts",
    slug: "praise-toyota-camry-rav4-denso-alternator",
    title: "Toyota Camry / RAV4 2.5L Alternator (2012–2017) — OEM Denso, Tested",
    description:
      "Original equipment Denso 100A alternator removed from a 2014 Toyota Camry 2.5L engine. Bench-tested at our workshop, charges steadily at 14.2V under load, bearings spin freely with zero shaft play. Clean connectors and intact casing. Compatible with Camry, RAV4, and Highlander 2.5L 4-cylinder engines.",
    condition: "working",
    pricingType: "fixed",
    price: 42000,
    quantity: 1,
    unit: "item",
    area: "Apo",
    pickupNotes: "Pickup from Apo Mechanic Village (Zone D). Feel free to bring your multimeter to test on the spot.",
    images: [
      { src: photo("1553413077-190dd305871c"), alt: "OEM car alternator on workshop bench" },
      { src: photo("1486262715619-67b85e0b08d3"), alt: "Auto electrical components" },
    ],
  },
  {
    categorySlug: "construction-materials",
    slug: "praise-galvanized-corrugated-roofing-sheets",
    title: "Galvanized Corrugated Roofing Sheets (0.45mm) — 12 Sheets",
    description:
      "Bundle of 12 galvanized zinc-coated corrugated roofing sheets, 0.45mm gauge, standard 10ft (3.05m) length. Unused surplus leftover from a warehouse roof extension. Stored dry, no rust or corrosion. Sturdy gauge suitable for residential roofing, shed building, or perimeter hoardings.",
    condition: "working",
    pricingType: "negotiable",
    price: 110000,
    quantity: 12,
    unit: "sheets",
    area: "Dei-Dei",
    pickupNotes: "Collection from Dei-Dei building materials depot. Bring a pickup truck or lorry for transport.",
    images: [
      { src: photo("1621905251189-08b45d6a269e"), alt: "Galvanized corrugated roofing sheets" },
      { src: photo("1504307651254-35680f356dfd"), alt: "Building materials stockpile" },
    ],
  },
  {
    categorySlug: "electrical-materials",
    slug: "praise-pure-copper-25mm-cable-roll",
    title: "Pure Copper 2.5mm Single Core Conduit Cable (100m Full Roll, Nigerchin)",
    description:
      "Full unbroken 100-meter coil of Nigerchin certified 2.5mm single core PVC-insulated pure copper building wire (Red). Certified flame retardant 450/750V. Sealed in factory packaging, never unrolled. Surplus from a completed duplex electrical wiring contract.",
    condition: "working",
    pricingType: "fixed",
    price: 38000,
    quantity: 1,
    unit: "roll",
    area: "Jabi",
    pickupNotes: "Pickup near Jabi Lake Mall. Weight is approximately 3.2kg.",
    images: [
      { src: photo("1544816155-12df9643f363"), alt: "Heavy gauge copper electrical wiring roll" },
    ],
  },
  {
    categorySlug: "plumbing-materials",
    slug: "praise-brass-gate-valves-ppr-fittings-lot",
    title: "Brass Gate Valves & PPR Pipe Fittings Lot (1 inch & 3/4 inch, 24 pcs)",
    description:
      "Job lot of brand new plumbing hardware: 4 heavy brass gate valves (1-inch), 6 brass stopcocks (3/4-inch), and 14 assorted brass-threaded PPR elbows, unions, and tees. Premium brass threads, no leaks, rated PN20. Surplus stock from an estate plumbing contract.",
    condition: "working",
    pricingType: "fixed",
    price: 32000,
    quantity: 1,
    unit: "lot",
    area: "Utako",
    pickupNotes: "Collection at Utako market plumbing lane or near Utako district hospital.",
    images: [
      { src: photo("1581092580497-e0d23cbdf1dc"), alt: "Brass valves and plumbing pipe fittings" },
    ],
  },
  {
    categorySlug: "industrial-equipment",
    slug: "praise-three-phase-electric-motor-3hp",
    title: "Three-Phase AC Electric Motor — 3HP (2.2kW), 1420 RPM, Flange Mount",
    description:
      "ABB heavy duty 3-phase induction motor, 3HP / 2.2kW, 1420 RPM, 380-415V, IP55 enclosure with B5 flange mount. Tested on three-phase line at our workshop: runs quiet, drawing nominal no-load current with balanced winding resistance across all 3 phases. Suitable for conveyor drives, grain mills, hydraulic pumps, or workshop blowers.",
    condition: "working",
    pricingType: "negotiable",
    price: 145000,
    quantity: 1,
    unit: "item",
    area: "Idu Industrial",
    pickupNotes: "Pickup from Idu Industrial Area Phase 1. Loading crane available on site if you bring a trailer or truck.",
    images: [
      { src: photo("1581092335397-9583fe92d232"), alt: "Three phase electric induction motor" },
      { src: photo("1581092160562-40aa08e78837"), alt: "Industrial machinery equipment" },
    ],
  },
];

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    console.log("Generating scrypt password hash for", USER_PASSWORD);
    const passwordHash = await hashPassword(USER_PASSWORD);
    const verified = await verifyPassword(USER_PASSWORD, passwordHash);
    if (!verified) {
      throw new Error("Password verification sanity check failed.");
    }
    console.log("Password hash verified successfully.");

    await client.query("begin");
    await client.query("select set_config('app.is_service', 'true', true)");

    // 1. Upsert User
    const userRes = await client.query(
      `insert into public.users (email, email_verified, password_hash, name)
       values ($1, now(), $2, $3)
       on conflict (email) do update set
         email_verified = coalesce(public.users.email_verified, now()),
         password_hash = excluded.password_hash,
         name = excluded.name,
         updated_at = now()
       returning id`,
      [USER_EMAIL, passwordHash, USER_NAME],
    );
    const userId = userRes.rows[0].id;
    console.log(`User created/updated with ID: ${userId} (${USER_EMAIL})`);

    // 2. Upsert Profile
    await client.query(
      `insert into public.profiles
         (id, display_name, username, city, area, account_type, bio, phone, phone_is_whatsapp, instagram_handle, x_handle, default_area, default_pickup_notes)
       values ($1, $2, $3, 'Abuja', 'Garki', 'individual',
         'Abuja based seller of quality surplus materials, electronics, parts, and industrial equipment.',
         '+2348031234567', true, 'praisejournal2', 'praisejournal2', 'Garki', 'Available for pickup in Garki, Abuja. Call or message ahead.')
       on conflict (id) do update set
         display_name = excluded.display_name,
         username = excluded.username,
         phone = excluded.phone,
         phone_is_whatsapp = excluded.phone_is_whatsapp,
         instagram_handle = excluded.instagram_handle,
         x_handle = excluded.x_handle,
         city = excluded.city,
         area = excluded.area,
         bio = excluded.bio`,
      [userId, USER_NAME, USER_USERNAME],
    );
    console.log("Profile created/updated.");

    // 3. Upsert Notification Preferences
    await client.query(
      `insert into public.notification_preferences (user_id, messages, sale_updates, listing_updates)
       values ($1, true, true, true)
       on conflict (user_id) do nothing`,
      [userId],
    );

    // 4. Fetch Category Map
    const catRes = await client.query(
      "select id, slug from public.categories where is_active = true",
    );
    const categoryMap = new Map<string, string>(
      catRes.rows.map((row: { id: string; slug: string }) => [row.slug, row.id]),
    );

    // 5. Insert 10 listings
    console.log(`Inserting ${items.length} listings across categories...`);
    for (const [index, item] of items.entries()) {
      const categoryId = categoryMap.get(item.categorySlug);
      if (!categoryId) {
        throw new Error(`Category not found: ${item.categorySlug}`);
      }

      // Stagger published_at so they look natural
      const hoursAgo = index * 3 + 1;
      const listingRes = await client.query(
        `insert into public.listings
           (seller_id, category_id, title, slug, description, condition, item_status,
            pricing_type, price, negotiable, quantity, quantity_unit, city, area,
            pickup_notes, published_at, expires_at)
         values ($1, $2, $3, $4, $5, $6, 'published',
                 $7, $8, $9, $10, $11, 'Abuja', $12,
                 $13, now() - ($14 || ' hours')::interval, now() + interval '60 days')
         on conflict (slug) do update set
           seller_id = excluded.seller_id,
           category_id = excluded.category_id,
           title = excluded.title,
           description = excluded.description,
           condition = excluded.condition,
           item_status = 'published',
           pricing_type = excluded.pricing_type,
           price = excluded.price,
           negotiable = excluded.negotiable,
           quantity = excluded.quantity,
           quantity_unit = excluded.quantity_unit,
           city = excluded.city,
           area = excluded.area,
           pickup_notes = excluded.pickup_notes,
           published_at = excluded.published_at,
           expires_at = excluded.expires_at,
           updated_at = now()
         returning id`,
        [
          userId,
          categoryId,
          item.title,
          item.slug,
          item.description,
          item.condition,
          item.pricingType,
          item.price,
          item.pricingType === "negotiable",
          item.quantity,
          item.unit,
          item.area,
          item.pickupNotes,
          String(hoursAgo),
        ],
      );

      const listingId = listingRes.rows[0].id;

      // Clean old images and insert new ones
      await client.query("delete from public.listing_images where listing_id = $1", [listingId]);
      for (const [imgIndex, img] of item.images.entries()) {
        await client.query(
          `insert into public.listing_images (listing_id, storage_path, alt_text, sort_order)
           values ($1, $2, $3, $4)`,
          [listingId, img.src, img.alt, imgIndex],
        );
      }

      console.log(`  ✓ [${item.categorySlug}] "${item.title}" -> ${item.slug}`);
    }

    await client.query("commit");
    console.log("\nSuccess! All 10 items in 10 different categories created for praisejournal2@gmail.com.");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.error("Error seeding user and listings:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
