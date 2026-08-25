"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

function LinkedBody({ body, isMe }: { body: string; isMe: boolean }) {
  const parts = body.split(/(https?:\/\/[^\s]+)/);
  return (
    <p className="px-4 py-3">
      {parts.map((part, i) =>
        part.startsWith("http://") || part.startsWith("https://") ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className={`underline break-all ${isMe ? "text-blue-900" : "text-blue-400"}`}>
            {part}
          </a>
        ) : part
      )}
    </p>
  );
}

interface Message {
  id: string;
  body: string;
  imageData?: string | null;
  senderId: string;
  sender: { id: string; name: string };
  createdAt: string;
  readAt?: string | null;
}

interface ConversationDetail {
  id: string;
  isDirect: boolean;
  listing: { id: string; title: string; brand?: string } | null;
  buyer: { id: string; name: string; email: string; profile?: { displayName?: string } | null };
  seller: { id: string; name: string; email: string; profile?: { displayName?: string } | null };
  messages: Message[];
}

function safeDisplayName(profile: { displayName?: string | null } | null | undefined, fallback = "User"): string {
  const dn = profile?.displayName;
  return dn && !dn.includes("@") ? dn : fallback;
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading } = useSession();
  const router = useRouter();
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingMsg, setDeletingMsg] = useState<string | null>(null);
  const [confirmDeleteConv, setConfirmDeleteConv] = useState(false);
  const [deletingConv, setDeletingConv] = useState(false);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = async () => {
    if ((!body.trim() && !pendingImage) || sending) return;
    setSending(true);
    try {
      const { message } = await api.post<{ message: Message }>(
        `/api/bst/conversations/${id}/messages`,
        { body: body.trim(), ...(pendingImage ? { imageData: pendingImage } : {}) }
      );
      setMessages((prev) => [...prev, message]);
      setBody("");
      setPendingImage(null);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    setDeletingMsg(msgId);
    try {
      await api.delete(`/api/bst/conversations/${id}/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch {
      // ignore
    } finally {
      setDeletingMsg(null);
    }
  };

  const handleDeleteConversation = async () => {
    setDeletingConv(true);
    try {
      await api.delete(`/api/bst/conversations/${id}`);
      router.push("/messages");
    } catch {
      setDeletingConv(false);
      setConfirmDeleteConv(false);
    }
  };

  if (loading || !session || !conv) return null;

  const otherUser = conv.buyer.id === session.user.id ? conv.seller : conv.buyer;
  const meUser = conv.buyer.id === session.user.id ? conv.buyer : conv.seller;
  const otherName = safeDisplayName(otherUser.profile, "User");
  const myName = safeDisplayName(meUser.profile, "You");

  const senderName = (senderId: string) => senderId === session.user.id ? myName : otherName;
  const sendLabel = sending ? "…" : messages.length === 0 ? "Send" : "Reply";

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col" style={{ height: "calc(100vh - 57px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/messages" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
        <div className="flex-1">
          <h1 className="text-[#f5f2eb] font-semibold">{otherName}</h1>
          {conv.listing ? (
            <Link href={`/bst/${conv.listing.id}`} className="text-xs text-[#c9a050] hover:underline">
              {conv.listing.title}
            </Link>
          ) : (
            <span className="text-xs text-gray-600">Direct message</span>
          )}
        </div>
        <button
          onClick={() => setConfirmDeleteConv(true)}
          className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1"
        >
          Delete conversation
        </button>
      </div>

      {/* Delete conversation confirm */}
      {confirmDeleteConv && (
        <div className="mb-4 bg-[#2a2a2a] border border-red-400/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-300">Delete this entire conversation? This cannot be undone.</p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleDeleteConversation}
              disabled={deletingConv}
              className="text-sm bg-red-500 text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {deletingConv ? "Deleting…" : "Delete"}
            </button>
            <button
              onClick={() => setConfirmDeleteConv(false)}
              className="text-sm text-gray-500 hover:text-gray-300 px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 mb-4">
        {messages.length === 0 && (
          <p className="text-gray-600 text-sm text-center mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === session.user.id;
          return (
            <div key={msg.id} className={`flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
              <span className="text-xs text-gray-500 px-2">{senderName(msg.senderId)}</span>
              <div className={`max-w-[75%] rounded-2xl overflow-hidden text-sm leading-relaxed ${
                isMe ? "bg-[#c9a050] text-black rounded-br-sm" : "bg-[#2a2a2a] text-[#f5f2eb] rounded-bl-sm"
              }`}>
                {msg.imageData && (
                  <img src={msg.imageData} alt="attachment" className="w-full max-w-xs object-cover" />
                )}
                {msg.body.trim() && <LinkedBody body={msg.body} isMe={isMe} />}
                <div className={`flex items-center gap-2 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                  <p className={`text-xs ${isMe ? "text-black/50" : "text-gray-600"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {isMe && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      disabled={deletingMsg === msg.id}
                      className="text-[10px] text-black/60 hover:text-red-700 transition-colors"
                      title="Delete message"
                    >
                      {deletingMsg === msg.id ? "…" : "✕"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
        {pendingImage && (
          <div className="relative self-start">
            <img src={pendingImage} alt="preview" className="w-20 h-20 rounded-lg object-cover" />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1a1a1a] border border-white/20 flex items-center justify-center text-[10px] text-gray-300 hover:text-white"
            >✕</button>
          </div>
        )}
        <div className="flex gap-3 items-end">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-600 hover:text-[#c9a050] transition-colors pb-3 shrink-0"
            title="Attach image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
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
            disabled={(!body.trim() && !pendingImage) || sending}
            className="bg-[#c9a050] text-black font-semibold px-5 py-3 rounded-xl hover:bg-[#b8903f] disabled:opacity-40 transition-colors text-sm whitespace-nowrap"
          >
            {sendLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
