import Link from "next/link";
import { Suspense } from "react";
import WatchlistSection from "@/components/WatchlistSection";
import CreateListingModal from "@/components/CreateListingModal";

const BACKEND = "https://api.shavesplash.app";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "razor", label: "Razors" },
  { value: "brush", label: "Brushes" },
  { value: "soap", label: "Soaps" },
  { value: "aftershave", label: "Aftershaves" },
  { value: "edp", label: "EDP/EDT" },
  { value: "misc", label: "Misc" },
];

type Photo = { id: string; data: string; order: number };
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
  isExpertListing: boolean;
  createdAt: string;
  expiresAt: string | null;
  views: number;
  percentRemaining: number | null;
  ageMonths: number | null;
  photos: Photo[];
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

export default async function BSTPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const listings = await getListings();

  const filtered = listings.filter((l) => {
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

  return (
    <div className="min-h-screen">
      {/* Header */}
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
              {listings.length} active listing{listings.length !== 1 ? "s" : ""} from the wetshaving community
            </p>
          </div>
          <div className="shrink-0 pt-1 flex items-center gap-3">
            <Link href="/bst/my-listings" className="text-sm text-[#c9a050] hover:underline font-medium whitespace-nowrap">
              My Listings
            </Link>
            <CreateListingModal />
          </div>
        </div>

        {/* Watchlist alerts */}
        <Suspense fallback={null}>
          <WatchlistSection />
        </Suspense>

        {/* Filters */}
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
                href={`/bst?${cat.value ? `category=${cat.value}` : ""}${params.q ? `&q=${params.q}` : ""}`}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  (params.category ?? "") === cat.value
                    ? "bg-[#c9a050] text-black border-[#c9a050]"
                    : "border-white/10 text-gray-400 hover:border-[#c9a050]/40 hover:text-[#c9a050]"
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-4xl mb-4">🪒</p>
            <p>No listings found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const photo = listing.photos[0];
  const sellerName = listing.seller.profile?.displayName ?? listing.seller.name ?? "Seller";
  const daysListed = Math.floor((Date.now() - new Date(listing.createdAt).getTime()) / 86400000);
  const daysUntilExpiry = listing.expiresAt
    ? Math.ceil((new Date(listing.expiresAt).getTime() - Date.now()) / 86400000)
    : null;
  const expiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 2;

  return (
    <Link href={`/bst/${listing.id}`} className="group block">
      <div className="bg-[#242424] rounded-2xl overflow-hidden border border-white/5 hover:border-[#c9a050]/30 transition-colors">
        {/* Photo */}
        <div className="aspect-square bg-[#1e1e1e] relative overflow-hidden">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/jpeg;base64,${photo.data}`}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">
              🪒
            </div>
          )}
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-gray-300 text-right leading-tight">
            {listing.condition}
            {listing.percentRemaining != null && (
              <span className="block text-[10px] text-[#c9a050]">{listing.percentRemaining}% left</span>
            )}
          </div>
          {listing.isExpertListing && (
            <div className="absolute top-2 left-2 bg-[#c9a050] text-black rounded-lg px-2 py-0.5 text-[10px] font-bold tracking-wide">
              ★ EXPERT
            </div>
          )}
          {expiringSoon && (
            <div className="absolute bottom-2 left-2 bg-red-500/90 text-white rounded-lg px-2 py-0.5 text-[10px] font-bold">
              Expires in {daysUntilExpiry}d
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          {listing.category === "razor" ? (
            <p className="text-[#f5f2eb] text-sm font-semibold leading-snug mb-1 line-clamp-2">
              {[listing.brand, listing.model].filter(Boolean).join(" ")}
            </p>
          ) : (
            <>
              {(listing.brand || listing.model) && (
                <p className="text-[#c9a050] text-xs font-medium mb-0.5">
                  {[listing.brand, listing.model].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="text-[#f5f2eb] text-sm font-semibold leading-snug mb-1 line-clamp-2">
                {listing.title}
              </p>
            </>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[#c9a050] font-bold text-base">
              ${listing.price.toFixed(2)}
            </span>
            <span className="text-gray-600 text-xs">{sellerName}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-gray-600 text-[10px]">
              {daysListed === 0 ? "Listed today" : `Listed ${daysListed}d ago`}
            </span>
            <span className="text-gray-600 text-[10px]">
              {listing.views} {listing.views === 1 ? "view" : "views"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
