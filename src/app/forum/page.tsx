"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import AdminRemoveButton from "@/components/AdminRemoveButton";

const ADMIN_EMAIL = "leemeyernyc@gmail.com";

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
  author: { id: string; name: string; profile?: { displayName?: string; isExpert?: boolean } };
  _count: { replies: number };
  lastReply: { createdAt: string; author: { name: string; profile?: { displayName?: string; isExpert?: boolean } } } | null;
}

export default function ForumPage() {
  const { session } = useSession();
  const isAdmin = session?.user.email === ADMIN_EMAIL;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [readState, setReadState] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [searchScope, setSearchScope] = useState<"all" | "category">("all");
  const [taggedUsers, setTaggedUsers] = useState<{ id: string; displayName: string }[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const threadAuthors = useMemo(() => {
    const seen = new Set<string>();
    const authors: { id: string; displayName: string }[] = [];
    for (const t of threads) {
      if (!seen.has(t.author.id)) {
        seen.add(t.author.id);
        authors.push({ id: t.author.id, displayName: t.author.profile?.displayName ?? t.author.name });
      }
    }
    return authors.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [threads]);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return threadAuthors
      .filter((a) => a.displayName.toLowerCase().includes(q) && !taggedUsers.some((u) => u.id === a.id))
      .slice(0, 6);
  }, [mentionQuery, threadAuthors, taggedUsers]);

  function handleSearchChange(value: string) {
    setSearch(value);
    const match = value.match(/@([a-zA-Z0-9_ ]*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function handleSelectUser(user: { id: string; displayName: string }) {
    setSearch((prev) => prev.replace(/@[a-zA-Z0-9_ ]*$/, "").trimEnd());
    setMentionQuery(null);
    if (!taggedUsers.some((u) => u.id === user.id)) {
      setTaggedUsers((prev) => [...prev, user]);
    }
    searchInputRef.current?.focus();
  }

  const displayedThreads = useMemo(() => {
    const textQuery = search.replace(/@[a-zA-Z0-9_ ]*$/, "").toLowerCase().trim();
    return threads.filter((t) => {
      if (searchScope === "category" && activeCategory && t.category !== activeCategory) return false;
      if (taggedUsers.length > 0 && !taggedUsers.some((u) => u.id === t.author.id)) return false;
      if (textQuery && !t.title.toLowerCase().includes(textQuery) && !t.body.toLowerCase().includes(textQuery)) return false;
      return true;
    });
  }, [threads, search, searchScope, activeCategory, taggedUsers]);

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
          onClick={() => { setActiveCategory(null); setSearchScope("all"); }}
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

      {/* Search bar */}
      <div className="flex gap-2 mb-6 flex-wrap items-start">
        <div className="relative flex-1 min-w-[200px]">
          {/* Input area with chips */}
          <div
            className="flex flex-wrap gap-1.5 items-center bg-[#1e1e1e] border border-white/10 rounded-xl px-3 py-2 focus-within:border-[#c9a050]/40 cursor-text min-h-[42px]"
            onClick={() => searchInputRef.current?.focus()}
          >
            {taggedUsers.map((u) => (
              <span key={u.id} className="flex items-center gap-1 bg-[#c9a050]/15 border border-[#c9a050]/30 text-[#c9a050] text-xs font-medium rounded-full px-2.5 py-1 shrink-0">
                @{u.displayName}
                <button onClick={(e) => { e.stopPropagation(); setTaggedUsers((prev) => prev.filter((t) => t.id !== u.id)); }} className="text-[#c9a050]/60 hover:text-[#c9a050] leading-none ml-0.5">✕</button>
              </span>
            ))}
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setMentionQuery(null); setSearch(""); setTaggedUsers([]); } }}
              placeholder={taggedUsers.length === 0 ? "Search forum… (type @ to filter by user)" : ""}
              className="flex-1 min-w-[120px] bg-transparent text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none py-0.5"
            />
            {(search || taggedUsers.length > 0) && (
              <button onClick={() => { setSearch(""); setTaggedUsers([]); setMentionQuery(null); }} className="text-gray-600 hover:text-gray-400 text-xs shrink-0">✕</button>
            )}
          </div>

          {/* Mention dropdown */}
          {mentionSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
              {mentionSuggestions.map((u) => (
                <button
                  key={u.id}
                  onMouseDown={(e) => { e.preventDefault(); handleSelectUser(u); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <span className="text-[#c9a050]">@</span>{u.displayName}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setSearchScope("all")}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            searchScope === "all"
              ? "bg-[#c9a050]/10 border-[#c9a050]/30 text-[#c9a050]"
              : "border-white/10 text-gray-500 hover:text-gray-300"
          }`}
        >
          All Forum
        </button>
        <button
          onClick={() => activeCategory && setSearchScope(searchScope === "category" ? "all" : "category")}
          disabled={!activeCategory}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            searchScope === "category" && activeCategory
              ? "bg-[#c9a050]/10 border-[#c9a050]/30 text-[#c9a050]"
              : "border-white/10 text-gray-500 hover:text-gray-300"
          }`}
        >
          This Category
        </button>
      </div>

      {/* Thread list */}
      {fetching ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : displayedThreads.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          {search ? (
            <p className="text-lg mb-2">No results for &ldquo;{search}&rdquo;</p>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {search && (
            <p className="text-xs text-gray-600 mb-2">{displayedThreads.length} result{displayedThreads.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;</p>
          )}
          {displayedThreads.map((thread) => {
            const unread = isUnread(thread);
            return (
            <Link
              key={thread.id}
              href={`/forum/${thread.id}`}
              onClick={() => markRead(thread.id)}
              className={`flex items-start gap-4 rounded-2xl p-3 transition-colors group border-l-[3px] ${
                unread
                  ? "bg-[#242424] hover:bg-[#2a2a2a] border border-white/5 border-l-[#c9a050]/50"
                  : "bg-[#1c1c1c] hover:bg-[#222222] border border-white/5 border-l-transparent"
              }`}
            >
              {thread.isPinned && (
                <span className="text-[#c9a050] text-xs mt-0.5 shrink-0">📌</span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-1.5">
                  <h2 className={`flex-1 font-semibold group-hover:text-[#c9a050] transition-colors leading-snug flex items-center gap-2 ${unread ? "text-[#f5f2eb]" : "text-gray-400"}`}>
                    {unread && <span className="w-1.5 h-1.5 rounded-full bg-[#c9a050] shrink-0 inline-block" />}
                    {thread.title}
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-600 mt-0.5">
                      {timeAgo(thread.updatedAt)}
                    </span>
                    {isAdmin && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <AdminRemoveButton
                          endpoint={`/api/forum/threads/${thread.id}/admin`}
                          onRemoved={() => setThreads((prev) => prev.filter((t) => t.id !== thread.id))}
                          label="Remove"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <p className={`text-sm line-clamp-2 mb-3 ${unread ? "text-gray-500" : "text-gray-600"}`}>{thread.body}</p>
                <div className="flex items-center gap-3 text-xs text-gray-600 min-w-0">
                  <span className="bg-[#c9a050]/10 text-[#c9a050] px-2.5 py-0.5 rounded-full shrink-0">
                    {categoryLabel(thread.category)}
                  </span>
                  <span className="shrink-0 flex items-center gap-1.5">
                    by {thread.author.profile?.displayName ?? thread.author.name}
                    {thread.author.profile?.isExpert && <span className="text-[#c9a050] text-[10px] font-bold tracking-wide">★ Expert</span>}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5 min-w-0 overflow-hidden">
                    <span className="shrink-0">{thread._count.replies} {thread._count.replies === 1 ? "reply" : "replies"}</span>
                    {thread.lastReply && (
                      <span className="text-gray-700 truncate">
                        · last reply by{" "}
                        <span className="text-gray-500">
                          {thread.lastReply.author.profile?.displayName ?? thread.lastReply.author.name}
                        </span>
                        {" "}· {timeAgo(thread.lastReply.createdAt)}
                      </span>
                    )}
                  </div>
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
