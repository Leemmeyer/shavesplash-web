"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

const STORAGE_KEY = "ss_forum_read";
const NAV_COUNT_KEY = "ss_forum_unread_nav";

function loadReadState(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); }
  catch { return {}; }
}

const CATEGORIES = [
  { value: "general", label: "General Discussion" },
  { value: "razors", label: "Razors" },
  { value: "soap-aftershave", label: "Soap/Aftershave" },
  { value: "brushes", label: "Brushes" },
  { value: "blades", label: "Blades" },
  { value: "fragrance", label: "Fragrance" },
];

interface Thread {
  id: string;
  title: string;
  body: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; profile?: { displayName?: string } };
  _count: { replies: number };
}

export default function ForumPage() {
  const { session } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [readState, setReadState] = useState<Record<string, number>>({});

  useEffect(() => { setReadState(loadReadState()); }, []);

  const markRead = useCallback((threadId: string) => {
    setReadState((prev) => {
      const next = { ...prev, [threadId]: Date.now() };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isUnread = useCallback((thread: Thread) => {
    const lastRead = readState[thread.id];
    if (!lastRead) return true;
    return new Date(thread.updatedAt).getTime() > lastRead;
  }, [readState]);

  // Unread counts per category — written to localStorage so the nav badge can read it
  const unreadByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const thread of threads) {
      if (isUnread(thread)) {
        counts[thread.category] = (counts[thread.category] ?? 0) + 1;
      }
    }
    return counts;
  }, [threads, isUnread]);

  const totalUnread = useMemo(
    () => Object.values(unreadByCategory).reduce((a, b) => a + b, 0),
    [unreadByCategory]
  );

  // Keep nav badge in sync whenever the count changes
  useEffect(() => {
    if (!fetching) {
      try { localStorage.setItem(NAV_COUNT_KEY, String(totalUnread)); } catch {}
    }
  }, [totalUnread, fetching]);

  useEffect(() => {
    setFetching(true);
    const qs = activeCategory ? `?category=${activeCategory}` : "";
    api.get<{ threads: Thread[] }>(`/api/forum/threads${qs}`)
      .then((d) => setThreads(d.threads))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [activeCategory]);

  const categoryLabel = (value: string) =>
    CATEGORIES.find((c) => c.value === value)?.label ?? value;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050]">Forum</h1>
          <p className="text-gray-500 text-sm mt-1">Discuss technique, share finds, and connect with the community</p>
        </div>
        {session && (
          <Link
            href="/forum/new"
            className="bg-[#c9a050] text-black font-semibold px-5 py-2.5 rounded-xl hover:bg-[#b8903f] transition-colors text-sm whitespace-nowrap"
          >
            + New Thread
          </Link>
        )}
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap mb-8">
        <button
          onClick={() => setActiveCategory(null)}
          className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            activeCategory === null
              ? "bg-[#c9a050]/10 border-[#c9a050]/30 text-[#c9a050]"
              : "border-white/10 text-gray-400 hover:text-[#f5f2eb]"
          }`}
        >
          All
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-[#c9a050] text-[#1a1a1a] text-[10px] font-bold flex items-center justify-center px-1 leading-none">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
        {CATEGORIES.map((cat) => {
          const catUnread = unreadByCategory[cat.value] ?? 0;
          return (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value === activeCategory ? null : cat.value)}
            className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeCategory === cat.value
                ? "bg-[#c9a050]/10 border-[#c9a050]/30 text-[#c9a050]"
                : "border-white/10 text-gray-400 hover:text-[#f5f2eb]"
            }`}
          >
            {cat.label}
            {catUnread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-[#c9a050] text-[#1a1a1a] text-[10px] font-bold flex items-center justify-center px-1 leading-none">
                {catUnread > 99 ? "99+" : catUnread}
              </span>
            )}
          </button>
          );
        })}
      </div>

      {/* Thread list */}
      {fetching ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : threads.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No threads yet</p>
          {session ? (
            <Link href="/forum/new" className="text-[#c9a050] hover:underline text-sm">
              Start the first thread
            </Link>
          ) : (
            <Link href="/sign-in" className="text-[#c9a050] hover:underline text-sm">
              Sign in to post
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {threads.map((thread) => {
            const unread = isUnread(thread);
            return (
            <Link
              key={thread.id}
              href={`/forum/${thread.id}`}
              onClick={() => markRead(thread.id)}
              className={`flex items-start gap-4 rounded-2xl p-5 transition-colors group border-l-[3px] ${
                unread
                  ? "bg-[#242424] hover:bg-[#2a2a2a] border border-white/5 border-l-[#c9a050]/50"
                  : "bg-[#1c1c1c] hover:bg-[#222222] border border-white/5 border-l-transparent"
              }`}
            >
              {thread.isPinned && (
                <span className="text-[#c9a050] text-xs mt-0.5 shrink-0">📌</span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h2 className={`font-semibold group-hover:text-[#c9a050] transition-colors leading-snug flex items-center gap-2 ${unread ? "text-[#f5f2eb]" : "text-gray-400"}`}>
                    {unread && <span className="w-1.5 h-1.5 rounded-full bg-[#c9a050] shrink-0 inline-block" />}
                    {thread.title}
                  </h2>
                  <span className="text-xs text-gray-600 shrink-0 mt-0.5">
                    {new Date(thread.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className={`text-sm line-clamp-2 mb-3 ${unread ? "text-gray-500" : "text-gray-600"}`}>{thread.body}</p>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="bg-[#c9a050]/10 text-[#c9a050] px-2.5 py-0.5 rounded-full">
                    {categoryLabel(thread.category)}
                  </span>
                  <span>
                    by {thread.author.profile?.displayName ?? thread.author.name}
                  </span>
                  <span>{thread._count.replies} {thread._count.replies === 1 ? "reply" : "replies"}</span>
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
