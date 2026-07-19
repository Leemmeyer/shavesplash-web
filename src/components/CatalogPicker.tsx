"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type CatalogEntry = {
  id: string;
  brandDisplay: string;
  productDisplay: string;
  urlPath: string;
  topNotes?: string;
  heartNotes?: string;
  baseNotes?: string;
  description?: string;
  inspiration?: string;
  scentFamily?: string;
  familySubtype?: string;
};

interface CatalogPickerProps {
  category: "soaps" | "aftershaves";
  onSelect: (entry: CatalogEntry) => void;
  onClose: () => void;
}

export default function CatalogPicker({ category, onSelect, onClose }: CatalogPickerProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apiBase =
    category === "soaps"
      ? "https://www.shavesplash.com/_functions/soaps"
      : "https://www.shavesplash.com/_functions/aftershaves";

  const fetchResults = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      try {
        const url = q.trim()
          ? `${apiBase}?q=${encodeURIComponent(q.trim())}&limit=1000`
          : `${apiBase}?limit=1000`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load catalog (${res.status})`);
        const data: CatalogEntry[] = await res.json();
        data.sort(
          (a, b) =>
            a.brandDisplay.localeCompare(b.brandDisplay) ||
            a.productDisplay.localeCompare(b.productDisplay)
        );
        setResults(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load catalog");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [apiBase]
  );

  useEffect(() => {
    fetchResults("");
  }, [fetchResults]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchResults]);

  const label = category === "soaps" ? "Shave Soaps" : "Aftershaves";

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative bg-[#1e1e1e] w-full sm:max-w-lg sm:rounded-2xl border border-white/10 flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-[#f5f2eb] font-semibold">ShaveSplash {label} Catalog</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search by brand or ${category === "soaps" ? "soap" : "aftershave"} name…`}
            className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
          />
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
            </div>
          )}
          {!loading && error && (
            <div className="text-center py-10 px-6">
              <p className="text-red-400 text-sm mb-3">{error}</p>
              <button
                onClick={() => fetchResults(search)}
                className="text-[#c9a050] text-sm hover:underline"
              >
                Try again
              </button>
            </div>
          )}
          {!loading && !error && results.length === 0 && (
            <p className="text-center text-gray-600 text-sm py-10">No results found</p>
          )}
          {!loading &&
            !error &&
            results.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  onSelect(entry);
                  onClose();
                }}
                className="w-full text-left px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <span className="text-[#c9a050] text-xs font-semibold">
                  {entry.brandDisplay}
                </span>
                <span className="text-gray-500 text-xs mx-1.5">—</span>
                <span className="text-[#f5f2eb] text-sm">{entry.productDisplay}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
