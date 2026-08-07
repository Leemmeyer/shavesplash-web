"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

const SOTD_EMOJIS = ["👍", "❤️", "🔥", "😊", "😮", "😢"];
const CATEGORY_ICONS: Record<string, string> = {
  razors: "🪒", soaps: "🫧", aftershaves: "💧", balms: "🧴", preshaves: "✨", edpedt: "🌸",
};
const CATEGORY_LABELS: Record<string, string> = {
  razors: "Razor", blades: "Blade", brushes: "Brush", soaps: "Soap",
  aftershaves: "Aftershave", balms: "Balm", preshaves: "Pre-Shave", edpedt: "EDP/EDT",
};

function BladeSvg() {
  return (
    <svg width="18" height="11" viewBox="0 0 20 12" fill="none" shapeRendering="crispEdges" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <rect x="1" y="1" width="18" height="10" rx="1.5" stroke="#8898a8" strokeWidth="1.5" fill="#c0c8cc" />
      <ellipse cx="10" cy="6" rx="2.5" ry="2" fill="#111827" stroke="#7888a0" strokeWidth="1" />
      <line x1="2" y1="3.5" x2="6.5" y2="3.5" stroke="#dce8ec" strokeWidth="0.75" />
      <line x1="13.5" y1="3.5" x2="18" y2="3.5" stroke="#dce8ec" strokeWidth="0.75" />
      <line x1="2" y1="8.5" x2="6.5" y2="8.5" stroke="#dce8ec" strokeWidth="0.75" />
      <line x1="13.5" y1="8.5" x2="18" y2="8.5" stroke="#dce8ec" strokeWidth="0.75" />
    </svg>
  );
}

function BrushSvg() {
  return (
    <svg width="12" height="18" viewBox="0 0 14 20" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <ellipse cx="7" cy="6" rx="5.5" ry="5" fill="#d4bc7a" />
      <line x1="7" y1="2" x2="7" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <line x1="4.5" y1="2.5" x2="5.5" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <line x1="9.5" y1="2.5" x2="8.5" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <line x1="2.5" y1="5" x2="4" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <line x1="11.5" y1="5" x2="10" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <rect x="4.5" y="10" width="5" height="2" rx="0.3" fill="#9ca3af" />
      <path d="M 5.2 12 C 3 13 2.5 16 4 19 Q 5.5 19.5 7 19.5 Q 8.5 19.5 10 19 C 11.5 16 11 13 8.8 12 Z" fill="#dc2626" />
    </svg>
  );
}

function CategoryIcon({ catId }: { catId: string }) {
  if (catId === 'blades') return <BladeSvg />;
  if (catId === 'brushes') return <BrushSvg />;
  return <span>{CATEGORY_ICONS[catId] ?? '•'}</span>;
}
const CATEGORY_ORDER = ["razors", "blades", "brushes", "soaps", "aftershaves", "balms", "preshaves", "edpedt"];
const STATS_LABELS: Record<string, string> = {
  razors: "Razors", blades: "Blades", soaps: "Soaps", aftershaves: "Aftershaves",
};

type ScoreEntry = { value: number; shortName: string } | number;
type SelectedItem = { itemName?: string; plate?: string; bladeUses?: number };
type ReactionGroup = { count: number; reacted: boolean };

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  isOwn: boolean;
}

interface SotdPost {
  id: string;
  date: number;
  result: string;
  resultRank?: number;
  resultOptionsCount?: number;
  scores: Record<string, ScoreEntry>;
  selectedItems: Record<string, SelectedItem>;
  notes?: string;
  hasPhoto?: boolean;
  isAnonymous: boolean;
  authorName: string | null;
  reactions: Record<string, ReactionGroup>;
  commentCount: number;
  comments: Comment[];
}

