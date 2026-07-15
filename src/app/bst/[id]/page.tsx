import Link from "next/link";
import { notFound } from "next/navigation";

const BACKEND = "https://api.shavesplash.app";

type Photo = { id: string; data: string; order: number };
type Seller = { id: string; name: string; email: string; profile: { displayName?: string; paypalHandle?: string; isExpert?: boolean } | null };
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
  photos: Photo[];
  seller: Seller;
};

async function getListing(id: string): Promise<Listing | null> {
  try {
    const res = await fetch(`${BACKEND}/api/bst/listings/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.listing ?? null;
  } catch {
    return null;
  }
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) notFound();

  const sellerName = listing.seller.profile?.displayName ?? listing.seller.name ?? "Seller";
  const listedDate = new Date(listing.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="font-[family-name:var(--font-fredericka)] text-2xl text-[#c9a050]">
          ShaveSplash
        </Link>
        <Link href="/bst" className="text-sm text-gray-400 hover:text-[#c9a050] transition-colors">
          ← Marketplace
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Photos */}
          <div>
            {listing.photos.length > 0 ? (
              <div className="space-y-3">
                <div className="aspect-square bg-[#242424] rounded-2xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/jpeg;base64,${listing.photos[0].data}`}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {listing.photos.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {listing.photos.slice(1).map((photo) => (
                      <div key={photo.id} className="aspect-square bg-[#242424] rounded-xl overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`data:image/jpeg;base64,${photo.data}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square bg-[#242424] rounded-2xl flex items-center justify-center text-8xl opacity-20">
                🪒
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {(listing.brand || listing.model) && (
              <p className="text-[#c9a050] text-sm font-medium mb-1">
                {[listing.brand, listing.model].filter(Boolean).join(" · ")}
              </p>
            )}
            {listing.material && (
              <p className="text-gray-500 text-xs mb-1">{listing.material}</p>
            )}
            <h1 className="text-[#f5f2eb] text-2xl font-bold mb-2">{listing.title}</h1>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-[#c9a050] text-3xl font-bold">${listing.price.toFixed(2)}</span>
              <span className="bg-[#242424] border border-white/10 rounded-lg px-3 py-1 text-sm text-gray-400">
                {listing.condition}
              </span>
              <span className="bg-[#242424] border border-white/10 rounded-lg px-3 py-1 text-sm text-gray-400 capitalize">
                {listing.category}
              </span>
            </div>

            <div className="bg-[#242424] rounded-2xl p-4 mb-6 border border-white/5">
              <p className="text-sm font-semibold text-gray-400 mb-1 uppercase tracking-wider">Description</p>
              <p className="text-[#f5f2eb] text-sm leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>

            {/* Seller */}
            <div className="bg-[#242424] rounded-2xl p-4 mb-6 border border-white/5">
              <p className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Seller</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#c9a050]/20 flex items-center justify-center text-[#c9a050] font-bold">
                  {sellerName[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[#f5f2eb] font-semibold">{sellerName}</p>
                    {listing.isExpertListing && (
                      <span className="bg-[#c9a050] text-black text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">★ EXPERT</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">Listed {listedDate}</p>
                </div>
              </div>
            </div>

            {/* Contact CTA */}
            <div className="bg-[#c9a050]/10 border border-[#c9a050]/20 rounded-2xl p-5 text-center">
              <p className="text-[#c9a050] font-semibold mb-1">Interested?</p>
              <p className="text-gray-500 text-sm mb-4">
                Download the ShaveSplash app to message the seller directly.
              </p>
              <Link
                href="https://apps.apple.com/app/shavesplash"
                target="_blank"
                className="inline-flex items-center gap-2 bg-[#c9a050] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#b8903f] transition-colors text-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Get ShaveSplash on iOS
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
