"use client";

import { useEffect, useRef, useState } from "react";
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
    suspended: boolean;
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

function ActionsMenu({ user, onDelete, onClear, onToggleExpert, expertPending, onToggleSuspend, suspendPending }: {
  user: UserRow;
  onDelete: () => void;
  onClear: () => void;
  onToggleExpert: () => void;
  expertPending: boolean;
  onToggleSuspend: () => void;
  suspendPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setOpenUpward(rect.bottom + 160 > window.innerHeight);
    }
    setOpen((o) => !o);
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="text-gray-500 hover:text-white transition-colors px-2 py-1 rounded text-base leading-none"
        title="Actions"
      >
        ⋯
      </button>
      {open && (
        <div className={`absolute right-0 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-xl z-50 min-w-[160px] py-1 overflow-hidden ${openUpward ? "bottom-full mb-1" : "top-full mt-1"}`}>
          <button
            onClick={() => { onToggleExpert(); setOpen(false); }}
            disabled={expertPending}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            {expertPending ? "…" : user.profile?.isExpert ? "Revoke Expert" : "Grant Expert"}
          </button>
          <button
            onClick={() => { onToggleSuspend(); setOpen(false); }}
            disabled={suspendPending}
            className="w-full text-left px-4 py-2.5 text-sm text-orange-400 hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            {suspendPending ? "…" : user.profile?.suspended ? "Unsuspend" : "Suspend"}
          </button>
          <div className="border-t border-white/5 my-1" />
          <button
            onClick={() => { onClear(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-amber-400 hover:bg-white/5 transition-colors"
          >
            Clear Data
          </button>
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
          >
            Delete User
          </button>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Delete user
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Clear data
  const [confirmClearUser, setConfirmClearUser] = useState<UserRow | null>(null);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  // Expert toggle
  const [expertPending, setExpertPending] = useState<string | null>(null);

  // Suspend toggle
  const [suspendPending, setSuspendPending] = useState<string | null>(null);

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
    setConfirmDeleteId(null);
  }

  async function handleClearData() {
    if (!confirmClearUser || clearConfirmText !== "DELETE" || clearing) return;
    setClearing(true);
    try {
      const r = await api.delete<{ deleted: { inventory: number; logs: number } }>(
        `/api/admin/user-data/${confirmClearUser.id}`
      );
      setClearResult(`Cleared ${confirmClearUser.email}: ${r.deleted.inventory} den items and ${r.deleted.logs} shave logs deleted.`);
    } catch {
      setClearResult("Something went wrong.");
    }
    setClearing(false);
    setConfirmClearUser(null);
    setClearConfirmText("");
  }

  async function handleToggleSuspend(userId: string, currentlySuspended: boolean) {
    setSuspendPending(userId);
    try {
      const { suspended } = await api.post<{ suspended: boolean }>(`/api/admin/monitoring/users/${userId}/suspend`, {});
      setUsers((prev) => prev.map((u) =>
        u.id === userId
          ? { ...u, profile: u.profile ? { ...u.profile, suspended } : { displayName: null, isExpert: false, expertSince: null, paypalHandle: null, suspended } }
          : u
      ));
    } catch {}
    setSuspendPending(null);
  }

  async function handleToggleExpert(userId: string, currentlyExpert: boolean) {
    setExpertPending(userId);
    try {
      const endpoint = currentlyExpert ? "/api/subscriptions/revoke" : "/api/subscriptions/grant";
      await api.post(endpoint, { userId });
      setUsers((prev) => prev.map((u) =>
        u.id === userId
          ? { ...u, profile: u.profile ? { ...u.profile, isExpert: !currentlyExpert } : { displayName: null, isExpert: !currentlyExpert, expertSince: null, paypalHandle: null, suspended: false } }
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

      {clearResult && (
        <div className="p-4 rounded-xl bg-green-900/30 border border-green-700 text-green-300 text-sm">
          {clearResult}
          <button onClick={() => setClearResult(null)} className="ml-3 text-green-500 hover:text-green-300">✕</button>
        </div>
      )}

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
      <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-visible">
        <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
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
              const isConfirmingDelete = confirmDeleteId === u.id;
              const isDeleting = deleting === u.id;
              return (
                <tr key={u.id} className="transition-colors hover:bg-white/[0.02]">
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
                    {u.profile?.suspended ? (
                      <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">Suspended</span>
                    ) : u.profile?.isExpert ? (
                      <span className="text-[10px] font-semibold text-[#c9a050] bg-[#c9a050]/10 border border-[#c9a050]/20 rounded-full px-2 py-0.5">Expert</span>
                    ) : (
                      <span className="text-[10px] text-gray-600 bg-white/5 rounded-full px-2 py-0.5">Free</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {isConfirmingDelete ? (
                      <span className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={isDeleting}
                          className="text-[11px] font-semibold text-red-400 hover:text-red-300 cursor-pointer disabled:opacity-50"
                        >
                          {isDeleting ? "Deleting…" : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[11px] text-gray-600 hover:text-gray-400 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <ActionsMenu
                        user={u}
                        onDelete={() => setConfirmDeleteId(u.id)}
                        onClear={() => { setConfirmClearUser(u); setClearConfirmText(""); }}
                        onToggleExpert={() => handleToggleExpert(u.id, !!u.profile?.isExpert)}
                        expertPending={expertPending === u.id}
                        onToggleSuspend={() => handleToggleSuspend(u.id, !!u.profile?.suspended)}
                        suspendPending={suspendPending === u.id}
                      />
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

      {/* Clear Data modal */}
      {confirmClearUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-white font-semibold mb-2">Clear Data</h3>
            <p className="text-sm text-gray-400 mb-4">
              This will permanently delete all den items and shave logs for{" "}
              <strong className="text-white">{confirmClearUser.email}</strong>. Their account stays active and data will re-sync from their device.
            </p>
            <p className="text-sm text-gray-400 mb-3">
              Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full bg-[#242424] border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-red-500/40 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmClearUser(null); setClearConfirmText(""); }}
                className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                disabled={clearConfirmText !== "DELETE" || clearing}
                className="flex-1 py-2 rounded-lg bg-red-700 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-40"
              >
                {clearing ? "Clearing…" : "Clear Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