function getScoreValue(s: ScoreEntry): number {
  return typeof s === "number" ? s : s.value;
}
function avgScore(scores: Record<string, ScoreEntry>): number | null {
  const vals = Object.values(scores).map(getScoreValue).filter((v) => v > 0);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function resultColor(rank?: number, total?: number): string {
  if (!rank || !total) return "#6b7280";
  const colors = ["#b45309", "#d97706", "#f59e0b", "#fbbf24", "#a3e635", "#86efac", "#4ade80", "#22c55e", "#16a34a"];
  const idx = rank - 1;
  const step = (colors.length - 1) / Math.max(total - 1, 1);
  return colors[Math.round(idx * step)] ?? "#6b7280";
}

// ── SOTD Card ────────────────────────────────────────────────────────────────
function SotdCard({ post, onReact, session }: {
  post: SotdPost;
  onReact: (logId: string, emoji: string) => void;
  session: { user: { id: string } } | null;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<Comment[]>(post.comments);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [gearExpanded, setGearExpanded] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const GEAR_LIMIT = 5;

  // Lazy-load photo when card scrolls into view
  useEffect(() => {
    if (!post.hasPhoto) return;
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          api.get<{ photoUrl: string | null }>(`/api/logs/${post.id}/photo`)
            .then((d) => { if (d.photoUrl) setPhotoUrl(d.photoUrl); })
            .catch(() => {});
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [post.id, post.hasPhoto]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const color = resultColor(post.resultRank, post.resultOptionsCount);
  const avg = avgScore(post.scores);
  const usedItems = Object.entries(post.selectedItems)
    .filter(([, s]) => s.itemName)
    .sort(([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));

  const scoreEntries = Object.entries(post.scores)
    .map(([, v]) => getScoreValue(v))
    .filter((v) => v > 0);

  const handleComment = async () => {
    if (!commentBody.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { comment } = await api.post<{ comment: Comment }>(`/api/sotd/${post.id}/comments`, { body: commentBody.trim() });
      setComments((prev) => [...prev, comment]);
      setCommentBody("");
    } catch { /* ignore */ } finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (id: string) => {
    setDeletingComment(id);
    try {
      await api.delete(`/api/sotd/${post.id}/comments/${id}`);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch { /* ignore */ } finally { setDeletingComment(null); }
  };

  return (
    <>
    {/* Lightbox */}
    {lightboxOpen && photoUrl && (
      <div
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 cursor-pointer"
        onClick={() => setLightboxOpen(false)}
      >
        <button
          className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl leading-none transition-colors"
          onClick={() => setLightboxOpen(false)}
        >✕</button>
        <img
          src={photoUrl}
          alt="SOTD"
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}

    <div ref={cardRef} className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden">
      {/* Header: name + date + result */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <p className="text-[#f5f2eb] font-semibold text-sm">{post.isAnonymous ? "Anonymous" : (post.authorName ?? "User")}</p>
          <p className="text-gray-600 text-xs">{formatDate(post.date)}</p>
        </div>
        <span
          className="px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0"
          style={{ color, borderColor: color + "66", backgroundColor: color + "1a" }}
        >
          {post.result}
        </span>
      </div>

      {/* Body: photo left, gear + scores right */}
      <div className="flex gap-4 px-4 pb-4">
        {post.hasPhoto && (
          <button
            onClick={() => photoUrl && setLightboxOpen(true)}
            className="shrink-0 w-[218px] h-[218px] rounded-xl overflow-hidden border border-white/10 hover:border-[#c9a050]/60 transition-colors bg-[#242424] flex items-center justify-center"
            title="Click to expand"
          >
            {photoUrl ? (
              <img src={photoUrl} alt="SOTD" className="w-full h-full object-cover" />
            ) : (
              <div className="w-5 h-5 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
            )}
          </button>
        )}

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Gear */}
          {usedItems.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {(gearExpanded ? usedItems : usedItems.slice(0, GEAR_LIMIT)).map(([catId, s]) => (
                <div key={catId} className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-600 text-xs shrink-0 whitespace-nowrap w-24 flex items-center gap-1">
                    <CategoryIcon catId={catId} />
                    {CATEGORY_LABELS[catId] ?? catId}
                  </span>
                  <span className="text-gray-200 text-xs truncate">{s.itemName}{s.plate ? ` · ${s.plate}` : ""}{s.bladeUses != null ? ` · ${s.bladeUses}×` : ""}</span>
                </div>
              ))}
              {usedItems.length > GEAR_LIMIT && (
                <button
                  onClick={() => setGearExpanded((v) => !v)}
                  className="text-left text-[#c9a050] text-xs hover:text-[#d4aa60] transition-colors mt-0.5"
                >
                  {gearExpanded ? "Show less" : `+${usedItems.length - GEAR_LIMIT} more`}
                </button>
              )}
            </div>
          )}

          {/* Avg + scores */}
          {scoreEntries.length > 0 && (
            <div>
              {avg !== null && (
                <div className="mb-2">
                  <span className="text-[#c9a050] text-2xl font-bold">{avg.toFixed(1)}</span>
                  <span className="text-gray-600 text-xs ml-1">avg</span>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {Object.entries(post.scores).map(([key, v]) => {
                  const val = getScoreValue(v);
                  if (!val) return null;
                  const label = typeof v === "number" ? key.slice(0, 4) : v.shortName;
                  return (
                    <div key={key} className="text-center">
                      <p className="text-[#c9a050] text-sm font-bold">{val}</p>
                      <p className="text-gray-600 text-[10px]">{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Notes */}
        {post.notes && (
          <p className="text-gray-400 text-sm leading-relaxed border-l-2 border-white/10 pl-3">{post.notes}</p>
        )}

        {/* Reactions */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {/* Show existing reactions that have counts */}
          {SOTD_EMOJIS.filter((e) => (post.reactions[e]?.count ?? 0) > 0).map((emoji) => {
            const g = post.reactions[emoji];
            return (
              <button
                key={emoji}
                onClick={() => session ? onReact(post.id, emoji) : undefined}
                disabled={!session}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-colors ${
                  g?.reacted
                    ? "bg-[#c9a050]/20 border-[#c9a050]/50 text-[#f5f2eb]"
                    : "border-white/10 text-gray-500 hover:border-white/20 disabled:cursor-default"
                }`}
              >
                <span>{emoji}</span>
                <span className="text-xs font-medium">{g!.count}</span>
              </button>
            );
          })}

          {/* Emoji picker trigger */}
          <div className="relative" ref={pickerRef}>
            {showEmojiPicker ? (
              <div className="flex items-center gap-0.5 bg-[#242424] border border-white/10 rounded-full px-2 py-1">
                {SOTD_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      if (session) onReact(post.id, emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => session ? setShowEmojiPicker(true) : undefined}
                disabled={!session}
                title={session ? "React" : "Sign in to react"}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 text-base text-gray-500 hover:border-white/25 hover:bg-white/5 transition-colors disabled:cursor-default"
              >
                👍
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowComments((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span>💬</span>
              <span>{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
            </button>
            {session && (
              <button
                onClick={() => {
                  setShowComments(true);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                className="text-xs text-[#c9a050] border border-[#c9a050]/30 hover:bg-[#c9a050]/10 px-2.5 py-1 rounded-full transition-colors"
              >
                Add Comment
              </button>
            )}
          </div>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="border-t border-white/5 pt-3 space-y-3">
            {comments.length === 0 && (
              <p className="text-gray-600 text-xs text-center">No comments yet.</p>
            )}
            {comments.map((cm) => (
              <div key={cm.id} className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-[#c9a050] text-xs font-semibold mr-1.5">{cm.authorName}</span>
                  <span className="text-gray-300 text-sm">{cm.body}</span>
                </div>
                {cm.isOwn && (
                  <button
                    onClick={() => handleDeleteComment(cm.id)}
                    disabled={deletingComment === cm.id}
                    className="text-gray-700 hover:text-red-400 text-xs shrink-0 transition-colors"
                  >
                    {deletingComment === cm.id ? "…" : "✕"}
                  </button>
                )}
              </div>
            ))}
            {session ? (
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                  placeholder="Add a comment…"
                  rows={1}
                  className="flex-1 bg-[#242424] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 resize-none focus:outline-none focus:border-[#c9a050]/40"
                />
                {commentBody && (
                  <button
                    onClick={() => setCommentBody("")}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors text-sm shrink-0"
                    title="Clear"
                  >✕</button>
                )}
                <button
                  onClick={handleComment}
                  disabled={!commentBody.trim() || submitting}
                  className="bg-[#c9a050] text-black font-semibold px-3 py-2 rounded-lg text-xs hover:bg-[#b8903f] disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  {submitting ? "…" : "Post"}
                </button>
              </div>
            ) : (
              <p className="text-gray-600 text-xs">
                <Link href="/sign-in" className="text-[#c9a050] hover:underline">Sign in</Link> to comment.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// ── Stats Sidebar ─────────────────────────────────────────────────────────────
function StatsSidebar() {
  const [period, setPeriod] = useState<"today" | "month" | "all">("month");
  const [stats, setStats] = useState<Record<string, { name: string; count: number }[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<{ stats: Record<string, { name: string; count: number }[]> }>(`/api/sotd/stats?period=${period}`)
      .then((d) => setStats(d.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const PERIODS: { key: "today" | "month" | "all"; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All Time" },
  ];

  const STAT_CATS = ["razors", "blades", "soaps", "aftershaves"];

  return (
    <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-4 sticky top-20">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-[family-name:var(--font-fredericka)] text-[#c9a050] text-lg">Community Stats</h2>
        <Link
          href="/sotd/graphs"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#c9a050] border border-white/10 hover:border-[#c9a050]/30 px-2.5 py-1 rounded-full transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1" y="7" width="3" height="6" rx="0.5"/>
            <rect x="5.5" y="4" width="3" height="9" rx="0.5"/>
            <rect x="10" y="1" width="3" height="12" rx="0.5"/>
          </svg>
          Graphs
        </Link>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 mb-4 bg-[#242424] rounded-xl p-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              period === p.key ? "bg-[#c9a050] text-black" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {STAT_CATS.map((cat) => {
            const items = stats[cat] ?? [];
            if (!items.length) return null;
            const icon = CATEGORY_ICONS[cat];
            return (
              <div key={cat}>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
                  {icon} {STATS_LABELS[cat]}
                </p>
                <div className="space-y-1.5">
                  {items.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-gray-300 text-xs truncate">{item.name}</span>
                          <span className="text-gray-600 text-xs shrink-0">{item.count}</span>
                        </div>
                        <div className="h-1 bg-[#242424] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#c9a050]/60 rounded-full"
                            style={{ width: `${(item.count / (items[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SotdPage() {
  const { session } = useSession();
  const [posts, setPosts] = useState<SotdPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const LIMIT = 20;

  const fetchPosts = useCallback(async (off: number, append = false) => {
    if (off === 0) setLoading(true); else setLoadingMore(true);
    try {
      const d = await api.get<{ posts: SotdPost[]; hasMore: boolean }>(`/api/sotd?limit=${LIMIT}&offset=${off}`);
      setPosts((prev) => append ? [...prev, ...d.posts] : d.posts);
      setHasMore(d.hasMore);
      setOffset(off + d.posts.length);
    } catch { /* ignore */ } finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { fetchPosts(0); }, [fetchPosts]);

  const handleReact = async (logId: string, emoji: string) => {
    try {
      const { reactions } = await api.post<{ reactions: Record<string, ReactionGroup> }>(`/api/sotd/${logId}/reactions`, { emoji });
      setPosts((prev) => prev.map((p) => p.id === logId ? { ...p, reactions } : p));
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#c9a050] mb-1">
            Shave of the Day
          </h1>
          <p className="text-gray-500 text-sm">What the community shaved with today</p>
        </div>
        {session && (
          <Link
            href="/logs"
            className="text-sm bg-[#c9a050] text-black font-bold px-4 py-2.5 rounded-xl hover:bg-[#b8903f] transition-colors"
          >
            Share My Shave
          </Link>
        )}
      </div>

      <div className="flex gap-6 items-start">
        {/* Feed */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-gray-600">
              <p className="text-5xl mb-4">🪒</p>
              <p className="text-lg mb-2">No shaves shared yet</p>
              <p className="text-sm mb-6">Be the first — share a shave from your History page.</p>
              {session ? (
                <Link href="/logs" className="inline-block bg-[#c9a050] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#b8903f] transition-colors text-sm">
                  Go to History
                </Link>
              ) : (
                <Link href="/sign-in" className="inline-block bg-[#c9a050] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#b8903f] transition-colors text-sm">
                  Sign in to share
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <SotdCard key={post.id} post={post} onReact={handleReact} session={session} />
              ))}
              {hasMore && (
                <button
                  onClick={() => fetchPosts(offset, true)}
                  disabled={loadingMore}
                  className="w-full py-3 text-sm text-gray-500 hover:text-gray-300 border border-white/5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-72 shrink-0">
          <StatsSidebar />
        </div>
      </div>
    </div>
  );
}
