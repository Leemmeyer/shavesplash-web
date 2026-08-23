"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const CATEGORY_LABELS: Record<string, string> = {
  razors: "Razors", blades: "Blades", brushes: "Brushes", soaps: "Soaps",
  aftershaves: "Aftershaves", balms: "Balms", preshaves: "Pre-Shaves", edpedt: "Fragrances",
};

const CATEGORY_ICONS: Record<string, string> = {
  razors: "🪒", soaps: "🫧", aftershaves: "💧", balms: "🧴", preshaves: "✨", edpedt: "🌸",
  blades: "🔪", brushes: "🖌️",
};

type DenItem = { id: string; name: string; brand: string };
type DenCategory = { id: string; items: DenItem[] };
type DenData = { ownerName: string; categories: DenCategory[]; totalItems: number };

export default function SharedDenPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<DenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/den/public/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? "Not found");
        }
        return r.json() as Promise<DenData>;
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🪒</p>
          <h1 className="text-[#f5f2eb] font-semibold text-lg mb-2">Den not available</h1>
          <p className="text-gray-500 text-sm mb-6">This Den is no longer being shared, or the link has expired.</p>
          <Link href="/" className="text-[#c9a050] text-sm hover:underline">Go to ShaveSplash →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111]">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors mb-8 block">
          ← ShaveSplash
        </Link>

        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] mb-1">
            {data.ownerName}&apos;s Den
          </h1>
          <p className="text-gray-600 text-sm">{data.totalItems} item{data.totalItems !== 1 ? "s" : ""}</p>
        </div>

        {data.categories.length === 0 ? (
          <p className="text-gray-500 text-sm">This Den is empty.</p>
        ) : (
          <div className="space-y-6">
            {data.categories.map((cat) => (
              <div key={cat.id} className="bg-[#1e1e1e] rounded-2xl border border-white/5 overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/5">
                  <span className="text-base">{CATEGORY_ICONS[cat.id] ?? "📦"}</span>
                  <h2 className="text-[#f5f2eb] font-semibold text-sm">
                    {CATEGORY_LABELS[cat.id] ?? cat.id}
                  </h2>
                  <span className="text-gray-600 text-xs ml-auto">{cat.items.length}</span>
                </div>
                <div className="divide-y divide-white/5">
                  {cat.items.map((item) => (
                    <div key={item.id} className="px-5 py-3 flex items-center gap-2">
                      {item.brand && (
                        <span className="text-[#c9a050] text-xs font-medium w-28 flex-shrink-0 truncate">{item.brand}</span>
                      )}
                      <span className="text-[#f5f2eb] text-sm">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-white/5 text-center">
          <p className="text-gray-600 text-xs">
            Shared via{" "}
            <Link href="/" className="text-[#c9a050] hover:underline">ShaveSplash</Link>
            {" "}— Track, analyze, and share your wet shaving gear
          </p>
        </div>
      </div>
    </div>
  );
}
