"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

type ChatMsg = { id: string; userId: string; userName: string; body: string; createdAt: string };
type OnlineUser = { id: string; name: string };

const ADMIN_EMAILS = new Set(["leemeyernyc@gmail.com", "teutonblade@shavesplash.com"]);

export default function ChatPage() {
  const { session } = useSession();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = ADMIN_EMAILS.has(session?.user?.email ?? "");

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  };

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const { ticket } = await api.post<{ ticket: string }>("/api/room/ticket", {});
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
      const wsUrl = backendUrl.replace("https://", "wss://").replace("http://", "ws://");
      const ws = new WebSocket(`${wsUrl}/api/room/ws?ticket=${ticket}`);

      ws.onopen = () => setConnected(true);

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "history") {
            setMessages(data.messages);
            setTimeout(() => scrollToBottom(false), 50);
          } else if (data.type === "message") {
            setMessages((prev) => [...prev, data.message]);
            setTimeout(() => scrollToBottom(true), 50);
          } else if (data.type === "online") {
            setOnlineCount(data.count);
            setOnlineUsers(data.users ?? []);
          } else if (data.type === "delete") {
            setMessages((prev) => prev.filter((m) => m.id !== data.id));
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 4000);
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    } catch {}
  }, []);

  useEffect(() => {
    if (session) connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [session, connect]);

  const send = () => {
    const body = input.trim();
    if (!body || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "message", body }));
    setInput("");
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !confirm("Delete this message?")) return;
    await api.delete(`/api/room/${id}`).catch(() => {});
  };

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-gray-500">Sign in to join the chat.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050]">Chat</h1>
        <div className="relative group">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium cursor-default select-none ${connected ? "bg-green-500/10 text-green-400" : "bg-white/5 text-gray-500"}`}>
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-gray-600"}`} />
            {connected ? `${onlineCount} online` : "Connecting…"}
          </div>
          {onlineUsers.length > 0 && (
            <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-20 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl py-2 min-w-[160px]">
              <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-wider px-3 pb-1.5">Online now</p>
              {onlineUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2 px-3 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span className="text-[#f5f2eb] text-sm">{u.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[#191919] rounded-2xl border border-white/5 p-4 space-y-3 mb-4">
        {messages.length === 0 && connected && (
          <p className="text-gray-600 text-sm text-center py-8">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.userId === session.user.id;
          const time = new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
              {!isOwn && (
                <span className="text-[#c9a050] text-xs font-semibold mb-1 ml-1">{msg.userName || msg.userId.slice(0, 8)}</span>
              )}
              <div className="group relative">
                <div className={`max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isOwn
                    ? "bg-[#c9a050] text-black rounded-br-sm"
                    : "bg-[#2a2a2a] text-[#f5f2eb] rounded-bl-sm"
                }`}>
                  {msg.body}
                </div>
                {isAdmin && !isOwn && (
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="absolute -top-1 -right-6 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-opacity"
                  >
                    ×
                  </button>
                )}
              </div>
              <span className="text-gray-600 text-xs mt-1 mx-1">{time}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message…"
          className="flex-1 bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
        />
        <button
          onClick={send}
          disabled={!input.trim() || !connected}
          className="bg-[#c9a050] text-black font-bold px-5 py-3 rounded-xl hover:bg-[#b8903f] transition-colors disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
