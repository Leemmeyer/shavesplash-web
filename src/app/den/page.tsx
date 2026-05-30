"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

const DEFAULT_CATEGORIES = [
  { id: "razors",      label: "Razors",       icon: "🪒" },
  { id: "blades",      label: "Blades",        icon: "⚡" },
  { id: "brushes",     label: "Brushes",       icon: "🖌️" },
  { id: "soaps",       label: "Shave Soaps",   icon: "🫧" },
  { id: "aftershaves", label: "Aftershaves",   icon: "💧" },
  { id: "balms",       label: "Balms",         icon: "🧴" },
  { id: "preshaves",   label: "Preshaves",     icon: "✨" },
  { id: "edpedt",      label: "EDP/EDT",       icon: "🌸" },
];

const BST_ELIGIBLE = new Set(["razors", "brushes", "soaps", "aftershaves"]);

const SORT_OPTIONS = [
  { value: "name-asc",    label: "A → Z" },
  { value: "name-desc",   label: "Z → A" },
  { value: "brand-asc",   label: "Brand A → Z" },
  { value: "newest",      label: "Newest First" },
  { value: "oldest",      label: "Oldest First" },
];

type InventoryItem = {
  id: string; categoryId: string; name: string; brand: string;
  notes?: string; photoUrl?: string; createdAt: number;
};

function sortItems(items: InventoryItem[], sort: string): InventoryItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "name-asc":   return a.name.localeCompare(b.name);
      case "name-desc":  return b.name.localeCompare(a.name);
      case "brand-asc":  return a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name);
      case "newest":     return b.createdAt - a.createdAt;
      case "oldest":     return a.createdAt - b.createdAt;
      default:           return 0;
    }
  });
}

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
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name-asc");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get<{ items: InventoryItem[] }>("/api/inventory")
      .then((d) => setItems(d.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Build category list: defaults first, then any custom categories from items
  const categories = useMemo(() => {
    const defaultIds = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
    const customIds = [...new Set(items.map((i) => i.categoryId).filter((id) => !defaultIds.has(id)))];
    const customs = customIds.map((id) => ({ id, label: id, icon: "📦" }));
    return [...DEFAULT_CATEGORIES, ...customs];
  }, [items]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalItems = items.length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 w-full">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#c9a050] mb-1">
            Your Den
          </h1>
          <p className="text-gray-500 text-sm">{totalItems} item{totalItems !== 1 ? "s" : ""} in your collection</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your den..."
          className="flex-1 bg-[#242424] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-[#242424] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50 cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Categories */}
      <div className="space-y-8">
        {categories.map((cat) => {
          const catItems = sortItems(
            filteredItems.filter((i) => i.categoryId === cat.id),
            sort
          );
          const isCollapsed = collapsed.has(cat.id);
          const isEmpty = catItems.length === 0;

          return (
            <section key={cat.id}>
              {/* Category Header */}
              <button
                onClick={() => toggleCollapse(cat.id)}
                className="w-full flex items-center gap-3 mb-4 group"
              >
                <span className="text-xl">{cat.icon}</span>
                <h2 className="text-[#f5f2eb] font-semibold text-base group-hover:text-[#c9a050] transition-colors">
                  {cat.label}
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isEmpty
                    ? "bg-white/5 text-gray-600"
                    : "bg-[#c9a050]/15 text-[#c9a050]"
                }`}>
                  {catItems.length}
                </span>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-gray-600 text-xs">{isCollapsed ? "▶" : "▼"}</span>
              </button>

              {/* Category Content */}
              {!isCollapsed && (
                isEmpty ? (
                  <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 py-10 text-center">
                    <p className="text-4xl mb-3 opacity-30">{cat.icon}</p>
                    <p className="text-gray-600 text-sm">
                      {search ? "No items match your search" : "No items yet — add them in the app"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {catItems.map((item) => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )
              )}
            </section>
          );
        })}
      </div>

      {totalItems === 0 && !loading && (
        <div className="text-center py-20 text-gray-600 mt-4">
          <p className="text-5xl mb-4">🪒</p>
          <p className="text-lg mb-2">Your den is empty</p>
          <p className="text-sm">Add items in the ShaveSplash mobile app — they&apos;ll sync here automatically.</p>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item }: { item: InventoryItem }) {
  return (
    <Link href={`/den/${item.id}`} className="group block">
      <div className="bg-[#242424] rounded-2xl overflow-hidden border border-white/5 hover:border-[#c9a050]/30 transition-all hover:shadow-lg hover:shadow-black/20">
        {/* Photo */}
        <div className="aspect-square bg-[#1e1e1e] relative overflow-hidden">
          {item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.photoUrl}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-3xl opacity-15">
                {DEFAULT_CATEGORIES.find((c) => c.id === item.categoryId)?.icon ?? "📦"}
              </span>
            </div>
          )}
          {BST_ELIGIBLE.has(item.categoryId) && (
            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm border border-[#c9a050]/30 rounded-lg px-1.5 py-0.5">
              <span className="text-[#c9a050] text-[9px] font-bold">BST</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-[#c9a050] text-[11px] font-medium mb-0.5 truncate">{item.brand}</p>
          <p className="text-[#f5f2eb] text-sm font-semibold leading-snug line-clamp-2">{item.name}</p>
        </div>
      </div>
    </Link>
  );
}
