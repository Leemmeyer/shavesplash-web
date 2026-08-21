"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { signOut } from "@/lib/auth";
import { useSession } from "@/lib/session-context";
import { api } from "@/lib/api";

type AppNotification = {
  id: string;
  type: "forum_reply" | "sotd_comment";
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
};

const ADMIN_EMAIL = "leemeyernyc@gmail.com";

const NAV_LINKS: { href: string; label: string; gold?: boolean }[] = [
  { href: "/den", label: "My Den" },
  { href: "/logs", label: "History" },
  { href: "/analytics", label: "Analytics" },
  { href: "/bst", label: "Marketplace" },
  { href: "/messages", label: "Messages" },
  { href: "/forum", label: "Forum" },
  { href: "/sotd", label: "SOTD" },
  { href: "/preferences", label: "Preferences" },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, refresh } = useSession();
  const isAdmin = session?.user.email === ADMIN_EMAIL;
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [forumUnread, setForumUnread] = useState(0);
  const [isExpert, setIsExpert] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close menu on route change; sync badge counts from localStorage
  useEffect(() => {
    setMenuOpen(false);
    if (pathname.startsWith("/messages")) setUnreadCount(0);
    if (pathname.startsWith("/forum")) {
      setForumUnread(0);
    } else {
      try {
        const n = parseInt(localStorage.getItem("ss_forum_unread_nav") ?? "0", 10);
        setForumUnread(isNaN(n) ? 0 : n);
      } catch {}
    }
  }, [pathname]);

  // Fetch expert status when session changes
  useEffect(() => {
    if (!session) { setIsExpert(false); return; }
    api.get<{ isExpert: boolean }>("/api/subscriptions/status")
      .then((d) => setIsExpert(d.isExpert))
      .catch(() => {});
  }, [session]);

  // Poll unread message count every 30 s
  useEffect(() => {
    if (!session) { setUnreadCount(0); return; }
    const fetch = () => {
      api.get<{ count: number }>("/api/bst/unread-count")
        .then((d) => setUnreadCount(d.count))
        .catch(() => {});
    };
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, [session]);

  // Poll community notification unread count every 30s
  useEffect(() => {
    if (!session) { setNotifUnread(0); return; }
    const fetch = () => {
      api.get<{ count: number }>("/api/notifications/unread-count")
        .then((d) => setNotifUnread(d.count))
        .catch(() => {});
    };
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, [session]);

  // Close notification panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  const openNotifications = async () => {
    if (notifOpen) { setNotifOpen(false); return; }
    try {
      const { notifications: items } = await api.get<{ notifications: AppNotification[] }>("/api/notifications");
      setNotifications(items);
      setNotifOpen(true);
      if (notifUnread > 0) {
        api.post("/api/notifications/read-all", {}).catch(() => {});
        setNotifUnread(0);
      }
    } catch {}
  };

  const handleSignOut = async () => {
    await signOut();
    refresh();
    router.push("/");
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-sm">
        {/* Row 1: Brand + nav links + auth */}
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 pt-3 pb-2 gap-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-fredericka)] text-xl text-[#c9a050] shrink-0 whitespace-nowrap"
          >
            ShaveSplash Community
          </Link>

          {session && (
            <div className="hidden md:flex items-center gap-0.5 min-w-0 overflow-x-auto">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    pathname.startsWith(link.href)
                      ? "text-[#c9a050] bg-[#c9a050]/10"
                      : "text-gray-400 hover:text-[#f5f2eb]"
                  }`}
                >
                  {link.label}
                  {link.href === "/messages" && unreadCount > 0 && (
                    <span className="absolute top-0.5 -right-1 min-w-[15px] h-[15px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  {link.href === "/forum" && forumUnread > 0 && (
                    <span className="absolute top-0.5 -right-1 min-w-[15px] h-[15px] rounded-full bg-[#c9a050] text-[#1a1a1a] text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                      {forumUnread > 99 ? "99+" : forumUnread}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 shrink-0">
            {!loading && (
              session ? (
                <>
                  <span className="text-gray-600 text-xs hidden md:block truncate max-w-[180px]">{session.user.email}</span>

                  {/* Notification bell */}
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={openNotifications}
                      className="relative p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                      aria-label="Notifications"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                      {(unreadCount + notifUnread) > 0 && (
                        <span className="absolute top-0 right-0 min-w-[15px] h-[15px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                          {(unreadCount + notifUnread) > 99 ? "99+" : unreadCount + notifUnread}
                        </span>
                      )}
                    </button>

                    {/* Dropdown panel */}
                    {notifOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                          <p className="text-[#f5f2eb] text-sm font-semibold">Notifications</p>
                          {notifications.some(n => !n.read) && (
                            <button onClick={() => { api.post("/api/notifications/read-all", {}).catch(() => {}); setNotifications(ns => ns.map(n => ({ ...n, read: true }))); }} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Mark all read</button>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <Link href="/messages" onClick={() => setNotifOpen(false)} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors">
                            <span className="text-lg">✉️</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[#f5f2eb] text-xs font-semibold">{unreadCount} unread message{unreadCount !== 1 ? "s" : ""}</p>
                              <p className="text-gray-500 text-xs">Tap to view BST messages</p>
                            </div>
                            <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">{unreadCount > 99 ? "99+" : unreadCount}</span>
                          </Link>
                        )}
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 && unreadCount === 0 ? (
                            <p className="text-gray-600 text-xs text-center py-8">No notifications yet</p>
                          ) : notifications.length === 0 ? null : (
                            notifications.map((n) => (
                              <a key={n.id} href={n.link} onClick={() => { api.post(`/api/notifications/${n.id}/read`, {}).catch(() => {}); setNotifOpen(false); }} className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${n.read ? "opacity-60" : ""}`}>
                                <span className="text-base mt-0.5 shrink-0">{n.type === "forum_reply" ? "💬" : "🪒"}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[#f5f2eb] text-xs font-semibold leading-snug">{n.title}</p>
                                  <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{n.body}</p>
                                  <p className="text-gray-700 text-[10px] mt-1">{new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                                </div>
                                {!n.read && <span className="w-2 h-2 rounded-full bg-[#c9a050] shrink-0 mt-1.5" />}
                              </a>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap hidden md:block"
                  >
                    Sign out
                  </button>
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    className="md:hidden relative flex flex-col gap-1.5 p-2 -mr-2"
                    aria-label="Menu"
                  >
                    <span className={`block w-5 h-0.5 bg-[#c9a050] transition-transform origin-center ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
                    <span className={`block w-5 h-0.5 bg-[#c9a050] transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
                    <span className={`block w-5 h-0.5 bg-[#c9a050] transition-transform origin-center ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
                    {(unreadCount + notifUnread) > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-[#1a1a1a]" />
                    )}
                  </button>
                </>
              ) : (
                <Link
                  href="/sign-in"
                  className="text-sm bg-[#c9a050] text-black font-semibold px-4 py-1.5 rounded-lg hover:bg-[#b8903f] transition-colors whitespace-nowrap"
                >
                  Sign In / Join Free
                </Link>
              )
            )}
          </div>
        </div>

        {/* Row 2: Admin + Upgrade — desktop only */}
        {session && (
          <div className="hidden md:flex items-center justify-between max-w-7xl mx-auto w-full px-6 pt-2 pb-2 border-t border-white/5">
            {isAdmin ? (
              <Link
                href="/admin"
                className="text-xs text-red-400/60 hover:text-red-400 transition-colors font-medium"
              >
                Admin Panel
              </Link>
            ) : <span />}
            <Link
              href="/subscribe"
              className={`text-sm font-semibold whitespace-nowrap transition-colors ${
                isExpert
                  ? "text-[#c9a050]"
                  : "text-[#c9a050]/70 hover:text-[#c9a050]"
              }`}
            >
              {isExpert ? "★ Expert Account" : "★ Upgrade"}
            </Link>
          </div>
        )}
      </nav>

      {/* Mobile dropdown menu */}
      {session && menuOpen && (
        <div className="md:hidden fixed top-[53px] inset-x-0 z-40 bg-[#1a1a1a] border-b border-white/10 shadow-xl">
          <div className="px-4 py-3 flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? "text-[#c9a050] bg-[#c9a050]/10"
                    : link.gold
                    ? "text-[#c9a050]/70"
                    : "text-gray-400"
                }`}
              >
                {link.label}
                {link.href === "/messages" && unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {link.href === "/forum" && forumUnread > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-[#c9a050] text-[#1a1a1a] text-[10px] font-bold flex items-center justify-center px-1 leading-none">
                    {forumUnread > 99 ? "99+" : forumUnread}
                  </span>
                )}
              </Link>
            ))}
            <div className="h-px bg-white/5 my-2" />
            {isAdmin && (
              <Link
                href="/admin"
                className="px-4 py-3 text-sm text-red-400/70 hover:text-red-400 transition-colors font-medium"
              >
                Admin Panel
              </Link>
            )}
            <div className="px-4 py-2 text-xs text-gray-600">{session.user.email}</div>
            <button
              onClick={handleSignOut}
              className="text-left px-4 py-3 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
