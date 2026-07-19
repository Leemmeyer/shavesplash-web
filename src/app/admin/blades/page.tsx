"use client";

import { useState } from "react";
import bladesData from "@/data/blades.json";

type Blade = {
  id: string;
  brand: string;
  name: string;
  edge_type: string;
  country_of_origin: string;
  coating: string;
};

const blades = bladesData as Blade[];

const brandMap = new Map<string, Blade[]>();
for (const b of blades) {
  if (!brandMap.has(b.brand)) brandMap.set(b.brand, []);
  brandMap.get(b.brand)!.push(b);
}
const allBrands = Array.from(brandMap.entries()).sort(([a], [b]) => a.localeCompare(b));

export default function BladesPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? allBrands.filter(
        ([brand, items]) =>
          brand.toLowerCase().includes(search.toLowerCase()) ||
          items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()))
      )
    : allBrands;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[#f5f2eb] font-semibold text-lg">Blades</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {allBrands.length} brands · {blades.length} blades · from blades.json
          </p>
        </div>
      </div>

      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brands or blade names…"
          className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
        />
      </div>

      <div className="space-y-2">
        {filtered.map(([brand, items]) => {
          const isOpen = expanded === brand;
          const matchesSearch = search.trim()
            ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
            : items;
          return (
            <div key={brand} className="bg-[#242424] rounded-2xl border border-white/5 overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : brand)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[#f5f2eb] font-semibold">{brand}</span>
                  <span className="text-gray-600 text-xs">{items.length} blades</span>
                </div>
                <span className="text-gray-600 text-sm">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-white/5">
                  {matchesSearch.map((blade) => (
                    <div
                      key={blade.id}
                      className="px-5 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                    >
                      <span className="text-[#f5f2eb] text-sm">{blade.name}</span>
                      <span className="text-gray-600 text-xs ml-3">{blade.coating} · {blade.country_of_origin}</span>
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
    </>
  );
}
