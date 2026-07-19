"use client";

import { useState, useEffect } from "react";

type CatalogEntry = {
  id: string;
  brandDisplay: string;
  productDisplay: string;
};

export default function AftersahvesPage() {
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.shavesplash.app";

  useEffect(() => {
    fetch(`${backendBase}/api/catalog/aftershaves?limit=2000`)
      .then((r) => r.json())
      .then((data: CatalogEntry[]) => {
        data.sort(
          (a, b) =>
            a.brandDisplay.localeCompare(b.brandDisplay) ||
            a.productDisplay.localeCompare(b.productDisplay)
        );
        setEntries(data);
      })
      .catch(() => setError("Failed to load catalog"))
      .finally(() => setLoading(false));
  }, [backendBase]);

  const brandMap = new Map<string, CatalogEntry[]>();
  for (const e of entries) {
    if (!brandMap.has(e.brandDisplay)) brandMap.set(e.brandDisplay, []);
    brandMap.get(e.brandDisplay)!.push(e);
  }
  const brands = Array.from(brandMap.entries());

  const filtered = search.trim()
    ? brands.filter(
        ([brand, items]) =>
          brand.toLowerCase().includes(search.toLowerCase()) ||
          items.some((i) => i.productDisplay.toLowerCase().includes(search.toLowerCase()))
      )
    : brands;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[#f5f2eb] font-semibold text-lg">Aftershaves</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? "Loading…" : `${brands.length} brands · ${entries.length} products · from ShaveSplash catalog`}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brands or aftershaves…"
          className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <p className="text-red-400 text-sm text-center py-10">{error}</p>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {filtered.map(([brand, items]) => {
            const isOpen = expanded === brand;
            const matchesSearch = search.trim()
              ? items.filter((i) => i.productDisplay.toLowerCase().includes(search.toLowerCase()))
              : items;
            return (
              <div key={brand} className="bg-[#242424] rounded-2xl border border-white/5 overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : brand)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#f5f2eb] font-semibold">{brand}</span>
                    <span className="text-gray-600 text-xs">{items.length} products</span>
                  </div>
                  <span className="text-gray-600 text-sm">{isOpen ? "▲" : "▼"}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-white/5">
                    {matchesSearch.map((item) => (
                      <div
                        key={item.id}
                        className="px-5 py-2.5 border-b border-white/5 last:border-0 text-[#f5f2eb] text-sm hover:bg-white/[0.02]"
                      >
                        {item.productDisplay}
                      </div>
                    ))}
                    <div className="px-5 py-2.5 text-gray-600 text-sm italic">
                      Other / Enter My Own
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div className="bg-[#242424] rounded-2xl border border-white/5 px-5 py-4 text-gray-600 text-sm italic">
            Other / Enter My Own
          </div>
        </div>
      )}
    </>
  );
}
