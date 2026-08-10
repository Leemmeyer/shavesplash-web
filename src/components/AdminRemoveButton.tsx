"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function AdminRemoveButton({
  endpoint,
  onRemoved,
  label = "Remove",
}: {
  endpoint: string;
  onRemoved: () => void;
  label?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-red-500/60 hover:text-red-400 transition-colors px-2 py-1 rounded border border-transparent hover:border-red-500/30"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-red-400">Remove?</span>
      <button
        onClick={async () => {
          setLoading(true);
          try {
            await api.delete(endpoint);
            onRemoved();
          } catch {
            setLoading(false);
            setConfirming(false);
          }
        }}
        disabled={loading}
        className="text-xs bg-red-500/20 border border-red-500/40 text-red-400 px-2 py-0.5 rounded hover:bg-red-500/30 transition-colors disabled:opacity-50"
      >
        {loading ? "…" : "Yes"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs text-gray-600 hover:text-gray-400 transition-colors px-1"
      >
        No
      </button>
    </div>
  );
}
