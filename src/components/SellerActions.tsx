"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { api } from "@/lib/api";

interface SellerActionsProps {
  listingId: string;
  sellerId: string;
}

export default function SellerActions({ listingId, sellerId }: SellerActionsProps) {
  const { session, loading } = useSession();
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);

  if (loading || !session || session.user.id !== sellerId || done) return null;

  const handleAction = async (status: "SOLD" | "REMOVED") => {
    setWorking(true);
    try {
      await api.patch(`/api/bst/listings/${listingId}`, { status });
      setDone(true);
      router.push("/bst/my-listings");
      router.refresh();
    } catch {
      setWorking(false);
    }
  };

  return (
    <div className="bg-[#242424] rounded-2xl p-4 border border-white/5">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Your Listing</p>
      <div className="flex gap-3">
        <button
          onClick={() => handleAction("SOLD")}
          disabled={working}
          className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 text-green-400 font-bold text-sm rounded-xl py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          ✓ Mark as Sold
        </button>
        <button
          onClick={() => handleAction("REMOVED")}
          disabled={working}
          className="flex-1 bg-red-900/20 hover:bg-red-900/40 border border-red-800/40 text-red-400 font-bold text-sm rounded-xl py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          Remove Listing
        </button>
      </div>
    </div>
  );
}
