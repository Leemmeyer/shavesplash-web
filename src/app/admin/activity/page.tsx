"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const ACTION_LABELS: Record<string, string> = {
  user_signup: "New User",
  forum_thread_create: "Forum Post",
  forum_reply: "Forum Reply",
  forum_reaction: "Forum Reaction",
  bst_listing_create: "BST Listing",
  shave_log_create: "Shave Log",
  sotd_reaction: "SOTD Reaction",
  sotd_comment: "SOTD Comment",
  page_view: "Page View",
};

const ACTION_COLORS: Record<string, string> = {
  user_signup: "#4ade80",
  forum_thread_create: "#c9a050",
  forum_reply: "#f59e0b",
  forum_reaction: "#fbbf24",
  bst_listing_create: "#60a5fa",
  shave_log_create: "#34d399",
  sotd_reaction: "#f472b6",
  sotd_comment: "#a78bfa",
  page_view: "#6b7280",
};

function actionLabel(a: string) { return ACTION_LABELS[a] ?? a; }
function actionColor(a: string) { return ACTION_COLORS[a] ?? "#6b7280"; }

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Summary = {
  totalUsers: number; newUsers30d: number;
  dau: number; wau: number; mau: number;
  totalEvents30d: number;
  actionBreakdown: { action: string; count: number }[];
};
type UserRow = { userId: string; userEmail: string | null; displayName: string | null; lastSeen: string; lastAction: string; count: number };
type DailyPoint = { date: string; dau: number; totalEvents: number };
type ActivityRow = { id: string; action: string; path: string | null; metadata: string | null; createdAt: string };
type EventRow = { id: string; userId: string | null; userEmail: string | null; displayName: string | null; action: string; path: string | null; createdAt: string };
type NewUserRow = { id: string; email: string; name: string | null; createdAt: string; profile: { displayName: string | null } | null };

