"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

interface Author {
  id: string;
  name: string;
  profile?: { displayName?: string };
}

interface Reply {
  id: string;
  body: string;
  author: Author;
  createdAt: string;
}

interface Thread {
  id: string;
  title: string;
  body: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
  author: Author;
  replies: Reply[];
}

const CATEGORY_LABELS: Record<string, string> = {
  "general": "General Discussion",
  "soap-reviews": "Soap Reviews",
  "razor-reviews": "Razor Reviews",
  "brush-reviews": "Brush Reviews",
  "technique": "Technique & Advice",
  "show-and-tell": "Show & Tell",
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

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useSession();
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    api.get<{ thread: Thread }>(`/api/forum/threads/${id}`)
      .then((d) => setThread(d.thread))
      .catch(() => router.push("/forum"));
  }, [id, router]);

  const handleReply = async () => {
    if (!replyBody.trim() || submitting || !session) return;
    setSubmitting(true);
    try {
      const { reply } = await api.post<{ reply: Reply }>(
        `/api/forum/threads/${id}/replies`,
        { body: replyBody.trim() }
      );
      setThread((t) => t ? { ...t, replies: [...t.replies, reply] } : t);
      setReplyBody("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
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
          {session?.user.id === thread.author.id && (
            <button
              onClick={handleDeleteThread}
              className="text-xs text-red-500 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
        <h1 className="font-[family-name:var(--font-fredericka)] text-2xl text-[#f5f2eb] mb-4 leading-snug">
          {thread.title}
        </h1>
        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-4">{thread.body}</p>
        <div className="flex items-center gap-2 text-xs text-gray-600 border-t border-white/5 pt-4">
          <span className="font-medium text-gray-400">{displayName(thread.author)}</span>
          <span>·</span>
          <span>{timeAgo(thread.createdAt)}</span>
        </div>
      </div>

      {/* Replies */}
      {thread.replies.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {thread.replies.map((reply, i) => (
            <div key={reply.id} className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-gray-400 font-medium">{displayName(reply.author)}</span>
                  <span>·</span>
                  <span>{timeAgo(reply.createdAt)}</span>
                  <span className="text-gray-700">#{i + 1}</span>
                </div>
                {session?.user.id === reply.author.id && (
                  <button
                    onClick={() => handleDeleteReply(reply.id)}
                    className="text-xs text-red-500/60 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{reply.body}</p>
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
          <button
            onClick={handleReply}
            disabled={!replyBody.trim() || submitting}
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
