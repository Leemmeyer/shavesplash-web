import Link from "next/link";
import { Suspense } from "react";
import WatchlistSection from "@/components/WatchlistSection";
import CreateListingModal from "@/components/CreateListingModal";
import BSTListingCard from "@/components/BSTListingCard";

const BACKEND = "https://api.shavesplash.app";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "razor", label: "Razors" },
  { value: "brush", label: "Brushes" },
  { value: "soap", label: "Soaps" },
  { value: "aftershave", label: "Aftershaves" },
  { value: "edp", label: "EDP/EDT" },
  { value: "misc", label: "Misc" },
  { value: "sold", label: "Sold" },
];

type Seller = { id: string; name: string; email: string; profile: { displayName?: string } | null };
type Listing = {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  material: string | null;
  description: string;
  price: number;
  condition: string;
  category: string;
  status: string;
  listingType: string;
  isExpertListing: boolean;
  createdAt: string;
  expiresAt: string | null;
  views: number;
  percentRemaining: number | null;
  ageMonths: number | null;
  size: number | null;
  photoCount: number;
  seller: Seller;
};

async function getListings(): Promise<Listing[]> {
  try {
    const res = await fetch(`${BACKEND}/api/bst/listings`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.listings ?? [];
  } catch {
    return [];
  }
}

async function getSoldListings(): Promise<Listing[]> {
  try {
    const res = await fetch(`${BACKEND}/api/bst/listings?status=SOLD`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.listings ?? [];
  } catch {
    return [];
  }
}

export default async function BSTPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const isSoldTab = params.category === "sold";

  const [listings, soldListings] = await Promise.all([
    getListings(),
    (isSoldTab || params.q) ? getSoldListings() : Promise.resolve([] as Listing[]),
  ]);

  const filtered = isSoldTab
    ? soldListings
    : (() => {
        const pool = params.q ? [...listings, ...soldListings] : listings;
        return pool.filter((l) => {
          if (params.category && l.category !== params.category) return false;
          if (params.q) {
            const q = params.q.toLowerCase();
            return (
              l.title.toLowerCase().includes(q) ||
              (l.brand ?? "").toLowerCase().includes(q) ||
              l.description.toLowerCase().includes(q)
            );
          }
          return true;
        });
      })();

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="font-[family-name:var(--font-fredericka)] text-2xl text-[#c9a050]">
          ShaveSplash
        </Link>
        <span className="text-sm text-gray-500">Buy · Sell · Trade</span>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#c9a050] mb-2">
              Marketplace
            </h1>
            <p className="text-gray-500 text-sm">
              {isSoldTab
                ? `${soldListings.length} sold listing${soldListings.length !== 1 ? "s" : ""}`
                : `${listings.length} active listing${listings.length !== 1 ? "s" : ""} from the wetshaving community`}
            </p>
          </div>
          <div className="shrink-0 pt-1 flex items-center gap-3">
            <Link href="/bst/my-listings" className="text-sm text-[#c9a050] hover:underline font-medium whitespace-nowrap">
              My Listings
            </Link>
            <CreateListingModal />
          </div>
        </div>

        <Suspense fallback={null}>
          <WatchlistSection />
        </Suspense>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <form method="GET" className="flex-1">
            <input
              type="text"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search listings..."
              className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
            />
            {params.category && (
              <input type="hidden" name="category" value={params.category} />
            )}
          </form>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={`/bst?${cat.value ? `category=${cat.value}` : ""}${params.q && cat.value !== "sold" ? `&q=${params.q}` : ""}`}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  (params.category ?? "") === cat.value
                    ? cat.value === "sold"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-[#c9a050] text-black border-[#c9a050]"
                    : cat.value === "sold"
                      ? "border-red-800/40 text-red-400 hover:border-red-600/60 hover:text-red-300"
                      : "border-white/10 text-gray-400 hover:border-[#c9a050]/40 hover:text-[#c9a050]"
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-4xl mb-4">🪒</p>
            <p>No listings found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((listing) => (
              <BSTListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
