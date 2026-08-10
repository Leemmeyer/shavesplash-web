"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

function SetDisplayNameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/den";
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const isValid = trimmed.length > 0 && !trimmed.includes("@") && trimmed.length <= 60;

  const handleContinue = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch("/api/bst/profile", { displayName: trimmed });
      router.replace(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Try again.");
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] mb-2 text-center">
          Choose a Display Name
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
          This is how you&apos;ll appear in the marketplace, forum, and community posts.
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleContinue(); }}
          placeholder="Your name…"
          maxLength={60}
          autoFocus
          className={`w-full bg-[#242424] border-2 rounded-xl px-4 py-4 text-[#f5f2eb] placeholder-gray-600 focus:outline-none transition-colors text-base mb-2 ${
            error ? "border-red-500/60" : trimmed.length > 0 ? "border-[#c9a050]" : "border-white/10 focus:border-[#c9a050]/50"
          }`}
        />

        {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}

        <p className="text-gray-600 text-xs text-center mb-6">
          No email addresses. Max 60 characters.
        </p>

        <button
          onClick={handleContinue}
          disabled={!isValid || saving}
          className="w-full bg-[#c9a050] text-black font-bold py-3.5 rounded-xl hover:bg-[#b8903f] transition-colors disabled:opacity-40 text-base mb-3"
        >
          {saving ? "Saving…" : "Continue"}
        </button>

      </div>
    </div>
  );
}

export default function SetDisplayNamePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="font-[family-name:var(--font-fredericka)] text-2xl text-[#c9a050]">
          ShaveSplash
        </Link>
      </nav>
      <Suspense>
        <SetDisplayNameForm />
      </Suspense>
    </div>
  );
}
