"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type UserRow = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSeen: string | null;
  emailVerified: boolean;
  profile: {
    displayName: string | null;
    isExpert: boolean;
    expertSince: string | null;
    paypalHandle: string | null;
  } | null;
  _count: {
    shaveLogs: number;
    listings: number;
    forumThreads: number;
    forumReplies: number;
  };
};

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expertPending, setExpertPending] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ users: UserRow[] }>("/api/admin/monitoring/all-users")
      .then((d) => setUsers(d.users))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(userId: string) {
    setDeleting(userId);
    try {
      await api.delete(`/api/admin/monitoring/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {}
    setDeleting(null);
    setConfirmId(null);
  }

  async function handleToggleExpert(userId: string, currentlyExpert: boolean) {
    setExpertPending(userId);
    try {
      const endpoint = currentlyExpert ? "/api/subscriptions/revoke" : "/api/subscriptions/grant";
      await api.post(endpoint, { userId });
      setUsers((prev) => prev.map((u) =>
        u.id === userId
          ? { ...u, profile: u.profile ? { ...u.profile, isExpert: !currentlyExpert } : { displayName: null, isExpert: !currentlyExpert, expertSince: null, paypalHandle: null } }
          : u
      ));
    } catch {}
    setExpertPending(null);
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.profile?.displayName ?? "").toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header + search */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-gray-500 text-sm">{users.length} total users</p>
        <input
          type="text"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 outline-none focus:border-[#c9a050]/40 w-64"
        />
      </div>

      {/* Table */}
      <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">User</th>
              <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Email</th>
              <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">Logs</th>
              <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">BST</th>
              <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">Posts</th>
              <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Joined</th>
              <th className="text-left px-5 py-3 font-medium hidden xl:table-cell">Last Seen</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((u) => {
              const displayName = u.profile?.displayName ?? u.name;
              const isConfirming = confirmId === u.id;
              const isDeleting = deleting === u.id;
              return (
                <tr key={u.id} className={`transition-colors ${isConfirming ? "bg-red-950/20" : "hover:bg-white/[0.02]"}`}>
                  <td className="px-5 py-3">
                    <p className="text-[#f5f2eb] font-medium truncate max-w-[180px]">{displayName}</p>
                    <p className="text-gray-600 text-[11px] truncate max-w-[180px] md:hidden">{u.email}</p>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <p className="text-gray-400 text-xs truncate max-w-[200px]">{u.email}</p>
                    {!u.emailVerified && (
                      <span className="text-[10px] text-amber-500/70">unverified</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <span className="text-[#c9a050] font-medium">{u._count.shaveLogs}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <span className="text-gray-400">{u._count.listings}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <span className="text-gray-400">{u._count.forumThreads + u._count.forumReplies}</span>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <span className="text-gray-500 text-xs">{formatDate(u.createdAt)}</span>
                  </td>
                  <td className="px-5 py-3 hidden xl:table-cell">
                    <span className="text-gray-500 text-xs">{u.lastSeen ? formatDate(u.lastSeen) : <span className="text-gray-700">—</span>}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      {u.profile?.isExpert ? (
                        <span className="text-[10px] font-semibold text-[#c9a050] bg-[#c9a050]/10 border border-[#c9a050]/20 rounded-full px-2 py-0.5">Expert</span>
                      ) : (
                        <span className="text-[10px] text-gray-600 bg-white/5 rounded-full px-2 py-0.5">Free</span>
                      )}
                      <button
                        onClick={() => handleToggleExpert(u.id, !!u.profile?.isExpert)}
                        disabled={expertPending === u.id}
                        className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border transition-colors cursor-pointer disabled:opacity-40 ${
                          u.profile?.isExpert
                            ? "text-gray-500 border-gray-700 hover:text-red-400 hover:border-red-700 bg-transparent"
                            : "text-[#c9a050] border-[#c9a050]/30 hover:bg-[#c9a050]/10 bg-transparent"
                        }`}
                      >
                        {expertPending === u.id ? "…" : u.profile?.isExpert ? "Revoke" : "Grant Expert"}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {isConfirming ? (
                      <span className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={isDeleting}
                          className="text-[11px] font-semibold text-red-400 hover:text-red-300 bg-transparent border-none outline-none cursor-pointer disabled:opacity-50"
                        >
                          {isDeleting ? "Deleting…" : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-[11px] text-gray-600 hover:text-gray-400 bg-transparent border-none outline-none cursor-pointer"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmId(u.id)}
                        className="text-gray-700 hover:text-red-500 transition-colors bg-transparent border-none outline-none cursor-pointer text-xs"
                        title="Delete user"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-gray-600 text-sm">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
