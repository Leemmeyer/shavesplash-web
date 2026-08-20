import Link from "next/link";
import { notFound } from "next/navigation";
import ContactSellerButton from "@/components/ContactSellerButton";
import SellerActions from "@/components/SellerActions";
import AdminRemoveListing from "@/components/AdminRemoveListing";

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
  listingType: string;
  isExpertListing: boolean;
  createdAt: string;
  expiresAt: string | null;
  views: number;
  percentRemaining: number | null;
  ageMonths: number | null;
  size: number | null;
  photos: Photo[];
  seller: Seller;
};

function photoSrc(data: string) {
  return data.startsWith("data:") ? data : `data:image/jpeg;base64,${data}`;
}

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
  const daysListed = Math.floor((Date.now() - new Date(listing.createdAt).getTime()) / 86400000);
  const expiresDate = listing.expiresAt
    ? new Date(listing.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

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
                    src={photoSrc(listing.photos[0].data)}
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
                          src={photoSrc(photo.data)}
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
            {listing.category === "razor" ? (
              <>
                <h1 className="text-[#c9a050] text-2xl font-bold mb-1">
                  {[listing.brand, listing.model].filter(Boolean).join(" ") || "Razor"}
                </h1>
                {listing.material && (
                  <p className="text-gray-500 text-sm mb-2">{listing.material}</p>
                )}
              </>
            ) : (
              <>
                {(listing.brand || listing.model) && (
                  <p className="text-[#c9a050] text-sm font-medium mb-1">
                    {[listing.brand, listing.model].filter(Boolean).join(" · ")}
                  </p>
                )}
                {listing.material && (
                  <p className="text-gray-500 text-xs mb-1">{listing.material}</p>
                )}
                <h1 className="text-[#f5f2eb] text-2xl font-bold mb-2">{listing.title}</h1>
              </>
            )}

            <div className="flex items-center flex-wrap gap-2 mb-6">
              {listing.listingType === "wtb" && (
                <span className="bg-blue-950 border border-blue-700/50 text-blue-400 rounded-lg px-3 py-1 text-sm font-bold">WTB</span>
              )}
              {listing.listingType === "for_trade" && (
                <span className="bg-green-950 border border-green-700/50 text-green-400 rounded-lg px-3 py-1 text-sm font-bold">For Trade</span>
              )}
              {listing.price > 0 ? (
                <span className="text-[#c9a050] text-3xl font-bold">${listing.price.toFixed(2)}</span>
              ) : listing.listingType === "for_sale" ? (
                <span className="text-gray-500 text-xl font-semibold">Price TBD</span>
              ) : null}
              {listing.condition && (
                <span className="bg-[#242424] border border-white/10 rounded-lg px-3 py-1 text-sm text-gray-400">
                  {listing.condition}
                </span>
              )}
              <span className="bg-[#242424] border border-white/10 rounded-lg px-3 py-1 text-sm text-gray-400 capitalize">
                {listing.category}
              </span>
              {listing.percentRemaining != null && (
                <span className="bg-[#242424] border border-[#c9a050]/30 rounded-lg px-3 py-1 text-sm text-[#c9a050]">
                  {listing.percentRemaining}% remaining
                </span>
              )}
              {listing.ageMonths != null && (
                <span className="bg-[#242424] border border-white/10 rounded-lg px-3 py-1 text-sm text-gray-400">
                  ~{listing.ageMonths} {listing.ageMonths === 1 ? "month" : "months"} old
                </span>
              )}
              {listing.size != null && (
                <span className="bg-[#242424] border border-white/10 rounded-lg px-3 py-1 text-sm text-gray-400">
                  {listing.size}{listing.category === "soap" ? " oz" : " mL"}
                </span>
              )}
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
                    <ContactSellerButton
                      listingId={listing.id}
                      sellerId={listing.seller.id}
                      sellerName={sellerName}
                      variant="name"
                    />
                    {listing.isExpertListing && (
                      <span className="bg-[#c9a050] text-black text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">★ EXPERT</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">
                    Listed {listedDate} · {daysListed === 0 ? "today" : `${daysListed}d ago`} · {listing.views} {listing.views === 1 ? "view" : "views"}
                  </p>
                  {expiresDate && (
                    <p className="text-gray-600 text-xs">Expires {expiresDate}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seller controls (only shown to the listing owner) */}
            <SellerActions listingId={listing.id} sellerId={listing.seller.id} />

            {/* Admin controls */}
            <AdminRemoveListing listingId={listing.id} />

            {/* Contact CTA */}
            <ContactSellerButton
              listingId={listing.id}
              sellerId={listing.seller.id}
              sellerName={sellerName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
