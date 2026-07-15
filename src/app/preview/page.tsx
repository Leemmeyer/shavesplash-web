"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PreviewPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/preview-unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#1a1a1a" }}>
      <div className="w-full max-w-sm text-center">
        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] mb-2">
          ShaveSplash
        </h1>
        <p className="text-gray-500 text-sm mb-8">Coming soon</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Preview password"
            autoFocus
            className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 text-center"
          />
          {error && <p className="text-red-400 text-xs">Incorrect password</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[#c9a050] text-black font-bold py-3 rounded-xl hover:bg-[#b8903f] transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? "Unlocking…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
