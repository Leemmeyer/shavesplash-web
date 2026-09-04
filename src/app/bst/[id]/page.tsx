import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContactSellerButton from "@/components/ContactSellerButton";
import SellerActions from "@/components/SellerActions";
import AdminRemoveListing from "@/components/AdminRemoveListing";
import BSTPhotoGallery from "@/components/BSTPhotoGallery";
import ShareListingButton from "@/components/ShareListingButton";

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
  shippingPaidBy?: string | null;
  isExpertListing: boolean;
  createdAt: string;
  expiresAt: string | null;
  views: number;
  percentRemaining: number | null;
  ageMonths: number | null;
  size: number | null;
  isSet: boolean;
  setItemType: string | null;
  setItemPercentRemaining: number | null;
  setItemSize: number | null;
  setItemNotes: string | null;
  photoCount: number;
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

async function getPhotos(id: string): Promise<Photo[]> {
  try {
    const res = await fetch(`${BACKEND}/api/bst/listings/${id}/photos`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.photos ?? [];
  } catch {
    return [];
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return {};
  const sellerName = listing.seller.profile?.displayName ?? listing.seller.name ?? "Seller";
  const images = listing.photoCount > 0
    ? [{ url: `${BACKEND}/api/bst/listings/${id}/cover`, width: 1200, height: 630 }]
    : [];
  return {
    title: `${listing.title} — ShaveSplash Marketplace`,
    description: `${listing.condition} · $${listing.price.toFixed(2)} · Listed by ${sellerName}. ${listing.description.slice(0, 120)}`,
    openGraph: {
      title: listing.title,
      description: `${listing.condition} · $${listing.price.toFixed(2)} · Listed by ${sellerName}`,
      url: `https://shavesplash.app/bst/${id}`,
      siteName: "ShaveSplash Community",
      images,
      type: "website",
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [listing, photos] = await Promise.all([getListing(id), getPhotos(id)]);

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": listing.title,
    "description": listing.description,
    ...(listing.brand ? { "brand": { "@type": "Brand", "name": listing.brand } } : {}),
    "offers": {
      "@type": "Offer",
      "priceCurrency": "USD",
      "price": listing.price.toFixed(2),
      "availability": listing.status === "ACTIVE"
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut",
      "url": `https://shavesplash.app/bst/${id}`,
      "seller": { "@type": "Person", "name": sellerName },
    },
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
            <BSTPhotoGallery photos={photos} title={listing.title} />
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
              {listing.status === "SOLD" && (
                <span className="bg-red-950 border border-red-700/50 text-red-400 rounded-lg px-3 py-1 text-sm font-bold">SOLD</span>
              )}
              {listing.listingType === "wtb" && (
                <span className="bg-blue-950 border border-blue-700/50 text-blue-400 rounded-lg px-3 py-1 text-sm font-bold">WTB</span>
              )}
              {listing.listingType === "for_trade" && (
                <span className="bg-green-950 border border-green-700/50 text-green-400 rounded-lg px-3 py-1 text-sm font-bold">For Trade</span>
              )}
              {listing.listingType === "pif" && (
                <span className="bg-purple-950 border border-purple-700/50 text-purple-400 rounded-lg px-3 py-1 text-sm font-bold">Pay it Forward</span>
              )}
              {listing.isSet && (
                <span className="bg-green-950 border border-green-700/40 text-green-400 rounded-lg px-3 py-1 text-sm font-bold">SET</span>
              )}
              {listing.listingType === "pif" ? (
                <span className="text-purple-400 text-2xl font-bold">Free</span>
              ) : listing.price > 0 ? (
                <span className="text-[#c9a050] text-3xl font-bold">${listing.price.toFixed(2)}</span>
              ) : listing.listingType === "for_sale" ? (
                <span className="text-gray-500 text-xl font-semibold">Price TBD</span>
              ) : null}
              {listing.listingType !== "wtb" && listing.shippingPaidBy && (() => {
                const isPaidBySeller = listing.shippingPaidBy === "seller" || listing.shippingPaidBy === "giver";
                const label = isPaidBySeller
                  ? listing.listingType === "pif" ? "Giver pays shipping" : listing.listingType === "for_trade" ? "Shipping included" : "Shipping included (CONUS)"
                  : listing.listingType === "pif" ? "Recipient pays shipping" : listing.listingType === "for_trade" ? "Each pays own shipping" : "Buyer pays shipping";
                return (
                  <span className={`rounded-lg px-3 py-1 text-sm font-medium border ${isPaidBySeller ? "bg-green-950 border-green-700/40 text-green-400" : "bg-[#242424] border-white/10 text-gray-400"}`}>
                    📦 {label}
                  </span>
                );
              })()}
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

            {/* Set details */}
            {listing.isSet && (
              <div className="bg-green-950/40 rounded-2xl p-4 mb-6 border border-green-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-900 border border-green-700/50 text-green-400 rounded-lg px-2.5 py-0.5 text-xs font-bold">SET</span>
                  <p className="text-green-300 text-sm font-semibold">Sold as a matching set</p>
                </div>
                {listing.setItemType && (
                  <p className="text-gray-400 text-sm mb-2">
                    Includes: <span className="text-gray-200 font-medium">{listing.setItemType}</span>
                  </p>
                )}
                {(listing.setItemPercentRemaining != null || listing.setItemSize != null) && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {listing.setItemPercentRemaining != null && (
                      <span className="bg-green-950 border border-green-700/40 text-green-400 rounded-lg px-2.5 py-0.5 text-xs font-medium">
                        {listing.setItemPercentRemaining}% remaining
                      </span>
                    )}
                    {listing.setItemSize != null && (
                      <span className="bg-[#242424] border border-white/10 rounded-lg px-2.5 py-0.5 text-xs text-gray-400">
                        {listing.setItemSize}{listing.setItemType === "Soap" ? " oz" : " mL"}
                      </span>
                    )}
                  </div>
                )}
                {listing.setItemNotes && (
                  <p className="text-gray-400 text-sm leading-relaxed">{listing.setItemNotes}</p>
                )}
              </div>
            )}

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
            <SellerActions
              listingId={listing.id}
              sellerId={listing.seller.id}
              listing={{
                id: listing.id,
                title: listing.title,
                brand: listing.brand,
                model: listing.model,
                material: listing.material,
                description: listing.description,
                price: listing.price,
                condition: listing.condition,
                category: listing.category,
                listingType: listing.listingType,
                shippingPaidBy: listing.shippingPaidBy ?? null,
                percentRemaining: listing.percentRemaining,
                ageMonths: listing.ageMonths,
                size: listing.size,
                photoCount: listing.photoCount,
              }}
            />

            {/* Admin controls */}
            <AdminRemoveListing listingId={listing.id} />

            {/* Share */}
            <div className="mb-4">
              <ShareListingButton listingId={listing.id} title={listing.title} />
            </div>

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
