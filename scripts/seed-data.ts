/**
 * Seed catalogue. Prices are in rupees here for readability and converted to
 * paise by the seed script. Dimensions in cm.
 */

export type SeedVariant = { colour: string; hex: string; stock: number; priceOverride?: number };

export type SeedProduct = {
  name: string;
  material: string;
  dims: [width: number, depth: number, height: number];
  price: number;
  discount?: number;
  featured?: boolean;
  stock?: number; // only for products without variants
  variants?: SeedVariant[];
  specs: Record<string, string>;
  description: string;
};

export type SeedCategory = {
  name: string;
  slug: string;
  description: string;
  products: SeedProduct[];
};

const warranty1 = { Warranty: "1 year manufacturer warranty" };
const warranty3 = { Warranty: "3 years manufacturer warranty" };
const assembly = { Assembly: "Free assembly by our team" };
const diy = { Assembly: "Self assembly, tools included" };

export const CATEGORIES: SeedCategory[] = [
  {
    name: "Sofas",
    slug: "sofas",
    description: "Three-seaters, sectionals and loveseats built for Indian living rooms.",
    products: [
      {
        name: "Oslo 3 Seater Fabric Sofa",
        material: "Fabric",
        dims: [210, 88, 84],
        price: 52999,
        discount: 44999,
        featured: true,
        variants: [
          { colour: "Ash Grey", hex: "#8A8D8F", stock: 12 },
          { colour: "Teal Blue", hex: "#1F6F78", stock: 6 },
          { colour: "Mustard", hex: "#D4A017", stock: 3 },
        ],
        specs: { Frame: "Kiln-dried pine", Seating: "High-resilience foam, 40 density", Legs: "Solid sheesham", ...warranty3, ...assembly },
        description: "Deep seats, tight back cushions and a solid wood frame. A sofa that holds its shape through years of family evenings.",
      },
      {
        name: "Verona L-Shaped Sectional Sofa",
        material: "Fabric",
        dims: [265, 180, 86],
        price: 89999,
        discount: 79999,
        variants: [
          { colour: "Charcoal", hex: "#36454F", stock: 4 },
          { colour: "Beige", hex: "#D8C8A8", stock: 5 },
        ],
        specs: { Frame: "Engineered wood and pine", Seating: "Pocket springs with foam", Configuration: "Left or right chaise", ...warranty3, ...assembly },
        description: "A roomy sectional with a reversible chaise, so it fits whichever corner your living room has.",
      },
      {
        name: "Aria Leatherette 2 Seater Sofa",
        material: "Leatherette",
        dims: [158, 85, 82],
        price: 34999,
        variants: [
          { colour: "Tan", hex: "#A0522D", stock: 8 },
          { colour: "Black", hex: "#1C1C1C", stock: 10 },
        ],
        specs: { Frame: "Solid wood", Upholstery: "PU leatherette, easy to wipe", ...warranty1, ...assembly },
        description: "Compact and easy to clean, the Aria suits studio apartments and cabins alike.",
      },
      {
        name: "Kaveri Sheesham Wood Sofa Set (3+1+1)",
        material: "Sheesham Wood",
        dims: [190, 80, 85],
        price: 74999,
        discount: 68999,
        featured: true,
        variants: [
          { colour: "Honey Finish", hex: "#C68E3F", stock: 3 },
          { colour: "Walnut Finish", hex: "#5C4033", stock: 2 },
        ],
        specs: { Wood: "Solid sheesham (Indian rosewood)", Cushions: "Removable, washable covers", Pieces: "One 3-seater, two 1-seaters", ...warranty3, ...assembly },
        description: "Hand-finished solid sheesham with removable cushions. A traditional set that never dates.",
      },
    ],
  },
  {
    name: "Beds",
    slug: "beds",
    description: "Queen and king beds with and without storage.",
    products: [
      {
        name: "Nilgiri King Size Bed with Hydraulic Storage",
        material: "Engineered Wood",
        dims: [193, 213, 95],
        price: 45999,
        discount: 38999,
        featured: true,
        variants: [
          { colour: "Walnut", hex: "#5C4033", stock: 7 },
          { colour: "Wenge", hex: "#3B2F2F", stock: 5 },
        ],
        specs: { Storage: "Full hydraulic lift-up storage", "Mattress size": "72 x 78 inches", "Weight capacity": "300 kg", ...warranty3, ...assembly },
        description: "Lift the base on gas struts to reach a full-size storage bay. Room for every quilt and suitcase.",
      },
      {
        name: "Sahyadri Solid Wood Queen Bed",
        material: "Sheesham Wood",
        dims: [165, 208, 100],
        price: 54999,
        variants: [
          { colour: "Natural Finish", hex: "#C8A165", stock: 4 },
          { colour: "Provincial Teak", hex: "#7B4B2A", stock: 3 },
        ],
        specs: { Wood: "Solid sheesham", "Mattress size": "60 x 78 inches", Headboard: "Slatted solid wood", ...warranty3, ...assembly },
        description: "Solid sheesham with an open slatted headboard. Joinery made to last decades.",
      },
      {
        name: "Luna Upholstered Queen Bed",
        material: "Fabric",
        dims: [170, 215, 110],
        price: 39999,
        discount: 34999,
        variants: [
          { colour: "Dusty Pink", hex: "#D8A7A7", stock: 4 },
          { colour: "Slate Grey", hex: "#708090", stock: 6 },
        ],
        specs: { Headboard: "Channel-tufted velvet", "Mattress size": "60 x 78 inches", ...warranty1, ...assembly },
        description: "A soft channel-tufted headboard and a slim upholstered frame for a calm, hotel-style bedroom.",
      },
      {
        name: "Metro Metal Single Bed",
        material: "Metal",
        dims: [98, 198, 90],
        price: 12999,
        stock: 20,
        specs: { Frame: "Powder-coated steel", "Mattress size": "36 x 75 inches", ...warranty1, ...diy },
        description: "A sturdy powder-coated steel bed for kids' rooms, guest rooms and hostels.",
      },
    ],
  },
  {
    name: "Dining Tables",
    slug: "dining-tables",
    description: "Four, six and eight seater dining sets.",
    products: [
      {
        name: "Tuscany 6 Seater Dining Set",
        material: "Sheesham Wood",
        dims: [180, 90, 76],
        price: 64999,
        discount: 57999,
        featured: true,
        variants: [
          { colour: "Honey Finish", hex: "#C68E3F", stock: 3 },
          { colour: "Walnut Finish", hex: "#5C4033", stock: 3 },
        ],
        specs: { Seats: "6", Includes: "Table and 6 cushioned chairs", Tabletop: "Solid wood", ...warranty3, ...assembly },
        description: "A generous solid-wood table with six cushioned chairs, sized for Sunday lunches.",
      },
      {
        name: "Marbella Marble Top 4 Seater Dining Set",
        material: "Marble",
        dims: [120, 80, 76],
        price: 72999,
        variants: [
          { colour: "White Marble", hex: "#F2F0EB", stock: 2 },
          { colour: "Black Marquina", hex: "#222222", stock: 2, priceOverride: 77999 },
        ],
        specs: { Tabletop: "Natural marble, sealed", Base: "Solid wood", Seats: "4", ...warranty1, ...assembly },
        description: "A sealed natural marble top on a solid wood base. Each slab's veining is unique.",
      },
      {
        name: "Nordic 4 Seater Dining Table",
        material: "Mango Wood",
        dims: [120, 75, 75],
        price: 24999,
        stock: 9,
        specs: { Seats: "4", Includes: "Table only", ...warranty1, ...diy },
        description: "A clean, Scandinavian-style mango wood table that pairs with any chairs.",
      },
      {
        name: "Fold-Away Wall Mounted Dining Table",
        material: "Engineered Wood",
        dims: [90, 60, 75],
        price: 7999,
        discount: 6499,
        stock: 25,
        specs: { Seats: "2", Feature: "Folds flat against the wall", ...warranty1, ...diy },
        description: "Folds down when you need it, flat against the wall when you don't. Built for compact kitchens.",
      },
    ],
  },
  {
    name: "Chairs",
    slug: "chairs",
    description: "Accent, dining, office and lounge chairs.",
    products: [
      {
        name: "Ergo Pro High Back Office Chair",
        material: "Mesh",
        dims: [66, 66, 125],
        price: 18999,
        discount: 14999,
        featured: true,
        variants: [
          { colour: "Black", hex: "#1C1C1C", stock: 30 },
          { colour: "Grey", hex: "#808080", stock: 15 },
        ],
        specs: { Support: "Adjustable lumbar and headrest", Armrests: "3D adjustable", Base: "Nylon, 5 castors", ...warranty3, ...diy },
        description: "Adjustable lumbar support, a breathable mesh back and 3D armrests for long workdays.",
      },
      {
        name: "Rattan Accent Armchair",
        material: "Rattan",
        dims: [70, 72, 80],
        price: 16999,
        variants: [{ colour: "Natural Cane", hex: "#D2B48C", stock: 8 }],
        specs: { Frame: "Solid teak", Weave: "Hand-woven natural rattan", Cushion: "Included", ...warranty1, ...assembly },
        description: "Hand-woven cane on a teak frame. A light, airy chair for balconies and reading corners.",
      },
      {
        name: "Bentwood Dining Chair (Set of 2)",
        material: "Beech Wood",
        dims: [45, 52, 85],
        price: 11999,
        variants: [
          { colour: "Natural", hex: "#DEB887", stock: 14 },
          { colour: "Black", hex: "#1C1C1C", stock: 10 },
        ],
        specs: { Pieces: "2 chairs", Seat: "Solid wood", ...warranty1, ...diy },
        description: "A classic café silhouette in steam-bent beech, sold as a pair.",
      },
      {
        name: "Cloud Lounge Chair with Ottoman",
        material: "Fabric",
        dims: [85, 90, 95],
        price: 27999,
        discount: 23999,
        variants: [
          { colour: "Ivory Boucle", hex: "#F3EFE0", stock: 5 },
          { colour: "Olive", hex: "#708238", stock: 4 },
        ],
        specs: { Includes: "Chair and matching ottoman", Fill: "Feather-blend cushions", ...warranty1, ...assembly },
        description: "Sink-in comfort with a matching ottoman. The chair everyone ends up fighting over.",
      },
    ],
  },
  {
    name: "Wardrobes",
    slug: "wardrobes",
    description: "Two, three and four door wardrobes with mirrors and lockers.",
    products: [
      {
        name: "Malabar 3 Door Wardrobe with Mirror",
        material: "Engineered Wood",
        dims: [135, 55, 200],
        price: 38999,
        discount: 32999,
        featured: true,
        variants: [
          { colour: "Walnut", hex: "#5C4033", stock: 6 },
          { colour: "Frosty White", hex: "#F5F5F0", stock: 4 },
        ],
        specs: { Doors: "3 including 1 mirror door", Inside: "Hanging rail, 4 shelves, locker drawer", ...warranty3, ...assembly },
        description: "A full-length mirror door, a hanging section and a locking drawer for valuables.",
      },
      {
        name: "Konkan Sheesham 2 Door Wardrobe",
        material: "Sheesham Wood",
        dims: [100, 55, 190],
        price: 49999,
        variants: [{ colour: "Honey Finish", hex: "#C68E3F", stock: 3 }],
        specs: { Wood: "Solid sheesham", Inside: "Hanging rail, 3 shelves", ...warranty3, ...assembly },
        description: "Solid sheesham with brass-finish handles. Heirloom storage.",
      },
      {
        name: "Slide 4 Door Sliding Wardrobe",
        material: "Engineered Wood",
        dims: [180, 60, 210],
        price: 64999,
        discount: 59999,
        variants: [
          { colour: "Graphite", hex: "#383838", stock: 2 },
          { colour: "Oak", hex: "#C3A27A", stock: 3 },
        ],
        specs: { Doors: "Soft-close sliding", Inside: "2 hanging rails, 6 shelves, 2 drawers", ...warranty3, ...assembly },
        description: "Soft-close sliding doors save floor space in tighter bedrooms.",
      },
      {
        name: "Compact 2 Door Metal Almirah",
        material: "Metal",
        dims: [90, 50, 180],
        price: 15999,
        stock: 18,
        specs: { Lock: "Multi-point locker", Finish: "Powder-coated steel", ...warranty1 },
        description: "A sturdy steel almirah with a built-in locker. Practical and termite-proof.",
      },
    ],
  },
  {
    name: "TV Units",
    slug: "tv-units",
    description: "Wall-mounted and floor-standing TV units for screens up to 75 inches.",
    products: [
      {
        name: "Horizon Wall Mounted TV Unit",
        material: "Engineered Wood",
        dims: [180, 30, 45],
        price: 17999,
        discount: 14999,
        variants: [
          { colour: "Walnut and White", hex: "#7A5C3E", stock: 10 },
          { colour: "Matte Black", hex: "#2B2B2B", stock: 8 },
        ],
        specs: { "TV size": "Up to 65 inches", Storage: "2 drop-down cabinets, open shelf", ...warranty1, ...assembly },
        description: "A floating unit with cable management, keeping the floor clear and the wiring hidden.",
      },
      {
        name: "Jodhpur Solid Wood TV Console",
        material: "Mango Wood",
        dims: [160, 45, 55],
        price: 29999,
        featured: true,
        variants: [{ colour: "Natural Finish", hex: "#C8A165", stock: 5 }],
        specs: { "TV size": "Up to 75 inches", Storage: "2 drawers, 2 cabinets", ...warranty3, ...assembly },
        description: "Carved mango wood drawers bring a touch of Rajasthan to your living room.",
      },
      {
        name: "Minimal Floor TV Stand",
        material: "Engineered Wood",
        dims: [120, 40, 50],
        price: 8999,
        stock: 22,
        specs: { "TV size": "Up to 50 inches", ...warranty1, ...diy },
        description: "A simple, low stand that suits smaller screens and smaller rooms.",
      },
      {
        name: "Fluted Panel TV Unit with Ambient Light",
        material: "Engineered Wood",
        dims: [200, 40, 50],
        price: 34999,
        discount: 31999,
        variants: [
          { colour: "Oak", hex: "#C3A27A", stock: 4 },
          { colour: "Charcoal", hex: "#36454F", stock: 3 },
        ],
        specs: { Lighting: "Warm LED strip", "TV size": "Up to 75 inches", ...warranty1, ...assembly },
        description: "Fluted front panels and a warm LED glow for a modern media wall.",
      },
    ],
  },
  {
    name: "Study Tables",
    slug: "study-tables",
    description: "Desks for work from home, study and gaming.",
    products: [
      {
        name: "FocusDesk Height Adjustable Standing Desk",
        material: "Metal",
        dims: [140, 70, 125],
        price: 32999,
        discount: 27999,
        featured: true,
        variants: [
          { colour: "Walnut Top", hex: "#5C4033", stock: 9 },
          { colour: "White Top", hex: "#F5F5F5", stock: 7 },
        ],
        specs: { Motor: "Dual motor, 4 memory presets", "Height range": "70 to 125 cm", ...warranty3, ...diy },
        description: "Dual motors take you from sitting to standing in seconds. Four memory presets.",
      },
      {
        name: "Scholar Study Table with Bookshelf",
        material: "Engineered Wood",
        dims: [110, 55, 150],
        price: 13999,
        variants: [
          { colour: "Wenge", hex: "#3B2F2F", stock: 12 },
          { colour: "Light Oak", hex: "#D2B48C", stock: 10 },
        ],
        specs: { Storage: "Hutch bookshelf, 2 drawers", ...warranty1, ...diy },
        description: "A desk and bookshelf in one, made for students who need everything within reach.",
      },
      {
        name: "Teak Writing Desk",
        material: "Teak Wood",
        dims: [120, 60, 76],
        price: 36999,
        stock: 4,
        specs: { Wood: "Solid teak", Storage: "1 drawer", ...warranty3, ...assembly },
        description: "A slender solid teak writing desk with a single drawer. Quietly elegant.",
      },
      {
        name: "Compact Laptop Table",
        material: "Engineered Wood",
        dims: [80, 45, 75],
        price: 4999,
        discount: 3999,
        stock: 40,
        specs: { Feature: "Fits in 80 cm wide spaces", ...warranty1, ...diy },
        description: "A small, stable laptop desk for tight corners and bedrooms.",
      },
    ],
  },
  {
    name: "Coffee Tables",
    slug: "coffee-tables",
    description: "Centre tables, nesting tables and side tables.",
    products: [
      {
        name: "Arc Nesting Coffee Tables (Set of 2)",
        material: "Mango Wood",
        dims: [80, 80, 42],
        price: 15999,
        discount: 13499,
        variants: [
          { colour: "Natural", hex: "#C8A165", stock: 8 },
          { colour: "Dark Walnut", hex: "#4B3621", stock: 6 },
        ],
        specs: { Pieces: "2 nesting tables", ...warranty1 },
        description: "Two round tables that nest together or pull apart when guests arrive.",
      },
      {
        name: "Carrara Marble Coffee Table",
        material: "Marble",
        dims: [100, 60, 40],
        price: 42999,
        featured: true,
        variants: [{ colour: "White Marble", hex: "#F2F0EB", stock: 3 }],
        specs: { Top: "Natural Carrara-style marble", Base: "Brushed brass-finish steel", ...warranty1, ...assembly },
        description: "A marble slab on a brushed brass-finish base. A statement piece.",
      },
      {
        name: "Lift-Top Storage Coffee Table",
        material: "Engineered Wood",
        dims: [110, 55, 45],
        price: 14999,
        variants: [
          { colour: "Walnut", hex: "#5C4033", stock: 10 },
          { colour: "White", hex: "#F5F5F5", stock: 6 },
        ],
        specs: { Feature: "Lift-up top doubles as a work surface", Storage: "Hidden compartment", ...warranty1, ...diy },
        description: "The top lifts to laptop height and reveals hidden storage underneath.",
      },
      {
        name: "Teak Root Side Table",
        material: "Teak Wood",
        dims: [45, 45, 50],
        price: 9999,
        stock: 6,
        specs: { Note: "Each piece is unique in shape", ...warranty1 },
        description: "Carved from reclaimed teak root. No two are alike.",
      },
    ],
  },
  {
    name: "Cabinets",
    slug: "cabinets",
    description: "Sideboards, shoe racks, bookcases and storage cabinets.",
    products: [
      {
        name: "Heritage Sheesham Sideboard",
        material: "Sheesham Wood",
        dims: [150, 45, 80],
        price: 39999,
        discount: 35999,
        variants: [
          { colour: "Honey Finish", hex: "#C68E3F", stock: 4 },
          { colour: "Walnut Finish", hex: "#5C4033", stock: 3 },
        ],
        specs: { Storage: "3 drawers, 2 cabinets", ...warranty3, ...assembly },
        description: "A solid wood sideboard for crockery, linen or a bar.",
      },
      {
        name: "Stride Shoe Cabinet (20 Pairs)",
        material: "Engineered Wood",
        dims: [80, 35, 110],
        price: 9999,
        variants: [
          { colour: "Wenge", hex: "#3B2F2F", stock: 15 },
          { colour: "Frosty White", hex: "#F5F5F0", stock: 12 },
        ],
        specs: { Capacity: "20 pairs", Doors: "Tilt-out", ...warranty1, ...diy },
        description: "Slim tilt-out shoe storage that fits behind the front door.",
      },
      {
        name: "Ladder Bookshelf 5 Tier",
        material: "Metal",
        dims: [60, 35, 180],
        price: 6999,
        stock: 30,
        specs: { Tiers: "5", Frame: "Powder-coated steel", ...warranty1, ...diy },
        description: "Five open tiers in steel and wood for books, plants and keepsakes.",
      },
      {
        name: "Crockery Cabinet with Glass Doors",
        material: "Engineered Wood",
        dims: [90, 40, 180],
        price: 21999,
        discount: 18999,
        variants: [{ colour: "Walnut", hex: "#5C4033", stock: 5 }],
        specs: { Doors: "Toughened glass", Lighting: "LED shelf light", ...warranty1, ...assembly },
        description: "Show off your best dinnerware behind toughened glass with soft LED lighting.",
      },
    ],
  },
  {
    name: "Home Decor",
    slug: "home-decor",
    description: "Mirrors, lamps, rugs and finishing touches.",
    products: [
      {
        name: "Sunburst Wall Mirror",
        material: "Metal",
        dims: [80, 4, 80],
        price: 7999,
        discount: 6499,
        variants: [
          { colour: "Antique Gold", hex: "#B8860B", stock: 10 },
          { colour: "Black", hex: "#1C1C1C", stock: 8 },
        ],
        specs: { Mounting: "Wall hook included", ...warranty1 },
        description: "A handcrafted metal sunburst frame that lights up an entryway.",
      },
      {
        name: "Jaipur Hand-Knotted Wool Rug",
        material: "Wool",
        dims: [240, 160, 1],
        price: 24999,
        featured: true,
        variants: [
          { colour: "Indigo", hex: "#3F51B5", stock: 4 },
          { colour: "Terracotta", hex: "#E2725B", stock: 4 },
        ],
        specs: { Size: "8 x 5 ft", Construction: "Hand-knotted, 100% wool", Care: "Professional dry clean" },
        description: "Hand-knotted in Jaipur from 100% wool. Rich colour and a dense, soft pile.",
      },
      {
        name: "Arc Floor Lamp",
        material: "Metal",
        dims: [40, 160, 190],
        price: 9999,
        stock: 14,
        specs: { Bulb: "E27, not included", Base: "Marble", ...warranty1, ...diy },
        description: "An arching floor lamp with a marble base that reaches over the sofa.",
      },
      {
        name: "Terracotta Planter Set (Set of 3)",
        material: "Terracotta",
        dims: [30, 30, 35],
        price: 2999,
        discount: 2499,
        stock: 50,
        specs: { Pieces: "3 sizes", Drainage: "Drainage hole and saucer" },
        description: "Handmade terracotta planters in three sizes, with saucers.",
      },
    ],
  },
];

