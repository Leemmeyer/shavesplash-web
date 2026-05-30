"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

const CATEGORY_ICONS: Record<string, string> = {
  razors: "🪒", blades: "⚡", brushes: "🖌️", soaps: "🫧",
  aftershaves: "💧", balms: "🧴", preshaves: "✨", edpedt: "🌸",
};

const CATEGORY_LABELS: Record<string, string> = {
  razors: "Razors", blades: "Blades", brushes: "Brushes", soaps: "Soaps",
  aftershaves: "Aftershaves", balms: "Balms", preshaves: "Preshaves", edpedt: "EDP/EDT",
};

const BST_ELIGIBLE = new Set(["razors", "brushes", "soaps", "aftershaves"]);

type InventoryItem = {
  id: string;
  categoryId: string;
  name: string;
  brand: string;
  notes?: string;
  photoUrl?: string;
  createdAt: number;
};

export default function DenPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppNav />
      <AuthGuard>
        <DenContent />
      </AuthGuard>
    </div>
  );
}

function DenContent() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get<{ items: InventoryItem[] }>("/api/inventory")
      .then((d) => setItems(d.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ["all", ...Array.from(new Set(items.map((i) => i.categoryId)))];

  const filtered = items.filter((item) => {
    const matchesCat = activeCategory === "all" || item.categoryId === activeCategory;
    const matchesSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.brand.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const grouped = filtered.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    const key = item.categoryId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 w-full">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#c9a050] mb-1">
          Your Den
        </h1>
        <p className="text-gray-500 text-sm">{items.length} items in your collection</p>
      </div>

      {/* Search + Category filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your den..."
          className="flex-1 bg-[#242424] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
        />
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
                activeCategory === cat
                  ? "bg-[#c9a050] text-black border-[#c9a050]"
                  : "border-white/10 text-gray-400 hover:border-[#c9a050]/40 hover:text-[#c9a050]"
              }`}
            >
              {cat === "all" ? "All" : `${CATEGORY_ICONS[cat] ?? "📦"} ${CATEGORY_LABELS[cat] ?? cat}`}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-5xl mb-4">🪒</p>
          <p className="text-lg mb-2">Your den is empty</p>
          <p className="text-sm">Add items in the ShaveSplash mobile app — they&apos;ll sync here automatically.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-600 py-16">No items match your search.</p>
      ) : (
        <div className="space-y-10">
          {Object.entries(grouped).map(([categoryId, categoryItems]) => (
            <section key={categoryId}>
              <h2 className="text-[#f5f2eb] font-semibold mb-4 flex items-center gap-2">
                <span className="text-xl">{CATEGORY_ICONS[categoryId] ?? "📦"}</span>
                {CATEGORY_LABELS[categoryId] ?? categoryId}
                <span className="text-gray-600 text-sm font-normal">({categoryItems.length})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {categoryItems.map((item) => (
                  <Link key={item.id} href={`/den/${item.id}`} className="group block">
                    <div className="bg-[#242424] rounded-2xl overflow-hidden border border-white/5 hover:border-[#c9a050]/30 transition-all hover:shadow-lg hover:shadow-black/20">
                      <div className="aspect-square bg-[#1e1e1e] relative overflow-hidden">
                        {item.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.photoUrl} alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">
                            {CATEGORY_ICONS[item.categoryId] ?? "📦"}
                          </div>
                        )}
                        {BST_ELIGIBLE.has(item.categoryId) && (
                          <div className="absolute top-2 right-2 bg-[#c9a050]/20 border border-[#c9a050]/30 rounded-lg px-1.5 py-0.5 text-[10px] text-[#c9a050] font-semibold">
                            BST
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-[#c9a050] text-xs mb-0.5">{item.brand}</p>
                        <p className="text-[#f5f2eb] text-sm font-semibold leading-snug line-clamp-2">{item.name}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
