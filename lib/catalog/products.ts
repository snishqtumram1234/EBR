/**
 * TEMPORARY in-code catalogue (from the Aurelle design) used until the
 * database is connected. Public display data, safe for the browser. The
 * server prices orders from this same list, so a client can never send its
 * own price; once Supabase is connected these come from the products table.
 *
 * Prices are integer paise.
 */

export type Product = {
  id: string; // slug
  num: number;
  name: string;
  kind: ProductKind;
  catName: string;
  pricePaise: number;
  mrpPaise: number;
  rating: number;
  bg: string;
  material: string;
  dims: string;
  desc: string;
  image: string;
  /** Hidden products are buyable (for payment testing) but not listed. */
  hidden?: boolean;
};

export type ProductKind =
  | "study"
  | "chair"
  | "sofa"
  | "bed"
  | "dining"
  | "wardrobe"
  | "tv"
  | "coffee"
  | "cabinet"
  | "decor"
  | "test";

export const KIND_IMAGES: Record<Exclude<ProductKind, "test">, string> = {
  sofa: "/images/sofa.jpg",
  chair: "/images/lounge-chair.jpg",
  bed: "/images/platform-bed.jpg",
  dining: "/images/dining-set.jpg",
  wardrobe: "/images/wardrobe.jpg",
  tv: "/images/tv-unit.jpg",
  study: "/images/study-table.jpg",
  coffee: "/images/coffee-table.jpg",
  cabinet: "/images/sideboard.jpg",
  decor: "/images/decor-set.jpg",
};

const rs = (rupees: number) => rupees * 100;

export const PRODUCTS: Product[] = [
  { id: "modern-oak-study-table", num: 1, name: "Modern Oak Study Table", kind: "study", catName: "Study tables", pricePaise: rs(14999), mrpPaise: rs(19999), rating: 4.8, bg: "#E4D6C1", material: "Solid oak wood", dims: "120 × 60 × 75 cm", desc: "A clean-lined desk with a soft-close drawer, built to make long work days feel lighter.", image: KIND_IMAGES.study },
  { id: "modern-lounge-chair", num: 2, name: "Modern Lounge Chair", kind: "chair", catName: "Chairs", pricePaise: rs(8499), mrpPaise: rs(10999), rating: 4.7, bg: "#D9C9B0", material: "Teak frame, bouclé upholstery", dims: "78 × 82 × 76 cm", desc: "A deep, enveloping seat on a sculpted teak frame — the corner you will always end up in.", image: KIND_IMAGES.chair },
  { id: "linen-cloud-sofa", num: 3, name: "Linen Cloud Sofa", kind: "sofa", catName: "Sofas", pricePaise: rs(54999), mrpPaise: rs(68999), rating: 4.9, bg: "#E9DFD0", material: "Linen blend, kiln-dried hardwood frame", dims: "220 × 95 × 82 cm", desc: "Three generous seats with feather-wrapped cushions and removable, washable linen covers.", image: KIND_IMAGES.sofa },
  { id: "walnut-platform-bed", num: 4, name: "Walnut Platform Bed", kind: "bed", catName: "Beds", pricePaise: rs(42499), mrpPaise: rs(52999), rating: 4.8, bg: "#DDD0BC", material: "Walnut veneer, upholstered headboard", dims: "Queen · 160 × 200 cm", desc: "A low, grounded bed with a channel-tufted headboard for reading late into the night.", image: KIND_IMAGES.bed },
  { id: "arc-dining-set", num: 5, name: "Arc Dining Set", kind: "dining", catName: "Dining tables", pricePaise: rs(38999), mrpPaise: rs(46999), rating: 4.6, bg: "#E6DACA", material: "Solid mango wood", dims: "150 × 90 × 75 cm · seats 4", desc: "A table and four chairs sized for everyday meals and the occasional long Sunday lunch.", image: KIND_IMAGES.dining },
  { id: "shoji-two-door-wardrobe", num: 6, name: "Shoji Two-Door Wardrobe", kind: "wardrobe", catName: "Wardrobes", pricePaise: rs(47999), mrpPaise: rs(55999), rating: 4.7, bg: "#E2D4BF", material: "Sheesham wood", dims: "100 × 58 × 200 cm", desc: "Framed panel doors, brass pulls and a hanging rail plus shelves inside.", image: KIND_IMAGES.wardrobe },
  { id: "slatted-tv-unit", num: 7, name: "Slatted TV Unit", kind: "tv", catName: "TV units", pricePaise: rs(21999), mrpPaise: rs(26999), rating: 4.6, bg: "#EAE0D2", material: "Oak veneer, fluted doors", dims: "180 × 40 × 50 cm", desc: "Fluted doors hide the clutter; an open centre shelf keeps your favourite books close.", image: KIND_IMAGES.tv },
  { id: "round-oak-coffee-table", num: 8, name: "Round Oak Coffee Table", kind: "coffee", catName: "Coffee tables", pricePaise: rs(11499), mrpPaise: rs(13999), rating: 4.8, bg: "#DCCDB6", material: "Solid oak", dims: "Ø 90 × 40 cm", desc: "A soft round top on three tapered legs — no sharp corners, plenty of room for tea.", image: KIND_IMAGES.coffee },
  { id: "cane-arch-sideboard", num: 9, name: "Cane Arch Sideboard", kind: "cabinet", catName: "Cabinets", pricePaise: rs(27999), mrpPaise: rs(33499), rating: 4.7, bg: "#E7DCCB", material: "Teak with natural cane", dims: "160 × 42 × 78 cm", desc: "Three arched cane doors with adjustable shelves for crockery, linen or records.", image: KIND_IMAGES.cabinet },
  { id: "terracotta-lamp-and-vase-set", num: 10, name: "Terracotta Lamp & Vase Set", kind: "decor", catName: "Home décor", pricePaise: rs(4999), mrpPaise: rs(5999), rating: 4.5, bg: "#E9DFD0", material: "Ceramic, linen shade, iron stand", dims: "Lamp 150 cm · vase 45 cm", desc: "A floor lamp, a tall terracotta vase and a linen pouf to finish the room.", image: KIND_IMAGES.decor },
  { id: "test-item-one-rupee", num: 99, name: "Payment test item", kind: "test", catName: "Test", pricePaise: 100, mrpPaise: 100, rating: 5, bg: "#E4D6C1", material: "For payment testing", dims: "—", desc: "A ₹1 item for trying the payment flow.", image: KIND_IMAGES.decor, hidden: true },
];