/** Pune is the priority market; other metros are sampled. */
export const PINCODES: Array<{
  pincode: string;
  city: string;
  state: string;
  standard_days: number;
  express_available: boolean;
  express_days: number | null;
}> = [
  // Pune city and PCMC: 411001 - 411062
  ...Array.from({ length: 62 }, (_, i) => ({
    pincode: String(411001 + i),
    city: "Pune",
    state: "Maharashtra",
    standard_days: 5,
    express_available: true,
    express_days: 2,
  })),
  // Pune district outskirts: standard only
  ...["412101", "412105", "412106", "412115", "412207", "412208", "412308", "410501", "410506", "410507"].map(
    (pincode) => ({
      pincode,
      city: "Pune District",
      state: "Maharashtra",
      standard_days: 7,
      express_available: false,
      express_days: null,
    }),
  ),
  ...["400001", "400050", "400053", "400058", "400076", "400097", "400101", "400703", "421301"].map((pincode) => ({
    pincode,
    city: pincode.startsWith("4007") || pincode.startsWith("4213") ? "Thane / Navi Mumbai" : "Mumbai",
    state: "Maharashtra",
    standard_days: 5,
    express_available: true,
    express_days: 3,
  })),
  ...["560001", "560034", "560038", "560066", "560076", "560102"].map((pincode) => ({
    pincode, city: "Bengaluru", state: "Karnataka", standard_days: 7, express_available: true, express_days: 3,
  })),
  ...["110001", "110016", "110017", "110024", "110048", "122002", "201301"].map((pincode) => ({
    pincode,
    city: pincode.startsWith("122") ? "Gurugram" : pincode.startsWith("201") ? "Noida" : "New Delhi",
    state: pincode.startsWith("122") ? "Haryana" : pincode.startsWith("201") ? "Uttar Pradesh" : "Delhi",
    standard_days: 7,
    express_available: true,
    express_days: 3,
  })),
  ...["500001", "500032", "500081", "500084"].map((pincode) => ({
    pincode, city: "Hyderabad", state: "Telangana", standard_days: 7, express_available: true, express_days: 3,
  })),
  ...["600001", "600017", "600040", "600096"].map((pincode) => ({
    pincode, city: "Chennai", state: "Tamil Nadu", standard_days: 7, express_available: false, express_days: null,
  })),
];

