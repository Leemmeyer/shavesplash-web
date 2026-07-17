"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

interface Conversation {
  id: string;
  listing: { id: string; title: string; brand?: string; photos: { data: string }[] };
  buyer: { id: string; name: string; email: string; profile?: { displayName?: string } | null };
  seller: { id: string; name: string; email: string; profile?: { displayName?: string } | null };
  messages: { id: string; body: string; createdAt: string; readAt?: string | null; senderId: string }[];
  updatedAt: string;
}

export default function MessagesPage() {
  const { session, loading } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [fetching, setFetching] = useState(true);

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

  if (loading || !session) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] mb-8">
        Messages
      </h1>

      {fetching ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No messages yet</p>
          <p className="text-sm">
            Messages are created when you contact a seller in the{" "}
            <Link href="/bst" className="text-[#c9a050] hover:underline">Marketplace</Link>.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map((conv) => {
            const otherUser = conv.buyer.id === session.user.id ? conv.seller : conv.buyer;
            const rawDn = otherUser.profile?.displayName;
            const otherDisplayName = rawDn && !rawDn.includes("@") ? rawDn : "User";
            const other = { ...otherUser, displayName: otherDisplayName };
            const last = conv.messages[0];
            const isUnread = last && !last.readAt && last.senderId !== session.user.id;

            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="flex items-start gap-4 bg-[#242424] hover:bg-[#2a2a2a] border border-white/5 rounded-2xl p-4 transition-colors"
              >
                {/* Listing thumbnail */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#333] shrink-0">
                  {conv.listing.photos[0] ? (
                    <img
                      src={`data:image/jpeg;base64,${conv.listing.photos[0].data}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🪒</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-sm font-semibold truncate ${isUnread ? "text-[#f5f2eb]" : "text-gray-300"}`}>
                      {other.displayName}
                    </span>
                    <span className="text-xs text-gray-600 shrink-0">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#c9a050] truncate mb-1">{conv.listing.title}</p>
                  {last && (
                    <p className={`text-sm truncate ${isUnread ? "text-gray-200 font-medium" : "text-gray-500"}`}>
                      <span className="font-semibold">
                        {last.senderId === session.user.id ? "You" : other.displayName}:
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
