"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { api } from "@/lib/api";
import EditListingModal, { type EditableListing } from "@/components/EditListingModal";

type MyListing = {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  material: string | null;
  price: number;
  condition: string | null;
  category: string;
  status: string;
  listingType: string | null;
  shippingPaidBy: string | null;
  description: string | null;
  percentRemaining: number | null;
  ageMonths: number | null;
  size: number | null;
  photoCount: number;
  createdAt: string;
  expiresAt: string | null;
};

const BACKEND = "https://api.shavesplash.app";

function ListingThumbnail({ listingId, photoCount }: { listingId: string; photoCount: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!photoCount) return;
    fetch(`${BACKEND}/api/bst/listings/${listingId}/photos`)
      .then((r) => r.json())
      .then((d) => {
        const data = d.photos?.[0]?.data;
        if (data) setSrc(data.startsWith("data:") ? data : `data:image/jpeg;base64,${data}`);
      })
      .catch(() => {});
  }, [listingId, photoCount]);
  return src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt="" className="w-full h-full object-cover" />
    : <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">🪒</div>;
}

export default function MyListingsPage() {
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<MyListing | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) { setLoading(false); return; }
    api.get<{ listings: MyListing[] }>("/api/bst/my-listings")
      .then((data) => setListings(data.listings))
      .catch(() => setError("Failed to load listings"))
      .finally(() => setLoading(false));
  }, [session, sessionLoading]);

  const handleSaved = (id: string, updated: Partial<EditableListing>) => {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
    setEditingListing(null);
  };

  const handleAction = async (id: string, status: "SOLD" | "REMOVED") => {
    setWorking(id);
    try {
      await api.patch(`/api/bst/listings/${id}`, { status });
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status } : l))
      );
    } catch {
      setError("Action failed — please try again");
    } finally {
      setWorking(null);
    }
  };

  const active = listings.filter((l) => l.status === "ACTIVE");
  const sold = listings.filter((l) => l.status === "SOLD");
  const removed = listings.filter((l) => l.status === "REMOVED");

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const d = new Date(expiresAt);
    const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
    if (days <= 0) return "Expired";
    if (days === 1) return "Expires tomorrow";
    return `Expires in ${days}d`;
  };

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

      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] mb-8">
          My Listings
        </h1>

        {sessionLoading || loading ? (
          <div className="text-center py-20 text-gray-600">Loading…</div>
        ) : !session ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">Sign in to see your listings.</p>
            <Link href="/bst" className="text-[#c9a050] hover:underline text-sm">← Back to Marketplace</Link>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500 text-sm">{error}</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-4xl mb-4">🪒</p>
            <p className="mb-6">You haven't posted any listings yet.</p>
            <Link href="/bst" className="text-[#c9a050] hover:underline text-sm">Browse the marketplace</Link>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Active */}
            {active.length > 0 && (
              <section>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                  Active ({active.length})
                </p>
                <div className="space-y-3">
                  {active.map((listing) => {
                    const expiry = formatExpiry(listing.expiresAt);
                    const expiringSoon = listing.expiresAt
                      ? Math.ceil((new Date(listing.expiresAt).getTime() - Date.now()) / 86400000) <= 2
                      : false;
                    return (
                      <div key={listing.id} className="bg-[#242424] rounded-2xl border border-white/5 p-4 flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-xl bg-[#1e1e1e] overflow-hidden flex-shrink-0">
                          <ListingThumbnail listingId={listing.id} photoCount={listing.photoCount} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/bst/${listing.id}`} className="text-[#f5f2eb] font-semibold text-sm hover:text-[#c9a050] transition-colors line-clamp-1">
                            {listing.title}
                          </Link>
                          <p className="text-[#c9a050] font-bold text-base mt-0.5">${listing.price.toFixed(2)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-600 text-xs capitalize">{listing.category}</span>
                            {expiry && (
                              <span className={`text-xs ${expiringSoon ? "text-red-400 font-semibold" : "text-gray-600"}`}>
                                · {expiry}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => setEditingListing(listing)}
                            disabled={working === listing.id}
                            className="bg-[#c9a050]/10 hover:bg-[#c9a050]/20 border border-[#c9a050]/40 text-[#c9a050] font-bold text-xs rounded-lg px-3 py-2 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleAction(listing.id, "SOLD")}
                            disabled={working === listing.id}
                            className="bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 text-green-400 font-bold text-xs rounded-lg px-3 py-2 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Mark Sold
                          </button>
                          <button
                            onClick={() => handleAction(listing.id, "REMOVED")}
                            disabled={working === listing.id}
                            className="bg-red-900/20 hover:bg-red-900/40 border border-red-800/40 text-red-400 font-bold text-xs rounded-lg px-3 py-2 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Sold */}
            {sold.length > 0 && (
              <section>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                  Sold ({sold.length})
                </p>
                <div className="space-y-3">
                  {sold.map((listing) => (
                    <div key={listing.id} className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-4 flex gap-4 items-center opacity-60">
                      <div className="w-16 h-16 rounded-xl bg-[#181818] overflow-hidden flex-shrink-0">
                        <ListingThumbnail listingId={listing.id} photoCount={listing.photoCount} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-400 font-semibold text-sm line-clamp-1">{listing.title}</p>
                        <p className="text-gray-600 text-sm mt-0.5">${listing.price.toFixed(2)}</p>
                      </div>
                      <span className="text-xs font-bold text-green-600 bg-green-900/20 border border-green-800/30 rounded-lg px-2.5 py-1 flex-shrink-0">
                        SOLD
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Removed (hidden unless present, just for completeness) */}
            {removed.length > 0 && (
              <section>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                  Removed ({removed.length})
                </p>
                <div className="space-y-3">
                  {removed.map((listing) => (
                    <div key={listing.id} className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-4 flex gap-4 items-center opacity-40">
                      <div className="w-16 h-16 rounded-xl bg-[#181818] overflow-hidden flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-500 font-semibold text-sm line-clamp-1">{listing.title}</p>
                        <p className="text-gray-600 text-sm mt-0.5">${listing.price.toFixed(2)}</p>
                      </div>
                      <span className="text-xs font-bold text-gray-600 flex-shrink-0">REMOVED</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
