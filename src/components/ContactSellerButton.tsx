"use client";

import { useEffect, useState } from "react";
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

function isValidDisplayName(s: string | null | undefined): s is string {
  return !!s && !s.includes("@") && s.trim().length > 0;
}

export default function ContactSellerButton({ listingId, sellerId, sellerName, variant = "cta" }: Props) {
  const { session, loading } = useSession();
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    api.get<{ profile: { displayName?: string | null } }>("/api/bst/profile")
      .then((d) => {
        const dn = d.profile?.displayName;
        setDisplayName(isValidDisplayName(dn) ? dn : null);
      })
      .catch(() => {})
      .finally(() => setProfileLoaded(true));
  }, [session]);

  const openConversation = async () => {
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

  const handleContact = () => {
    if (opening) return;
    if (!isValidDisplayName(displayName)) {
      setShowUsernamePrompt(true);
      return;
    }
    openConversation();
  };

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = usernameInput.trim();
    if (!trimmed) return;
    if (trimmed.includes("@")) { setUsernameError("Username cannot be an email address"); return; }
    setSavingUsername(true);
    setUsernameError(null);
    try {
      await api.patch("/api/bst/profile", { displayName: trimmed });
      setDisplayName(trimmed);
      setShowUsernamePrompt(false);
      setUsernameInput("");
      openConversation();
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : "Failed to save username");
    } finally {
      setSavingUsername(false);
    }
  };

  if (loading || !profileLoaded) return null;

  const isSeller = session?.user.id === sellerId;

  // Username prompt modal
  if (showUsernamePrompt) {
    return (
      <div className="bg-[#242424] border border-[#c9a050]/30 rounded-2xl p-5">
        <p className="text-[#f5f2eb] font-semibold mb-1">Set a public username first</p>
        <p className="text-gray-500 text-sm mb-4">
          Your username is shown to other users — your email address is never shared.
        </p>
        <form onSubmit={handleSaveUsername} className="space-y-3">
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => { setUsernameInput(e.target.value); setUsernameError(null); }}
            placeholder="e.g. RazorEnthusiast42"
            maxLength={60}
            autoFocus
            className="w-full bg-[#161616] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
          />
          {usernameError && <p className="text-red-400 text-xs">{usernameError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!usernameInput.trim() || savingUsername}
              className="flex-1 bg-[#c9a050] text-black font-bold py-2.5 rounded-xl text-sm hover:bg-[#b8903f] transition-colors disabled:opacity-40"
            >
              {savingUsername ? "Saving…" : "Save & Message"}
            </button>
            <button
              type="button"
              onClick={() => setShowUsernamePrompt(false)}
              className="text-sm text-gray-500 hover:text-gray-300 px-3 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

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
