"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

interface Conversation {
  id: string;
  isDirect: boolean;
  listing: { id: string; title: string; brand?: string; photos: { data: string }[] } | null;
  buyer: { id: string; name: string; email: string; profile?: { displayName?: string } | null };
  seller: { id: string; name: string; email: string; profile?: { displayName?: string } | null };
  messages: { id: string; body: string; createdAt: string; readAt?: string | null; senderId: string }[];
  updatedAt: string;
}

interface UserResult {
  id: string;
  displayName: string;
}

export default function MessagesPage() {
  const { session, loading } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const searchRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && !session) router.push("/sign-in");
  }, [session, loading, router]);

  useEffect(() => {
    if (!session) return;
    api.get<{ conversations: Conversation[] }>("/api/bst/conversations")
      .then((d) => setConversations(d.conversations))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [session]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const d = await api.get<{ users: UserResult[] }>(`/api/bst/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(d.users);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [searchQuery]);

  const handleStartDM = async (userId: string) => {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const { conversation } = await api.post<{ conversation: { id: string } }>("/api/bst/conversations/direct", { recipientId: userId });
      router.push(`/messages/${conversation.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setCreating(false);
    }
  };

  if (loading || !session) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050]">
          Messages
        </h1>
        <button
          onClick={() => { setShowNewMsg((v) => !v); setSearchQuery(""); setSearchResults([]); }}
          className="text-sm bg-[#242424] border border-white/10 text-[#f5f2eb] px-4 py-2 rounded-xl hover:border-[#c9a050]/40 transition-colors"
        >
          {showNewMsg ? "Cancel" : "+ New Message"}
        </button>
      </div>

      {/* New Message search panel */}
      {showNewMsg && (
        <div className="mb-6 bg-[#242424] border border-white/10 rounded-2xl p-4">
          <p className="text-sm text-gray-400 mb-3">Search for a user by their public username:</p>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a username…"
            autoFocus
            className="w-full bg-[#161616] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 mb-3"
          />
          {searching && <p className="text-xs text-gray-600">Searching…</p>}
          {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <p className="text-xs text-gray-600">No users found.</p>
          )}
          {searchResults.length > 0 && (
            <div className="flex flex-col gap-1">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleStartDM(u.id)}
                  disabled={creating}
                  className="text-left px-3 py-2.5 rounded-lg text-sm text-[#f5f2eb] hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
                >
                  {creating ? "Opening…" : u.displayName}
                </button>
              ))}
            </div>
          )}
          {createError && <p className="text-red-400 text-xs mt-2">{createError}</p>}
        </div>
      )}

      {fetching ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No direct messages yet</p>
          <p className="text-sm">
            DMs are created when you contact a seller in the{" "}
            <Link href="/bst" className="text-[#c9a050] hover:underline">Marketplace</Link>, or start one from the button above.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map((conv) => {
            const otherUser = conv.buyer.id === session.user.id ? conv.seller : conv.buyer;
            const rawDn = otherUser.profile?.displayName;
            const otherDisplayName = rawDn && !rawDn.includes("@") ? rawDn : "User";
            const last = conv.messages[0];
            const isUnread = last && !last.readAt && last.senderId !== session.user.id;

            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="flex items-start gap-4 bg-[#242424] hover:bg-[#2a2a2a] border border-white/5 rounded-2xl p-4 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#333] shrink-0">
                  {conv.listing?.photos[0] ? (
                    <img
                      src={`data:image/jpeg;base64,${conv.listing.photos[0].data}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {conv.listing ? "🪒" : "💬"}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-sm font-semibold truncate ${isUnread ? "text-[#f5f2eb]" : "text-gray-300"}`}>
                      {otherDisplayName}
                    </span>
                    <span className="text-xs text-gray-600 shrink-0">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#c9a050] truncate mb-1">
                    {conv.listing?.title ?? "Direct Message"}
                  </p>
                  {last && (
                    <p className={`text-sm truncate ${isUnread ? "text-gray-200 font-medium" : "text-gray-500"}`}>
                      <span className="font-semibold">
                        {last.senderId === session.user.id ? "You" : otherDisplayName}:
                      </span>{" "}
                      {last.body}
                    </p>
                  )}
                </div>

                {isUnread && (
                  <div className="w-2 h-2 rounded-full bg-[#c9a050] mt-2 shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
