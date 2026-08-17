"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type UserRow = {
  id: string;
  email: string;
  name: string;
  _count: { shaveLogs: number; inventoryItems: number };
};

export default function AdminToolsPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<UserRow | null>(null);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<{ email: string; inventory: number; logs: number } | null>(null);

  useEffect(() => {
    api.get<{ users: UserRow[] }>("/api/admin/users").then((r) => {
      setUsers(r.users);
      setLoading(false);
    });
  }, []);

  async function handleClear(user: UserRow) {
    setClearing(true);
    try {
      const r = await api.delete<{ deleted: { inventory: number; logs: number } }>(
        `/api/admin/user-data/${user.id}`
      );
      setResult({ email: user.email, ...r.deleted });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, _count: { shaveLogs: 0, inventoryItems: 0 } } : u
        )
      );
    } finally {
      setClearing(false);
      setConfirm(null);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">Tools</h2>
      <p className="text-sm text-gray-400 mb-6">
        Clear all shave logs and den items for a user. Their account stays intact and data will re-sync from their device.
      </p>

      {result && (
        <div className="mb-6 p-4 rounded-lg bg-green-900/30 border border-green-700 text-green-300 text-sm">
          Cleared <strong>{result.email}</strong>: {result.inventory} den items and {result.logs} shave logs deleted.
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading users…</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
            >
              <div>
                <p className="text-sm text-white font-medium">{u.email}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {u._count.inventoryItems} den items · {u._count.shaveLogs} shave logs
                </p>
              </div>
              <button
                onClick={() => setConfirm(u)}
                className="text-xs px-3 py-1.5 rounded bg-red-900/40 text-red-400 border border-red-700 hover:bg-red-900/70 transition-colors"
              >
                Clear Data
              </button>
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-white font-semibold mb-2">Are you sure?</h3>
            <p className="text-sm text-gray-400 mb-6">
              This will permanently delete all den items and shave logs for{" "}
              <strong className="text-white">{confirm.email}</strong>. Their account stays active and data will re-sync from their device.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleClear(confirm)}
                disabled={clearing}
                className="flex-1 py-2 rounded-lg bg-red-700 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {clearing ? "Clearing…" : "Yes, Clear Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
