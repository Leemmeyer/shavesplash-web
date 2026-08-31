"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import AdminRemoveButton from "@/components/AdminRemoveButton";

const ADMIN_EMAIL = "leemeyernyc@gmail.com";

const FORUM_EMOJIS = ["👍", "❤️", "🔥", "😊", "😮", "😢"];

interface Author {
  id: string;
  name: string;
  profile?: { displayName?: string; isExpert?: boolean };
}

type ReactionGroup = { count: number; reacted: boolean };

interface Reply {
  id: string;
  body: string;
  photoUrl?: string | null;
  author: Author;
  createdAt: string;
  reactions: Record<string, ReactionGroup>;
}

interface Thread {
  id: string;
  title: string;
  body: string;
  category: string;
  isPinned: boolean;
  photoUrl?: string | null;
  createdAt: string;
  author: Author;
  replies: Reply[];
  reactions: Record<string, ReactionGroup>;
}

const CATEGORY_LABELS: Record<string, string> = {
  "general": "General Discussion",
  "razors": "Razors",
  "soap-aftershave": "Soap/Aftershave",
  "brushes": "Brushes",
  "blades": "Blades",
  "fragrance": "Fragrance",
};

function displayName(author: Author) {
  return author.profile?.displayName ?? author.name;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

// ── Emoji Picker ──────────────────────────────────────────────────────────────
function ForumReactionPill({ emoji, count, reacted, onClick, disabled, targetType, targetId }: {
  emoji: string;
  count: number;
  reacted: boolean;
  onClick: () => void;
  disabled: boolean;
  targetType: string;
  targetId: string;
}) {
  const [names, setNames] = useState<string[] | null>(null);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    setHovered(true);
    if (names === null) {
      timerRef.current = setTimeout(() => {
        api.get<{ names: string[] }>(`/api/forum/reactions/reactors?targetType=${targetType}&targetId=${targetId}&emoji=${encodeURIComponent(emoji)}`)
          .then((r) => setNames(r.names))
          .catch(() => setNames([]));
      }, 200);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const display = names ? (names.length <= 5 ? names : [...names.slice(0, 5), `+${names.length - 5} more`]) : null;

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-colors ${
          reacted
            ? "bg-[#c9a050]/20 border-[#c9a050]/50 text-[#f5f2eb]"
            : "border-white/10 text-gray-500 hover:border-white/20 disabled:cursor-default"
        }`}
      >
        <span>{emoji}</span>
        <span className="text-xs font-medium">{count}</span>
      </button>
      {hovered && display && display.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none">
          <div className="bg-[#1a1a1a] border border-white/15 rounded-xl px-3 py-2 shadow-xl min-w-[100px] max-w-[180px]">
            {display.map((name, i) => (
              <p key={i} className="text-xs text-gray-300 whitespace-nowrap leading-5">{name}</p>
            ))}
          </div>
          <div className="w-2 h-2 bg-[#1a1a1a] border-r border-b border-white/15 rotate-45 ml-3 -mt-1" />
        </div>
      )}
    </div>
  );
}

function EmojiReactions({ reactions, onReact, session, targetType, targetId }: {
  reactions: Record<string, ReactionGroup>;
  onReact: (emoji: string) => void;
  session: { user: { id: string } } | null;
  targetType: string;
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Active reaction pills */}
      {FORUM_EMOJIS.filter((e) => (reactions[e]?.count ?? 0) > 0).map((emoji) => {
        const g = reactions[emoji];
        return (
          <ForumReactionPill
            key={emoji}
            emoji={emoji}
            count={g!.count}
            reacted={g!.reacted}
            onClick={() => session ? onReact(emoji) : undefined}
            disabled={!session}
            targetType={targetType}
            targetId={targetId}
          />
        );
      })}

      {/* Picker trigger */}
      <div className="relative" ref={ref}>
        {open ? (
          <div className="flex items-center gap-0.5 bg-[#242424] border border-white/10 rounded-full px-2 py-1">
            {FORUM_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { if (session) onReact(emoji); setOpen(false); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-base"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => session ? setOpen(true) : undefined}
            disabled={!session}
            title={session ? "React" : "Sign in to react"}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 text-base hover:border-white/25 hover:bg-white/5 transition-colors disabled:cursor-default grayscale opacity-50"
          >
            😊
          </button>
        )}
      </div>
    </div>
  );
}

// ── Thread Page ───────────────────────────────────────────────────────────────
export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useSession();
  const isAdmin = session?.user.email === ADMIN_EMAIL;
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyPhotoDataUrl, setReplyPhotoDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replySearch, setReplySearch] = useState("");
  const [taggedReplyUsers, setTaggedReplyUsers] = useState<{ id: string; displayName: string }[]>([]);
  const [replyMentionQuery, setReplyMentionQuery] = useState<string | null>(null);
  const replySearchInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const replyAuthors = useMemo(() => {
    if (!thread) return [];
    const seen = new Set<string>();
    const authors: { id: string; displayName: string }[] = [];
    for (const r of [{ author: thread.author }, ...thread.replies]) {
      if (!seen.has(r.author.id)) {
        seen.add(r.author.id);
        authors.push({ id: r.author.id, displayName: r.author.profile?.displayName ?? r.author.name });
      }
    }
    return authors.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [thread]);

  const replyMentionSuggestions = useMemo(() => {
    if (replyMentionQuery === null) return [];
    const q = replyMentionQuery.toLowerCase();
    return replyAuthors
      .filter((a) => a.displayName.toLowerCase().includes(q) && !taggedReplyUsers.some((u) => u.id === a.id))
      .slice(0, 6);
  }, [replyMentionQuery, replyAuthors, taggedReplyUsers]);

  function handleReplySearchChange(value: string) {
    setReplySearch(value);
    const match = value.match(/@([a-zA-Z0-9_ ]*)$/);
    setReplyMentionQuery(match ? match[1] : null);
  }

  function handleSelectReplyUser(user: { id: string; displayName: string }) {
    setReplySearch((prev) => prev.replace(/@[a-zA-Z0-9_ ]*$/, "").trimEnd());
    setReplyMentionQuery(null);
    if (!taggedReplyUsers.some((u) => u.id === user.id)) {
      setTaggedReplyUsers((prev) => [...prev, user]);
    }
    replySearchInputRef.current?.focus();
  }

  const filteredReplies = useMemo(() => {
    if (!thread) return [];
    const textQuery = replySearch.replace(/@[a-zA-Z0-9_ ]*$/, "").toLowerCase().trim();
    return thread.replies.filter((r) => {
      if (taggedReplyUsers.length > 0 && !taggedReplyUsers.some((u) => u.id === r.author.id)) return false;
      if (textQuery && !r.body.toLowerCase().includes(textQuery)) return false;
      return true;
    });
  }, [thread, replySearch, taggedReplyUsers]);

  useEffect(() => {
    if (!id) return;
    api.get<{ thread: Thread }>(`/api/forum/threads/${id}`)
      .then((d) => setThread(d.thread))
      .catch(() => router.push("/forum"));
  }, [id, router]);

  const handleReactThread = async (emoji: string) => {
    if (!session) return;
    const { reactions } = await api.post<{ reactions: Record<string, ReactionGroup> }>(
      "/api/forum/reactions", { targetType: "thread", targetId: id, emoji }
    );
    setThread((t) => t ? { ...t, reactions } : t);
  };

  const handleReactReply = async (replyId: string, emoji: string) => {
    if (!session) return;
    const { reactions } = await api.post<{ reactions: Record<string, ReactionGroup> }>(
      "/api/forum/reactions", { targetType: "reply", targetId: replyId, emoji }
    );
    setThread((t) => t ? {
      ...t,
      replies: t.replies.map((r) => r.id === replyId ? { ...r, reactions } : r),
    } : t);
  };

  const handleReplyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReplyPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleReply = async () => {
    if ((!replyBody.trim() && !replyPhotoDataUrl) || submitting || !session) return;
    setSubmitting(true);
    try {
      const { reply } = await api.post<{ reply: Reply }>(
        `/api/forum/threads/${id}/replies`,
        {
          body: replyBody.trim() || " ",
          ...(replyPhotoDataUrl ? { photoUrl: replyPhotoDataUrl } : {}),
        }
      );
      setThread((t) => t ? { ...t, replies: [...t.replies, reply] } : t);
      setReplyBody("");
      setReplyPhotoDataUrl(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { /* ignore */ } finally { setSubmitting(false); }
  };

  const handleDeleteThread = async () => {
    if (!confirm("Delete this thread?")) return;
    await api.delete(`/api/forum/threads/${id}`);
    router.push("/forum");
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm("Delete this reply?")) return;
    await api.delete(`/api/forum/replies/${replyId}`);
    setThread((t) => t ? { ...t, replies: t.replies.filter((r) => r.id !== replyId) } : t);
  };

  if (!thread) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Back */}
      <Link href="/forum" className="text-gray-500 hover:text-gray-300 text-sm block mb-6">
        ← Forum
      </Link>

      {/* Thread header */}
      <div className="bg-[#242424] border border-white/5 rounded-2xl p-6 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-xs bg-[#c9a050]/10 text-[#c9a050] px-3 py-1 rounded-full">
            {CATEGORY_LABELS[thread.category] ?? thread.category}
          </span>
          <div className="flex items-center gap-2">
            {session?.user.id === thread.author.id && (
              <button
                onClick={handleDeleteThread}
                className="text-xs text-red-500 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            )}
            {isAdmin && (
              <AdminRemoveButton
                endpoint={`/api/forum/threads/${id}/admin`}
                onRemoved={() => router.push("/forum")}
                label="Remove thread"
              />
            )}
          </div>
        </div>
        <h1 className="font-[family-name:var(--font-fredericka)] text-2xl text-[#f5f2eb] mb-4 leading-snug">
          {thread.title}
        </h1>
        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-4">{thread.body}</p>
        {thread.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thread.photoUrl}
            alt="Thread photo"
            className="w-full max-h-80 object-cover rounded-xl mb-4"
          />
        )}
        <div className="flex items-center gap-2 text-xs text-gray-600 border-t border-white/5 pt-4 mb-3">
          <span className="font-medium text-gray-400">{displayName(thread.author)}</span>
          {thread.author.profile?.isExpert && <span className="text-[#c9a050] text-[10px] font-bold tracking-wide">★ Expert</span>}
          <span>·</span>
          <span>{timeAgo(thread.createdAt)}</span>
        </div>
        <EmojiReactions reactions={thread.reactions} onReact={handleReactThread} session={session} targetType="thread" targetId={id} />
      </div>

      {/* Reply search */}
      {thread.replies.length > 2 && (
        <div className="flex gap-2 mb-4 items-start">
          <div className="relative flex-1">
            <div
              className="flex flex-wrap gap-1.5 items-center bg-[#1e1e1e] border border-white/10 rounded-xl px-3 py-2 focus-within:border-[#c9a050]/40 cursor-text min-h-[38px]"
              onClick={() => replySearchInputRef.current?.focus()}
            >
              {taggedReplyUsers.map((u) => (
                <span key={u.id} className="flex items-center gap-1 bg-[#c9a050]/15 border border-[#c9a050]/30 text-[#c9a050] text-xs font-medium rounded-full px-2.5 py-1 shrink-0">
                  @{u.displayName}
                  <button onMouseDown={(e) => { e.preventDefault(); setTaggedReplyUsers((prev) => prev.filter((t) => t.id !== u.id)); }} className="text-[#c9a050]/60 hover:text-[#c9a050] leading-none ml-0.5">✕</button>
                </span>
              ))}
              <input
                ref={replySearchInputRef}
                type="text"
                value={replySearch}
                onChange={(e) => handleReplySearchChange(e.target.value)}
                placeholder={taggedReplyUsers.length === 0 ? "Search this thread… (type @ to filter by user)" : ""}
                className="flex-1 min-w-[120px] bg-transparent text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none py-0.5"
              />
              {(replySearch || taggedReplyUsers.length > 0) && (
                <button onMouseDown={(e) => { e.preventDefault(); setReplySearch(""); setTaggedReplyUsers([]); setReplyMentionQuery(null); }} className="text-gray-600 hover:text-gray-400 text-xs shrink-0">✕</button>
              )}
            </div>
            {replyMentionSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                {replyMentionSuggestions.map((u) => (
                  <button
                    key={u.id}
                    onMouseDown={(e) => { e.preventDefault(); handleSelectReplyUser(u); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <span className="text-[#c9a050]">@</span>{u.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>
          {(replySearch || taggedReplyUsers.length > 0) && (
            <span className="text-xs text-gray-600 shrink-0 pt-2.5">
              {filteredReplies.length} of {thread.replies.length}
            </span>
          )}
        </div>
      )}

      {/* Replies */}
      {thread.replies.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {(replySearch ? filteredReplies : thread.replies).map((reply, i) => (
            <div key={reply.id} className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-gray-400 font-medium">{displayName(reply.author)}</span>
                  {reply.author.profile?.isExpert && <span className="text-[#c9a050] text-[10px] font-bold tracking-wide">★ Expert</span>}
                  <span>·</span>
                  <span>{timeAgo(reply.createdAt)}</span>
                  <span className="text-gray-700">#{i + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  {session?.user.id === reply.author.id && (
                    <button
                      onClick={() => handleDeleteReply(reply.id)}
                      className="text-xs text-red-500/60 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                  {isAdmin && (
                    <AdminRemoveButton
                      endpoint={`/api/forum/replies/${reply.id}/admin`}
                      onRemoved={() => setThread((t) => t ? { ...t, replies: t.replies.filter((r) => r.id !== reply.id) } : t)}
                      label="Remove reply"
                    />
                  )}
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-3">{reply.body}</p>
              {reply.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={reply.photoUrl}
                  alt="Reply photo"
                  className="w-full max-h-64 object-cover rounded-xl mb-3"
                />
              )}
              <EmojiReactions reactions={reply.reactions} onReact={(emoji) => handleReactReply(reply.id, emoji)} session={session} targetType="reply" targetId={reply.id} />
            </div>
          ))}
        </div>
      )}

      <div ref={bottomRef} />

      {/* Reply compose */}
      {session ? (
        <div className="bg-[#242424] border border-white/5 rounded-2xl p-5 mt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Leave a reply</h3>
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Share your thoughts…"
            rows={4}
            className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f5f2eb] placeholder-gray-600 resize-y focus:outline-none focus:border-[#c9a050]/40 mb-3"
          />
          {replyPhotoDataUrl ? (
            <div className="relative mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={replyPhotoDataUrl} alt="Attached photo" className="w-full max-h-48 object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => { setReplyPhotoDataUrl(null); if (replyFileInputRef.current) replyFileInputRef.current.value = ""; }}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors text-sm"
              >✕</button>
            </div>
          ) : (
            <div
              onClick={() => replyFileInputRef.current?.click()}
              className="border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 py-3 mb-3 cursor-pointer hover:border-white/25 transition-colors"
            >
              <span className="text-lg">🖼️</span>
              <span className="text-xs text-gray-500">Attach a photo (optional)</span>
            </div>
          )}
          <input ref={replyFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleReplyFileChange} />
          <button
            onClick={handleReply}
            disabled={(!replyBody.trim() && !replyPhotoDataUrl) || submitting}
            className="bg-[#c9a050] text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-[#b8903f] disabled:opacity-40 transition-colors text-sm"
          >
            {submitting ? "Posting…" : "Post Reply"}
          </button>
        </div>
      ) : (
        <div className="bg-[#242424] border border-white/5 rounded-2xl p-6 mt-6 text-center">
          <p className="text-gray-500 text-sm mb-3">Sign in to join the conversation</p>
          <Link
            href="/sign-in"
            className="inline-block bg-[#c9a050] text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-[#b8903f] transition-colors text-sm"
          >
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
