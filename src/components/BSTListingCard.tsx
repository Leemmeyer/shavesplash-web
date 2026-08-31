"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  seller: { id: string; name: string; email: string; profile: { displayName?: string } | null };
};

const BACKEND = "https://api.shavesplash.app";

function photoSrc(data: string) {
  return data.startsWith("data:") ? data : `data:image/jpeg;base64,${data}`;
}

export default function BSTListingCard({ listing }: { listing: Listing }) {
  const [photoData, setPhotoData] = useState<string | null>(null);

  useEffect(() => {
    if (!listing.photoCount) return;
    fetch(`${BACKEND}/api/bst/listings/${listing.id}/photos`)
      .then((r) => r.json())
      .then((d) => { if (d.photos?.[0]?.data) setPhotoData(d.photos[0].data); })
      .catch(() => {});
  }, [listing.id, listing.photoCount]);

  const sellerName = listing.seller.profile?.displayName ?? listing.seller.name ?? "Seller";
  const daysUntilExpiry = listing.expiresAt
    ? Math.ceil((new Date(listing.expiresAt).getTime() - Date.now()) / 86400000)
    : null;
  const expiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 2;

  return (
    <Link href={`/bst/${listing.id}`} className="group block">
      <div className="bg-[#242424] rounded-2xl overflow-hidden border border-white/5 hover:border-[#c9a050]/30 transition-colors">
        <div className="aspect-square bg-[#1e1e1e] relative overflow-hidden">
          {photoData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc(photoData)}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">🪒</div>
          )}
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-gray-300 text-right leading-tight">
            {listing.condition}
            {listing.percentRemaining != null && (
              <span className="block text-[10px] text-[#c9a050]">{listing.percentRemaining}% left</span>
            )}
            {listing.size != null && (
              <span className="block text-[10px] text-gray-400">{listing.size}{["soap"].includes(listing.category) ? "oz" : "mL"}</span>
            )}
          </div>
          {listing.isExpertListing && (
            <div className="absolute top-2 left-2 bg-[#c9a050] text-black rounded-lg px-2 py-0.5 text-[10px] font-bold tracking-wide">★ EXPERT</div>
          )}
          {expiringSoon && (
            <div className="absolute bottom-2 left-2 bg-red-500/90 text-white rounded-lg px-2 py-0.5 text-[10px] font-bold">
              Expires in {daysUntilExpiry}d
            </div>
          )}
        </div>
        <div className="p-3">
          {listing.category === "razor" ? (
            <p className="text-[#f5f2eb] text-sm font-semibold leading-snug mb-1 line-clamp-2">
              {[listing.brand, listing.model].filter(Boolean).join(" ")}
            </p>
          ) : (
            <>
              {(listing.brand || listing.model) && (
                <p className="text-[#c9a050] text-xs font-medium mb-0.5 truncate">
                  {[listing.brand, listing.model].filter(Boolean).join(" ")}
                </p>
              )}
              <p className="text-[#f5f2eb] text-sm font-semibold leading-snug mb-1 line-clamp-2">{listing.title}</p>
            </>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              {listing.status === "SOLD" && (
                <span className="bg-red-950 border border-red-700/50 text-red-400 rounded-lg px-2 py-0.5 text-[10px] font-bold">SOLD</span>
              )}
              <span className="text-[#c9a050] font-bold text-sm">
                {listing.listingType === "pif" ? "PIF" : listing.listingType === "for_trade" ? "TRADE" : `$${listing.price.toFixed(2)}`}
              </span>
            </div>
            <span className="text-gray-600 text-xs truncate ml-2">{sellerName}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