// ── Trend Chart ───────────────────────────────────────────────────────────────
function TrendChart({ daily }: { daily: DailyPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!daily.length) return null;

  const maxDau = Math.max(...daily.map((d) => d.dau), 1);
  const W = 640, H = 120, PL = 30, PR = 10, PT = 10, PB = 24;
  const PW = W - PL - PR, PH = H - PT - PB;
  const sx = (i: number) => PL + (i / (daily.length - 1)) * PW;
  const sy = (v: number) => PT + PH - (v / maxDau) * PH;

  const path = daily.map((d, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(d.dau).toFixed(1)}`).join(" ");

  // Tick dates: first, mid, last
  const ticks = [0, Math.floor(daily.length / 2), daily.length - 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 300 }}>
        {[0, Math.ceil(maxDau / 2), maxDau].map((v) => (
          <line key={v} x1={PL} y1={sy(v)} x2={PL + PW} y2={sy(v)} stroke="#252525" strokeWidth={1} />
        ))}
        <path d={path} fill="none" stroke="#c9a050" strokeWidth={2} strokeLinejoin="round" />
        {daily.map((d, i) => (
          <circle key={i} cx={sx(i)} cy={sy(d.dau)} r={hovered === i ? 5 : 3}
            fill={hovered === i ? "#fff" : "#c9a050"} fillOpacity={0.85}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
        ))}
        {ticks.map((i) => (
          <text key={i} x={sx(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="#6b7280">
            {new Date(daily[i]!.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}
        {[0, Math.ceil(maxDau / 2), maxDau].map((v) => (
          <text key={v} x={PL - 4} y={sy(v)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#6b7280">{v}</text>
        ))}
      </svg>
      {hovered !== null && daily[hovered] && (
        <div className="absolute top-2 left-8 bg-[#2a2a2a] border border-white/15 rounded-lg px-3 py-2 text-xs pointer-events-none shadow">
          <p className="text-[#f5f2eb] font-semibold">{new Date(daily[hovered]!.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
          <p className="text-[#c9a050]">{daily[hovered]!.dau} active users</p>
          <p className="text-gray-500">{daily[hovered]!.totalEvents} events</p>
        </div>
      )}
    </div>
  );
}

// ── User Timeline ─────────────────────────────────────────────────────────────
function UserTimeline({ userId, name }: { userId: string; name: string }) {
  const [activities, setActivities] = useState<ActivityRow[] | null>(null);

  useEffect(() => {
    api.get<{ activities: ActivityRow[] }>(`/api/admin/monitoring/users/${userId}`)
      .then((d) => setActivities(d.activities))
      .catch(() => setActivities([]));
  }, [userId]);

  return (
    <div>
      <p className="text-[#c9a050] font-semibold text-sm mb-3">{name}</p>
      {activities === null ? (
        <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" /></div>
      ) : activities.length === 0 ? (
        <p className="text-gray-600 text-sm">No activity found.</p>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {activities.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <span className="text-gray-600 text-[10px] whitespace-nowrap mt-0.5 w-28 shrink-0">{formatDate(a.createdAt)}</span>
              <span className="text-xs font-medium shrink-0" style={{ color: actionColor(a.action) }}>{actionLabel(a.action)}</span>
              {a.path && <span className="text-gray-600 text-[10px] truncate">{a.path}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ActivityPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEvents, setShowEvents] = useState(false);
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [showNewUsers, setShowNewUsers] = useState(false);
  const [newUsers, setNewUsers] = useState<NewUserRow[] | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Summary>("/api/admin/monitoring/summary"),
      api.get<{ users: UserRow[] }>("/api/admin/monitoring/users"),
      api.get<{ daily: DailyPoint[] }>("/api/admin/monitoring/trends"),
    ]).then(([s, u, t]) => {
      setSummary(s);
      setUsers(u.users);
      setDaily(t.daily);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Users", value: summary.totalUsers },
            { label: "New (30d)", value: summary.newUsers30d },
            { label: "MAU", value: summary.mau },
            { label: "WAU", value: summary.wau },
            { label: "DAU", value: summary.dau },
            { label: "Events (30d)", value: summary.totalEvents30d },
          ].map(({ label, value }) => {
            const isEvents = label === "Events (30d)";
            const isNewUsers = label === "New (30d)";
            if (isNewUsers) return (
              <button
                key={label}
                onClick={() => {
                  setShowNewUsers((v) => !v);
                  if (!newUsers) {
                    api.get<{ users: NewUserRow[] }>("/api/admin/monitoring/new-users")
                      .then((d) => setNewUsers(d.users))
                      .catch(() => setNewUsers([]));
                  }
                }}
                className="bg-[#1e1e1e] border border-white/5 rounded-xl p-4 text-center hover:border-[#c9a050]/30 transition-colors cursor-pointer"
              >
                <p className="text-2xl font-bold text-[#c9a050]">{value}</p>
                <p className="text-gray-500 text-xs mt-1">{label} {showNewUsers ? "▲" : "▼"}</p>
              </button>
            );
            return isEvents ? (
              <button
                key={label}
                onClick={() => {
                  setShowEvents((v) => !v);
                  if (!events) {
                    api.get<{ events: EventRow[] }>("/api/admin/monitoring/events")
                      .then((d) => setEvents(d.events))
                      .catch(() => setEvents([]));
                  }
                }}
                className="bg-[#1e1e1e] border border-white/5 rounded-xl p-4 text-center hover:border-[#c9a050]/30 transition-colors cursor-pointer"
              >
                <p className="text-2xl font-bold text-[#c9a050]">{value}</p>
                <p className="text-gray-500 text-xs mt-1">{label} {showEvents ? "▲" : "▼"}</p>
              </button>
            ) : (
              <div key={label} className="bg-[#1e1e1e] border border-white/5 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#c9a050]">{value}</p>
                <p className="text-gray-500 text-xs mt-1">{label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* New users feed */}
      {showNewUsers && (
        <div className="bg-[#1e1e1e] border border-[#c9a050]/20 rounded-2xl p-5">
          <h2 className="text-[#f5f2eb] font-semibold mb-4">New Users — Last 30 Days</h2>
          {newUsers === null ? (
            <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" /></div>
          ) : newUsers.length === 0 ? (
            <p className="text-gray-600 text-sm">No new users in the last 30 days.</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {newUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-2 border-b border-white/5">
                  <span className="text-gray-600 text-[10px] whitespace-nowrap w-28 shrink-0">{formatDate(u.createdAt)}</span>
                  <span className="text-[#f5f2eb] text-sm flex-1 truncate">{u.profile?.displayName ?? u.name ?? "—"}</span>
                  <span className="text-gray-500 text-xs truncate max-w-48">{u.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events feed */}
      {showEvents && (
        <div className="bg-[#1e1e1e] border border-[#c9a050]/20 rounded-2xl p-5">
          <h2 className="text-[#f5f2eb] font-semibold mb-4">Events — Last 30 Days</h2>
          {events === null ? (
            <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" /></div>
          ) : events.length === 0 ? (
            <p className="text-gray-600 text-sm">No events found.</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {events.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-1.5 border-b border-white/5">
                  <span className="text-gray-600 text-[10px] whitespace-nowrap w-28 shrink-0">{formatDate(e.createdAt)}</span>
                  <span className="text-xs font-semibold shrink-0 w-24" style={{ color: actionColor(e.action) }}>{actionLabel(e.action)}</span>
                  <span className="text-gray-400 text-xs truncate flex-1">{e.displayName ?? e.userEmail ?? e.userId ?? "—"}</span>
                  {e.path && <span className="text-gray-600 text-[10px] truncate max-w-32">{e.path}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DAU trend */}
      <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-5">
        <h2 className="text-[#f5f2eb] font-semibold mb-4">Daily Active Users — Last 30 Days</h2>
        <TrendChart daily={daily} />
      </div>

      {/* Action breakdown + user list side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Action breakdown */}
        {summary && summary.actionBreakdown.length > 0 && (
          <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-5">
            <h2 className="text-[#f5f2eb] font-semibold mb-4">Activity Breakdown (30d)</h2>
            <div className="space-y-3">
              {summary.actionBreakdown.map(({ action, count }) => {
                const max = summary.actionBreakdown[0]?.count ?? 1;
                return (
                  <div key={action}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: actionColor(action) }}>{actionLabel(action)}</span>
                      <span className="text-gray-500 text-xs">{count}</span>
                    </div>
                    <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, backgroundColor: actionColor(action) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active users */}
        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-5">
          <h2 className="text-[#f5f2eb] font-semibold mb-4">Active Users (90d)</h2>
          {users.length === 0 ? (
            <p className="text-gray-600 text-sm">No activity recorded yet.</p>
          ) : (
            <div className="space-y-1">
              {users.map((u) => (
                <button
                  key={u.userId}
                  onClick={() => setSelectedUser(selectedUser?.userId === u.userId ? null : u)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    selectedUser?.userId === u.userId ? "bg-[#c9a050]/10 border border-[#c9a050]/20" : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f5f2eb] text-sm font-medium truncate">{u.displayName ?? u.userEmail ?? u.userId}</p>
                    <p className="text-gray-600 text-[10px] truncate">{u.userEmail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px]" style={{ color: actionColor(u.lastAction) }}>{actionLabel(u.lastAction)}</p>
                    <p className="text-gray-600 text-[10px]">{timeAgo(u.lastSeen)}</p>
                  </div>
                  <span className="text-gray-600 text-xs w-8 text-right shrink-0">{u.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User timeline panel */}
      {selectedUser && (
        <div className="bg-[#1e1e1e] border border-[#c9a050]/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#f5f2eb] font-semibold">Activity Timeline</h2>
            <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-gray-300 text-sm bg-transparent border-none outline-none cursor-pointer">✕ Close</button>
          </div>
          <UserTimeline userId={selectedUser.userId} name={selectedUser.displayName ?? selectedUser.userEmail ?? selectedUser.userId} />
        </div>
      )}

    </div>
  );
}
