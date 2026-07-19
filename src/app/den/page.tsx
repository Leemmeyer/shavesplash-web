"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

const DEFAULT_CATEGORIES = [
  { id: "razors",      label: "Razors",       icon: "🪒" },
  { id: "blades",      label: "Blades",        icon: null },
  { id: "brushes",     label: "Brushes",       icon: null },
  { id: "soaps",       label: "Shave Soaps",   icon: "🫧" },
  { id: "aftershaves", label: "Aftershaves",   icon: "💧" },
  { id: "balms",       label: "Balms",         icon: "🧴" },
  { id: "preshaves",   label: "Preshaves",     icon: "✨" },
  { id: "edpedt",      label: "EDP/EDT",       icon: "🌸" },
];
function BladeSvg() {
  return (
    <svg width="18" height="11" viewBox="0 0 20 12" fill="none" shapeRendering="crispEdges" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <rect x="1" y="1" width="18" height="10" rx="1.5" stroke="#8898a8" strokeWidth="1.5" fill="#c0c8cc" />
      <ellipse cx="10" cy="6" rx="2.5" ry="2" fill="#111827" stroke="#7888a0" strokeWidth="1" />
      <line x1="2" y1="3.5" x2="6.5" y2="3.5" stroke="#dce8ec" strokeWidth="0.75" />
      <line x1="13.5" y1="3.5" x2="18" y2="3.5" stroke="#dce8ec" strokeWidth="0.75" />
      <line x1="2" y1="8.5" x2="6.5" y2="8.5" stroke="#dce8ec" strokeWidth="0.75" />
      <line x1="13.5" y1="8.5" x2="18" y2="8.5" stroke="#dce8ec" strokeWidth="0.75" />
    </svg>
  );
}
function BrushSvg() {
  return (
    <svg width="12" height="18" viewBox="0 0 14 20" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <ellipse cx="7" cy="6" rx="5.5" ry="5" fill="#d4bc7a" />
      <line x1="7" y1="2" x2="7" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <line x1="4.5" y1="2.5" x2="5.5" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <line x1="9.5" y1="2.5" x2="8.5" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <line x1="2.5" y1="5" x2="4" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <line x1="11.5" y1="5" x2="10" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <rect x="4.5" y="10" width="5" height="2" rx="0.3" fill="#9ca3af" />
      <path d="M 5.2 12 C 3 13 2.5 16 4 19 Q 5.5 19.5 7 19.5 Q 8.5 19.5 10 19 C 11.5 16 11 13 8.8 12 Z" fill="#dc2626" />
    </svg>
  );
}
function CategoryIcon({ id }: { id: string }) {
  if (id === 'blades') return <BladeSvg />;
  if (id === 'brushes') return <BrushSvg />;
  return null;
}


const SORT_OPTIONS = [
  { value: "name",       label: "Name" },
  { value: "brand",      label: "Brand" },
  { value: "most_used",  label: "Most Used" },
  { value: "least_used", label: "Least Used" },
];

type InventoryItem = {
  id: string; categoryId: string; name: string; brand: string;
  notes?: string; photoUrl?: string; createdAt: number;
};

function sortItems(items: InventoryItem[], sort: string, usageCounts: Record<string, number>): InventoryItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "brand":
        return a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name);
      case "most_used":
        return (usageCounts[b.id] ?? 0) - (usageCounts[a.id] ?? 0);
      case "least_used":
        return (usageCounts[a.id] ?? 0) - (usageCounts[b.id] ?? 0);
      default: // "name"
        return a.name.localeCompare(b.name);
    }
  });
}

export default function DenPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AuthGuard>
        <DenContent />
      </AuthGuard>
    </div>
  );
}

function DenContent() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [collapsed, setCollapsed] = useState<Set<string>>(
    new Set(DEFAULT_CATEGORIES.map((c) => c.id))
  );

  useEffect(() => {
    Promise.all([
      api.get<{ items: InventoryItem[] }>("/api/inventory").then((d) => d.items).catch(() => [] as InventoryItem[]),
      api.get<{ logs: Array<{ selectedItems: Record<string, { itemId?: string }> }> }>("/api/logs").then((d) => d.logs).catch(() => []),
    ]).then(([inv, logs]) => {
      setItems(inv);
      const counts: Record<string, number> = {};
      for (const log of logs) {
        for (const sel of Object.values(log.selectedItems ?? {})) {
          if (sel.itemId) counts[sel.itemId] = (counts[sel.itemId] ?? 0) + 1;
        }
      }
      setUsageCounts(counts);
    }).finally(() => setLoading(false));
  }, []);

  // Build category list: defaults first, then any custom categories from items
  const categories = useMemo(() => {
    const defaultIds = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
    const customIds = [...new Set(items.map((i) => i.categoryId).filter((id) => !defaultIds.has(id)))];
    const customs = customIds.map((id) => ({ id, label: id, icon: "📦" }));
    return [...DEFAULT_CATEGORIES, ...customs];
  }, [items]);

  // Collapse any custom categories discovered after load
  useEffect(() => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      for (const cat of categories) next.add(cat.id);
      return next;
    });
  }, [categories]);

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
            My Den
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
            sort,
            usageCounts
          );
          const isCollapsed = collapsed.has(cat.id);
          const isEmpty = catItems.length === 0;

          return (
            <section key={cat.id}>
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => toggleCollapse(cat.id)}
                  className="flex-1 flex items-center gap-3 group min-w-0"
                >
                  <span className="text-xl flex items-center">{cat.icon ?? <CategoryIcon id={cat.id} />}</span>
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
                <Link
                  href={`/den/new?category=${cat.id}`}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:border-[#c9a050]/50 hover:text-[#c9a050] transition-colors text-base"
                  title={`Add ${cat.label}`}
                >
                  +
                </Link>
              </div>

              {/* Category Content */}
              {!isCollapsed && (
                isEmpty ? (
                  <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 py-10 text-center">
                    <p className="text-4xl mb-3 opacity-30">{cat.icon ?? <CategoryIcon id={cat.id} />}</p>
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
