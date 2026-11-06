import { config } from "dotenv";
import pg from "pg";

config({ quiet: true });

const { Client } = pg;

const photo = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;
const avatar = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=256&h=256&q=80`;

const sellers = [
  {
    key: "amina",
    name: "Amina Bello",
    email: "demo.amina@example.com",
    username: "amina.bello",
    image: avatar("1494790108377-be9c29b29330"),
    city: "Abuja",
    area: "Wuse 2",
    account_type: "business",
    bio: "I run a small home and office clearance service in Wuse. Every item is checked, photographed and priced before it goes up, and collections are from our Wuse 2 shop.",
    default_area: "Wuse 2",
    default_pickup_notes:
      "Collection from our Wuse 2 shop, Monday to Saturday, 10am–5pm. Bring a bag or a small van for bulky items.",
  },
  {
    key: "musa",
    name: "Musa Ibrahim",
    email: "demo.musa@example.com",
    username: "musa.spares",
    image: avatar("1500648767791-00dcc994a43e"),
    city: "Abuja",
    area: "Apo",
    account_type: "business",
    bio: "Used auto spares from Apo Mechanic Village. I test every part before listing it and show faults clearly. Bring the old part or a photo if you are unsure about fitment.",
    default_area: "Apo",
    default_pickup_notes:
      "Pickup from our Apo Mechanic Village workshop. Call when you arrive and we will bring the part to the gate.",
  },
  {
    key: "chinedu",
    name: "Chinedu Okafor",
    email: "demo.chinedu@example.com",
    username: "chinedu.rebuild",
    image: avatar("1507003211169-0a1dd7228f2d"),
    city: "Abuja",
    area: "Idu Industrial",
    account_type: "business",
    bio: "We strip and rebuild industrial equipment at Idu. Listings are surplus motors, pumps and workshop machines from jobs we have completed.",
    default_area: "Idu Industrial",
    default_pickup_notes:
      "Collection from our Idu Industrial workshop, weekdays 8am–5pm. A pickup or small truck is recommended for the heavy items.",
  },
  {
    key: "fatima",
    name: "Fatima Sule",
    email: "demo.fatima@example.com",
    username: "fatima.home",
    image: avatar("1534528741775-53994a69daeb"),
    city: "Abuja",
    area: "Garki",
    account_type: "individual",
    bio: "I am clearing out our family home in Garki. Everything listed is from our own house, and I can send extra photos or answer questions before you come to collect.",
    default_area: "Garki",
    default_pickup_notes:
      "Home pickup in Garki. Evenings after 5pm or weekends work best; please message before coming.",
  },
  {
    key: "tunde",
    name: "Tunde Adeyemi",
    email: "demo.tunde@example.com",
    username: "tunde.electrical",
    image: avatar("1506794778202-cad84cf45f1d"),
    city: "Abuja",
    area: "Dei-Dei",
    account_type: "business",
    bio: "Electrical and construction surplus from our Dei-Dei yard. We sell leftover cable, boards and building materials from completed jobs.",
    default_area: "Dei-Dei",
    default_pickup_notes:
      "Collection from our Dei-Dei yard, Monday to Saturday, 9am–6pm. Bring a vehicle for cement blocks, roofing sheets and cable drums.",
  },
];

const listings = [
  {
    seller: "amina",
    category: "electronics",
    slug: "hp-laptop-for-parts-board-fault",
    title: "HP laptop for parts — board fault, screen intact",
    description:
      "HP 14-inch laptop with a board fault: it powers on but does not boot. The screen, keyboard, battery, Wi-Fi card and charger are all present and were working before the fault. Sold for parts or repair; no warranty.",
    condition: "for_parts",
    pricing_type: "negotiable",
    price: 65000,
    quantity: 1,
    unit: "item",
    area: "Wuse 2",
    pickup_notes: "Collection from our Wuse 2 shop. Ask for Amina at the front desk.",
    daysAgo: 1,
    images: [
      { src: photo("1496181133206-80ce9b88a853"), alt: "HP laptop open on a desk" },
      { src: photo("1595246140625-573b715d11dc"), alt: "Laptop components and repair tools" },
    ],
  },
  {
    seller: "amina",
    category: "electronics",
    slug: "android-phones-x6-cracked-screens",
    title: "Android phones x6 — cracked screens, for parts",
    description:
      "Six Android phones from an office clear-out. All power on except one. Screens are cracked on most units; batteries and boards are untested beyond power-on. Sold as one lot for parts or refurbishing.",
    condition: "for_parts",
    pricing_type: "fixed",
    price: 48000,
    quantity: 6,
    unit: "items",
    area: "Wuse 2",
    pickup_notes: "Collection from our Wuse 2 shop. Bring a small bag for the phones.",
    daysAgo: 2,
    images: [
      { src: photo("1558618666-fcd25c85cd64"), alt: "Several used Android phones" },
      { src: photo("1511707171634-5f897ff02aa9"), alt: "Phone repair tools on a workbench" },
    ],
  },
  {
    seller: "amina",
    category: "furniture",
    slug: "solid-wood-dining-chairs-six",
    title: "Six solid-wood dining chairs — need polish",
    description:
      "Six matching solid-wood dining chairs from a Maitama office clearance. Frames are strong and all seats are intact; the finish is faded and would benefit from a sand and polish. No broken joints.",
    condition: "used",
    pricing_type: "negotiable",
    price: 85000,
    quantity: 6,
    unit: "chairs",
    area: "Wuse 2",
    pickup_notes: "Collection from our Wuse 2 shop. A small van is best for all six chairs.",
    daysAgo: 4,
    images: [
      { src: photo("1503602642458-232111445657"), alt: "Wooden dining chairs around a table" },
      { src: photo("1518455027359-f3f8164ba6bd"), alt: "Wooden chair detail in an office" },
    ],
  },
  {
    seller: "amina",
    category: "furniture",
    slug: "three-seater-fabric-sofa-cover-worn",
    title: "3-seater fabric sofa — solid frame, cover worn",
    description:
      "Comfortable three-seater sofa with a solid wood frame and good foam. The fabric cover is worn on the armrests and has a small stain on the right cushion. Suitable for a lounge, shop or office after a cover.",
    condition: "used",
    pricing_type: "negotiable",
    price: 95000,
    quantity: 1,
    unit: "item",
    area: "Wuse 2",
    pickup_notes: "Collection from our Wuse 2 shop. Please bring two people to help carry it.",
    daysAgo: 6,
    images: [
      { src: photo("1616486338812-3dadae4b4ace"), alt: "Three-seater fabric sofa in a living room" },
      { src: photo("1555041469-a586c61ea9bc"), alt: "Sofa cushions and fabric detail" },
    ],
  },
  {
    seller: "musa",
    category: "vehicle-parts",
    slug: "toyota-corolla-2012-gearbox-used",
    title: "Toyota Corolla 2012 gearbox — used, working",
    description:
      "Automatic gearbox pulled from a 2012 Corolla with 148,000km. It shifted cleanly before removal with no slipping or warning lights. Sold as a used unit; ask for the VIN if you need to confirm fitment.",
    condition: "used",
    pricing_type: "fixed",
    price: 320000,
    quantity: 1,
    unit: "item",
    area: "Apo",
    pickup_notes: "Collection from our Apo workshop. The gearbox is heavy, so come with a pickup.",
    daysAgo: 2,
    images: [
      { src: photo("1486262715619-67b85e0b08d3"), alt: "Car gearbox on a workshop floor" },
      { src: photo("1553413077-190dd305871c"), alt: "Used engine and gearbox parts" },
    ],
  },
  {
    seller: "musa",
    category: "vehicle-parts",
    slug: "honda-civic-engine-block-stripped",
    title: "Honda Civic engine block — stripped for rebuild",
    description:
      "Honda Civic engine block stripped for a rebuild. Crank and rods are included; pistons and head are not. The bores will need measuring before machining. Sold as a rebuildable core, not as a running engine.",
    condition: "for_parts",
    pricing_type: "negotiable",
    price: 180000,
    quantity: 1,
    unit: "item",
    area: "Apo",
    pickup_notes: "Collection from our Apo workshop. Bring a pickup or a strong trolley.",
    daysAgo: 5,
    images: [
      { src: photo("1553413077-190dd305871c"), alt: "Stripped engine block in a workshop" },
      { src: photo("1486262715619-67b85e0b08d3"), alt: "Engine components on a bench" },
    ],
  },
  {
    seller: "musa",
    category: "vehicle-parts",
    slug: "tyres-x8-seventy-percent-tread",
    title: "Tyres x8 — ~70% tread, mixed sizes",
    description:
      "Eight used tyres with roughly 70% tread remaining. Sizes are mixed: four 205/55R16 and four 215/60R16. No visible sidewall damage or repairs; one tyre has a scuffed rim protector. Sold as a lot.",
    condition: "used",
    pricing_type: "fixed",
    price: 120000,
    quantity: 8,
    unit: "tyres",
    area: "Apo",
    pickup_notes: "Collection from our Apo workshop. A van or pickup is needed for all eight.",
    daysAgo: 8,
    images: [
      { src: photo("1581092160562-40aa08e78837"), alt: "Stack of used car tyres" },
      { src: photo("1486262715619-67b85e0b08d3"), alt: "Used tyres and car parts in the workshop" },
    ],
  },
  {
    seller: "musa",
    category: "vehicle-parts",
    slug: "car-alternators-x4-tested",
    title: "Car alternators x4 — tested, working",
    description:
      "Four used alternators removed from Toyota and Honda vehicles. All were bench-tested and spin freely with good bearings. Part numbers are visible in the photos; confirm fitment before collecting.",
    condition: "used",
    pricing_type: "fixed",
    price: 90000,
    quantity: 4,
    unit: "alternators",
    area: "Apo",
    pickup_notes: "Collection from our Apo workshop, any weekday before 6pm.",
    daysAgo: 11,
    images: [
      { src: photo("1553413077-190dd305871c"), alt: "Used alternators on a workshop shelf" },
      { src: photo("1486262715619-67b85e0b08d3"), alt: "Automotive parts on a workbench" },
    ],
  },
  {
    seller: "chinedu",
    category: "industrial-equipment",
    slug: "electric-motors-x3-three-phase",
    title: "Electric motors x3 — 3-phase, used",
    description:
      "Three three-phase electric motors from a workshop upgrade. Two run smoothly on the bench; the third turns freely but has not been run under load. Ratings are 3kW, 5.5kW and 7.5kW. Sold together.",
    condition: "used",
    pricing_type: "negotiable",
    price: 240000,
    quantity: 3,
    unit: "motors",
    area: "Idu Industrial",
    pickup_notes: "Collection from our Idu workshop. Bring a pickup; each motor needs two people.",
    daysAgo: 3,
    images: [
      { src: photo("1553413077-190dd305871c"), alt: "Three-phase electric motors" },
      { src: photo("1600585154340-be6161a56a0c"), alt: "Workshop machinery and motors" },
    ],
  },
  {
    seller: "chinedu",
    category: "industrial-equipment",
    slug: "water-pumps-x4-need-seals",
    title: "Water pumps x4 — need seals, sold for spares",
    description:
      "Four centrifugal water pumps from a decommissioned plant room. Motors power on, but the seals leak and the impellers need inspection. Sold for spares or rebuild. No controllers included.",
    condition: "for_parts",
    pricing_type: "fixed",
    price: 95000,
    quantity: 4,
    unit: "pumps",
    area: "Idu Industrial",
    pickup_notes: "Collection from our Idu workshop, weekdays 8am–5pm.",
    daysAgo: 7,
    images: [
      { src: photo("1621905251189-08b45d6a269e"), alt: "Used water pumps in an industrial workshop" },
      { src: photo("1581092160562-40aa08e78837"), alt: "Pump and pipe fittings" },
    ],
  },
  {
    seller: "chinedu",
    category: "industrial-equipment",
    slug: "bench-grinder-drill-press",
    title: "Bench grinder & drill press — workshop surplus",
    description:
      "Bench grinder and pillar drill press from our workshop. Both run on single-phase power and have been used regularly; the drill press chuck turns true and the grinder wheels are included. The drill press stand is not included.",
    condition: "used",
    pricing_type: "fixed",
    price: 275000,
    quantity: 2,
    unit: "machines",
    area: "Idu Industrial",
    pickup_notes: "Collection from our Idu workshop. Bring a pickup for the drill press.",
    daysAgo: 9,
    images: [
      { src: photo("1600585154340-be6161a56a0c"), alt: "Bench grinder and drill press in a workshop" },
      { src: photo("1595246140625-573b715d11dc"), alt: "Workshop tools on a bench" },
    ],
  },
  {
    seller: "chinedu",
    category: "metals",
    slug: "copper-wire-offcuts-25kg",
    title: "Copper wire offcuts — ~25kg from site rewiring",
    description:
      "Approximately 25kg of clean copper wire offcuts from a commercial rewiring job. Insulation has been stripped from most lengths; some pieces still have sheathing. Weighed on our workshop scale; buyer can reweigh at collection.",
    condition: "used",
    pricing_type: "negotiable",
    price: 185000,
    quantity: 25,
    unit: "kg",
    area: "Idu Industrial",
    pickup_notes: "Collection from our Idu workshop. Bring a bag or small crate.",
    daysAgo: 1,
    images: [
      { src: photo("1518709268805-4e9042af9f23"), alt: "Copper wire offcuts bundled together" },
      { src: photo("1504307651254-35680f356dfd"), alt: "Metal offcuts in an industrial yard" },
    ],
  },
  {
    seller: "chinedu",
    category: "metals",
    slug: "aluminium-window-frames-40kg",
    title: "Aluminium window frames — 40kg, glass stripped",
    description:
      "Around 40kg of aluminium window frame sections from a renovation. Glass and most rubber seals have been removed. Pieces are mixed lengths from 40cm to 2.2m; a few are bent. Priced for scrap or reuse.",
    condition: "used",
    pricing_type: "fixed",
    price: 96000,
    quantity: 40,
    unit: "kg",
    area: "Idu Industrial",
    pickup_notes: "Collection from our Idu workshop. The bundle fits in a small van.",
    daysAgo: 12,
    images: [
      { src: photo("1544724569-5f546fd6f2b5"), alt: "Aluminium window frames stacked" },
      { src: photo("1504307651254-35680f356dfd"), alt: "Metal sections in a yard" },
    ],
  },
  {
    seller: "fatima",
    category: "appliances",
    slug: "double-door-fridge-compressor-fault",
    title: "Double-door fridge — compressor fault, for repair",
    description:
      "Double-door fridge from our kitchen. It powers on and the light works, but the compressor does not cool. Shelves and drawers are complete. Good for someone who repairs appliances or needs body parts. Sold as-is.",
    condition: "for_parts",
    pricing_type: "negotiable",
    price: 70000,
    quantity: 1,
    unit: "item",
    area: "Garki",
    pickup_notes: "Home pickup in Garki. Please arrange two people and a van for loading.",
    daysAgo: 3,
    images: [
      { src: photo("1571175443880-49e1d25b2bc5"), alt: "Double-door refrigerator in a kitchen" },
      { src: photo("1584568694244-14fbdf83bd30"), alt: "Fridge shelves and interior" },
    ],
  },
  {
    seller: "fatima",
    category: "appliances",
    slug: "split-ac-units-x3-spares",
    title: "Split AC units x3 — not cooling, spares only",
    description:
      "Three split AC indoor and outdoor units removed during our renovation. All three power on but do not cool; likely low gas or compressor faults. Casings, boards and fans are intact. Sold as one lot for spares.",
    condition: "for_parts",
    pricing_type: "fixed",
    price: 120000,
    quantity: 3,
    unit: "units",
    area: "Garki",
    pickup_notes: "Home pickup in Garki. Units are in the car park; bring a van.",
    daysAgo: 7,
    images: [
      { src: photo("1600121848594-d8644e57abab"), alt: "Split air-conditioning units" },
      { src: photo("1581092160562-40aa08e78837"), alt: "Air-conditioner outdoor unit" },
    ],
  },
  {
    seller: "fatima",
    category: "appliances",
    slug: "gas-cookers-x4-burners-service",
    title: "Gas cookers x4 — burners need a service",
    description:
      "Four freestanding gas cookers from a rental clear-out. Ovens and grills work, but the burner caps need cleaning and two ignition switches are stiff. Hoses are not included. Sold together or in pairs; message first.",
    condition: "used",
    pricing_type: "negotiable",
    price: 140000,
    quantity: 4,
    unit: "cookers",
    area: "Garki",
    pickup_notes: "Home pickup in Garki. Please message before coming to arrange access.",
    daysAgo: 10,
    images: [
      { src: photo("1581244277943-fe4a9c777189"), alt: "Freestanding gas cookers in a kitchen" },
      { src: photo("1556911220-bff31c812dba"), alt: "Gas cooker burners close-up" },
    ],
  },
  {
    seller: "fatima",
    category: "household-items",
    slug: "kitchenware-bundle-pots-pans",
    title: "Kitchenware bundle — pots, pans, utensils",
    description:
      "A boxed bundle of everyday kitchenware: six pots, four frying pans, a colander, bowls and assorted utensils. All are used but clean and usable; the largest pot has a loose handle that needs tightening. Sold as one bundle.",
    condition: "used",
    pricing_type: "fixed",
    price: 35000,
    quantity: 1,
    unit: "bundle",
    area: "Garki",
    pickup_notes: "Home pickup in Garki. The bundle fills one large shopping bag and a box.",
    daysAgo: 4,
    images: [
      { src: photo("1524758631624-e2822e304c36"), alt: "Pots, pans and kitchen utensils" },
      { src: photo("1556911220-bff31c812dba"), alt: "Kitchenware arranged on a counter" },
    ],
  },
  {
    seller: "tunde",
    category: "electrical-materials",
    slug: "armoured-cable-drums-offcuts",
    title: "Armoured cable drums — offcuts, ~60m total",
    description:
      "Leftover armoured cable from a commercial job. Six offcuts measuring roughly 8m to 14m, about 60m in total. Cable is 4-core copper and has been stored dry. Ends are sealed; buyer can inspect and measure before paying.",
    condition: "used",
    pricing_type: "fixed",
    price: 115000,
    quantity: 60,
    unit: "metres",
    area: "Dei-Dei",
    pickup_notes: "Collection from our Dei-Dei yard. Bring a pickup or a cart for the drums.",
    daysAgo: 2,
    images: [
      { src: photo("1544724569-5f546fd6f2b5"), alt: "Armoured cable drums in a yard" },
      { src: photo("1610557892470-55d9e80c0bce"), alt: "Electrical cable and conduit" },
    ],
  },
  {
    seller: "tunde",
    category: "electrical-materials",
    slug: "distribution-boards-x5-used",
    title: "Distribution boards x5 — used, working",
    description:
      "Five used distribution boards removed during an office upgrade. Breakers, busbars and enclosures are included; two boards are missing their clear covers. All were working when removed. Sold as a lot.",
    condition: "used",
    pricing_type: "fixed",
    price: 90000,
    quantity: 5,
    unit: "boards",
    area: "Dei-Dei",
    pickup_notes: "Collection from our Dei-Dei yard, Monday to Saturday.",
    daysAgo: 6,
    images: [
      { src: photo("1567789884554-0b844b597180"), alt: "Electrical distribution boards" },
      { src: photo("1610557892470-55d9e80c0bce"), alt: "Electrical breakers and wiring" },
    ],
  },
  {
    seller: "tunde",
    category: "construction-materials",
    slug: "cement-blocks-x200-dry-stored",
    title: "Cement blocks x200 — over-ordered, dry stored",
    description:
      "Two hundred 6-inch cement blocks left over from a fence project. They have been stored under cover and are dry and clean. A few chipped corners from moving; no cracks. Sold as a lot, collection only.",
    condition: "working",
    pricing_type: "fixed",
    price: 140000,
    quantity: 200,
    unit: "blocks",
    area: "Dei-Dei",
    pickup_notes: "Collection from our Dei-Dei yard. A truck is needed for all 200 blocks.",
    daysAgo: 5,
    images: [
      { src: photo("1560518883-ce09059eeffa"), alt: "Stacked cement blocks" },
      { src: photo("1504307651254-35680f356dfd"), alt: "Construction materials in a yard" },
    ],
  },
  {
    seller: "tunde",
    category: "construction-materials",
    slug: "roofing-sheets-assorted-lengths",
    title: "Roofing sheets — assorted lengths, used",
    description:
      "Used roofing sheets from a shed rebuild. Lengths range from 1.8m to 3.6m, with around 20 sheets in total. Some have surface rust and old nail holes; they are suitable for a store, animal pen or temporary cover.",
    condition: "used",
    pricing_type: "negotiable",
    price: 190000,
    quantity: 20,
    unit: "sheets",
    area: "Dei-Dei",
    pickup_notes: "Collection from our Dei-Dei yard. Bring a truck and gloves for handling.",
    daysAgo: 13,
    images: [
      { src: photo("1621905251189-08b45d6a269e"), alt: "Used roofing sheets stacked" },
      { src: photo("1504307651254-35680f356dfd"), alt: "Roofing and construction materials" },
    ],
  },
];

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const reset = process.argv.includes("--reset");
const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query("begin");
  await client.query("select set_config('app.is_service','true',true)");

  if (reset) {
    const emails = sellers.map((seller) => seller.email);
    const existing = await client.query(
      "select id from public.users where email = any($1::text[])",
      [emails],
    );
    if (existing.rowCount > 0) {
      const ids = existing.rows.map((row) => row.id);
      await client.query("delete from public.listings where seller_id = any($1::uuid[])", [ids]);
      await client.query("delete from public.users where id = any($1::uuid[])", [ids]);
    }
  }

  const categories = await client.query(
    "select id, slug from public.categories where is_active = true",
  );
  const categoryIds = new Map(categories.rows.map((row) => [row.slug, row.id]));

  const sellerIds = new Map();
  for (const seller of sellers) {
    const user = await client.query(
      `insert into public.users (email, email_verified, name, image)
       values ($1, now(), $2, $3)
       on conflict (email) do update
         set email_verified = now(),
             name = excluded.name,
             image = excluded.image,
             updated_at = now()
       returning id`,
      [seller.email, seller.name, seller.image],
    );
    const userId = user.rows[0].id;

    await client.query(
      `insert into public.profiles
         (id, display_name, username, avatar_path, city, area, account_type, bio, default_area, default_pickup_notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (id) do update set
         display_name = excluded.display_name,
         username = excluded.username,
         avatar_path = excluded.avatar_path,
         city = excluded.city,
         area = excluded.area,
         account_type = excluded.account_type,
         bio = excluded.bio,
         default_area = excluded.default_area,
         default_pickup_notes = excluded.default_pickup_notes`,
      [
        userId,
        seller.name,
        seller.username,
        seller.image,
        seller.city,
        seller.area,
        seller.account_type,
        seller.bio,
        seller.default_area,
        seller.default_pickup_notes,
      ],
    );

    sellerIds.set(seller.key, userId);
  }

  for (const listing of listings) {
    const categoryId = categoryIds.get(listing.category);
    if (!categoryId) throw new Error(`Unknown category: ${listing.category}`);
    const sellerId = sellerIds.get(listing.seller);
    if (!sellerId) throw new Error(`Unknown seller: ${listing.seller}`);

    const slug = `demo-${listing.slug}`;
    const inserted = await client.query(
      `insert into public.listings
         (seller_id, category_id, title, slug, description, condition, item_status,
          pricing_type, price, negotiable, quantity, quantity_unit, city, area,
          pickup_notes, published_at, expires_at)
       values ($1,$2,$3,$4,$5,$6,'published',$7,$8,$9,$10,$11,'Abuja',$12,$13,
               now() - ($14 || ' days')::interval,
               now() + interval '60 days')
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
        sellerId,
        categoryId,
        listing.title,
        slug,
        listing.description,
        listing.condition,
        listing.pricing_type,
        listing.price,
        listing.pricing_type === "negotiable",
        listing.quantity,
        listing.unit,
        listing.area,
        listing.pickup_notes,
        String(listing.daysAgo),
      ],
    );

    const listingId = inserted.rows[0].id;
    await client.query("delete from public.listing_images where listing_id = $1", [listingId]);
    for (const [index, image] of listing.images.entries()) {
      await client.query(
        `insert into public.listing_images (listing_id, storage_path, alt_text, sort_order)
         values ($1,$2,$3,$4)`,
        [listingId, image.src, image.alt, index],
      );
    }
  }

  await client.query("commit");

  const totals = await client.query(
    `select
       (select count(*)::int from public.users where email = any($1::text[])) as sellers,
       (select count(*)::int from public.listings l
          join public.users u on u.id = l.seller_id
         where u.email = any($1::text[])
           and l.slug like 'demo-%') as listings`,
    [sellers.map((seller) => seller.email)],
  );
  console.log(
    `Seeded ${totals.rows[0].sellers} demo sellers and ${totals.rows[0].listings} listings.`,
  );
  console.log(
    "Demo login emails: " + sellers.map((seller) => seller.email).join(", "),
  );
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}
