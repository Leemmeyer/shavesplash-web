"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

interface Message {
  id: string;
  body: string;
  senderId: string;
  sender: { id: string; name: string };
  createdAt: string;
  readAt?: string | null;
}

interface ConversationDetail {
  id: string;
  listing: { id: string; title: string; brand?: string };
  buyer: { id: string; name: string; email: string; profile?: { displayName?: string } | null };
  seller: { id: string; name: string; email: string; profile?: { displayName?: string } | null };
  messages: Message[];
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading } = useSession();
  const router = useRouter();
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !session) router.push("/sign-in");
  }, [session, loading, router]);

  useEffect(() => {
    if (!session || !id) return;
    api.get<{ conversation: ConversationDetail }>(`/api/bst/conversations/${id}`)
      .then((d) => {
        setConv(d.conversation);
        setMessages(d.conversation.messages ?? []);
      })
      .catch(() => router.push("/messages"));
    api.patch(`/api/bst/conversations/${id}/read`).catch(() => {});
  }, [session, id, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const { message } = await api.post<{ message: Message }>(
        `/api/bst/conversations/${id}/messages`,
        { body: body.trim() }
      );
      setMessages((prev) => [...prev, message]);
      setBody("");
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  if (loading || !session || !conv) return null;

  const otherUser = conv.buyer.id === session.user.id ? conv.seller : conv.buyer;
  const other = { ...otherUser, displayName: otherUser.profile?.displayName ?? otherUser.name };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col" style={{ height: "calc(100vh - 57px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/messages" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
        <div className="flex-1">
          <h1 className="text-[#f5f2eb] font-semibold">{other.displayName}</h1>
          <Link href={`/bst/${conv.listing.id}`} className="text-xs text-[#c9a050] hover:underline">
            {conv.listing.title}
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 mb-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === session.user.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isMe
                    ? "bg-[#c9a050] text-black rounded-br-sm"
                    : "bg-[#2a2a2a] text-[#f5f2eb] rounded-bl-sm"
                }`}
              >
                <p>{msg.body}</p>
                <p className={`text-xs mt-1 ${isMe ? "text-black/50" : "text-gray-600"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="flex gap-3 items-end border-t border-white/5 pt-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type a message…"
          rows={2}
          className="flex-1 bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f5f2eb] placeholder-gray-600 resize-none focus:outline-none focus:border-[#c9a050]/40"
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending}
          className="bg-[#c9a050] text-black font-semibold px-5 py-3 rounded-xl hover:bg-[#b8903f] disabled:opacity-40 transition-colors text-sm whitespace-nowrap"
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