export const DELIVERY_METHODS = [
  { code: "standard", name: "Standard Delivery", description: "Free delivery in 5 to 7 days", price_paise: 0, min_days: 5, max_days: 7, is_express: false, sort_order: 1 },
  { code: "express", name: "Express Delivery", description: "Delivered in 2 to 3 days", price_paise: 49900, min_days: 2, max_days: 3, is_express: true, sort_order: 2 },
];

const day = 24 * 60 * 60 * 1000;

export function seedCoupons(now = new Date()) {
  const iso = (offsetDays: number) => new Date(now.getTime() + offsetDays * day).toISOString();
  return [
    { code: "WELCOME10", description: "10% off your first order, up to ₹2,000", type: "percent" as const, value: 10, min_order_paise: 500000, max_discount_paise: 200000, starts_at: iso(-1), ends_at: null, usage_limit: null, per_user_limit: 1, is_active: true },
    { code: "FLAT1000", description: "₹1,000 off orders above ₹15,000", type: "flat" as const, value: 100000, min_order_paise: 1500000, max_discount_paise: null, starts_at: iso(-1), ends_at: iso(90), usage_limit: 1000, per_user_limit: 2, is_active: true },
    { code: "FESTIVE15", description: "15% off orders above ₹25,000, up to ₹5,000", type: "percent" as const, value: 15, min_order_paise: 2500000, max_discount_paise: 500000, starts_at: iso(-1), ends_at: iso(60), usage_limit: 500, per_user_limit: 1, is_active: true },
    { code: "EXPIRED5", description: "Expired coupon for testing", type: "percent" as const, value: 5, min_order_paise: 0, max_discount_paise: null, starts_at: iso(-60), ends_at: iso(-30), usage_limit: null, per_user_limit: null, is_active: true },
    { code: "PAUSED20", description: "Inactive coupon for testing", type: "percent" as const, value: 20, min_order_paise: 0, max_discount_paise: null, starts_at: iso(-1), ends_at: null, usage_limit: null, per_user_limit: null, is_active: false },
  ];
}

export const DEMO_REVIEWERS = [
  { email: "demo.reviewer1@example.com", full_name: "Priya Deshpande" },
  { email: "demo.reviewer2@example.com", full_name: "Rahul Kulkarni" },
  { email: "demo.reviewer3@example.com", full_name: "Ananya Iyer" },
];

export const REVIEW_TEMPLATES = [
  { rating: 5, title: "Excellent quality", body: "Sturdy, well finished and exactly as pictured. Delivery team assembled it neatly." },
  { rating: 4, title: "Very good, minor delay", body: "Lovely piece and very comfortable. Delivery took a day longer than promised." },
  { rating: 5, title: "Worth every rupee", body: "The finish is better than what we saw in showrooms at twice the price." },
  { rating: 3, title: "Good but colour differs", body: "Build quality is fine. The colour is a shade darker than the photos." },
  { rating: 4, title: "Happy with the purchase", body: "Solid and well packed. Would buy again." },
];