export const LISTED_PRODUCTS = PRODUCTS.filter((p) => !p.hidden);

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function offPercent(p: Pick<Product, "pricePaise" | "mrpPaise">): number {
  return Math.round((1 - p.pricePaise / p.mrpPaise) * 100);
}

/** Category tiles from the design, in order. */
export const CATEGORIES: { name: string; kind: Exclude<ProductKind, "test">; bg: string }[] = [
  { name: "Sofas", kind: "sofa", bg: "#E4D6C1" },
  { name: "Beds", kind: "bed", bg: "#DDD0BC" },
  { name: "Dining tables", kind: "dining", bg: "#E6DACA" },
  { name: "Chairs", kind: "chair", bg: "#D9C9B0" },
  { name: "Wardrobes", kind: "wardrobe", bg: "#E2D4BF" },
  { name: "TV units", kind: "tv", bg: "#EAE0D2" },
  { name: "Study tables", kind: "study", bg: "#E4D6C1" },
  { name: "Coffee tables", kind: "coffee", bg: "#DCCDB6" },
  { name: "Cabinets", kind: "cabinet", bg: "#E7DCCB" },
  { name: "Home décor", kind: "decor", bg: "#E9DFD0" },
];

/** Home page product tabs from the design: [key, label, product numbers]. */
export const HOME_TABS: { key: string; label: string; nums: number[] }[] = [
  { key: "trending", label: "Trending", nums: [3, 2, 8, 1] },
  { key: "new", label: "New arrivals", nums: [9, 6, 10, 7] },
  { key: "best", label: "Best sellers", nums: [4, 3, 5, 1] },
];
