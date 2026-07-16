"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/session-context";
import { api } from "@/lib/api";

interface Props {
  listingId: string;
  sellerId: string;
  sellerName: string;
  variant?: "cta" | "name";
}

export default function ContactSellerButton({ listingId, sellerId, sellerName, variant = "cta" }: Props) {
  const { session, loading } = useSession();
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  const handleContact = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const { conversation } = await api.post<{ conversation: { id: string } }>(
        `/api/bst/listings/${listingId}/conversations`,
        {}
      );
      router.push(`/messages/${conversation.id}`);
    } catch {
      setOpening(false);
    }
  };

  if (loading) return null;

  // User is the seller — no self-messaging
  const isSeller = session?.user.id === sellerId;

  if (variant === "name") {
    if (!session || isSeller) {
      return <span className="text-[#f5f2eb] font-semibold">{sellerName}</span>;
    }
    return (
      <button
        onClick={handleContact}
        disabled={opening}
        className="text-[#f5f2eb] font-semibold hover:text-[#c9a050] transition-colors disabled:opacity-60 text-left"
      >
        {opening ? "Opening…" : sellerName}
      </button>
    );
  }

  // CTA variant
  if (isSeller) {
    return (
      <div className="bg-[#242424] border border-white/5 rounded-2xl p-5 text-center">
        <p className="text-gray-500 text-sm">This is your listing.</p>
        <Link href="/messages" className="inline-block mt-3 text-[#c9a050] text-sm hover:underline">
          View your messages →
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-[#c9a050]/10 border border-[#c9a050]/20 rounded-2xl p-5 text-center">
        <p className="text-[#c9a050] font-semibold mb-1">Interested?</p>
        <p className="text-gray-500 text-sm mb-4">Sign in to message the seller directly.</p>
        <Link
          href={`/sign-in?redirect=/bst/${listingId}`}
          className="inline-block bg-[#c9a050] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#b8903f] transition-colors text-sm"
        >
          Sign in to message
        </Link>
      </div>
    );
  }

  return (
    <button
      onClick={handleContact}
      disabled={opening}
      className="w-full bg-[#c9a050] text-black font-bold px-6 py-4 rounded-2xl hover:bg-[#b8903f] transition-colors text-sm disabled:opacity-60"
    >
      {opening ? "Opening conversation…" : `Message ${sellerName}`}
    </button>
  );
}
