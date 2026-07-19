"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

type BrushBrand = {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
};

function BrushBrandCard({
  brand,
  onSave,
  onDelete,
}: {
  brand: BrushBrand;
  onSave: (id: string, updates: { name?: string; description?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(brand.name);
  const [description, setDescription] = useState(brand.description);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(brand.id, { name: name.trim(), description });
    setSaving(false);
    setDirty(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${brand.name}? This cannot be undone.`)) return;
    await onDelete(brand.id);
  };

  return (
    <div className="bg-[#242424] rounded-2xl border border-white/5 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <span className="text-[#f5f2eb] font-semibold">{brand.name}</span>
        <span className="text-gray-600 text-sm">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Brand Name</p>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setDirty(true); }}
              className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Notes / Description</p>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setDirty(true); }}
              rows={3}
              placeholder="Optional notes about this brand…"
              className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleDelete}
              className="text-xs text-gray-600 hover:text-red-400 transition-colors"
            >
              Delete brand
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty || !name.trim() || saving}
              className="px-5 py-2 bg-[#c9a050] text-black text-sm font-bold rounded-xl hover:bg-[#b8903f] transition-colors disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrushesPage() {
  const [brands, setBrands] = useState<BrushBrand[]>([]);
  const [fetching, setFetching] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.get<{ brands: BrushBrand[] }>("/api/admin/brush-brands")
      .then((d) => setBrands(d.brands))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await api.post<{ brands: BrushBrand[] }>("/api/admin/brush-brands/seed", {});
      setBrands(res.brands);
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async (id: string, updates: { name?: string; description?: string }) => {
    const updated = await api.patch<{ brand: BrushBrand }>(`/api/admin/brush-brands/${id}`, updates);
    setBrands((prev) => prev.map((b) => b.id === id ? updated.brand : b));
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/admin/brush-brands/${id}`);
    setBrands((prev) => prev.filter((b) => b.id !== id));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await api.post<{ brand: BrushBrand }>("/api/admin/brush-brands", { name: newName.trim(), description: "" });
      setBrands((prev) => [...prev, res.brand]);
      setNewName("");
      setShowAdd(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[#f5f2eb] font-semibold text-lg">Brush Brands</h2>
          <p className="text-gray-500 text-sm mt-0.5">{brands.length} brands</p>
        </div>
        <div className="flex gap-2">
          {brands.length === 0 && !fetching && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-4 py-2 bg-white/5 text-gray-300 text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors disabled:opacity-40"
            >
              {seeding ? "Seeding…" : "Seed defaults"}
            </button>
          )}
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="px-4 py-2 bg-[#c9a050]/10 text-[#c9a050] text-sm font-semibold rounded-xl hover:bg-[#c9a050]/20 transition-colors"
          >
            + Add brand
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-6 bg-[#242424] rounded-2xl border border-white/5 p-5 flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Brand name…"
            autoFocus
            className="flex-1 bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
          />
          <button
            type="submit"
            disabled={!newName.trim() || adding}
            className="px-5 py-2 bg-[#c9a050] text-black text-sm font-bold rounded-lg hover:bg-[#b8903f] transition-colors disabled:opacity-40"
          >
            {adding ? "Adding…" : "Add"}
          </button>
          <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-gray-500 hover:text-gray-300 px-2">
            Cancel
          </button>
        </form>
      )}

      {fetching ? (
        <p className="text-gray-600 text-sm">Loading…</p>
      ) : (
        <div className="space-y-2">
          {brands.map((brand) => (
            <BrushBrandCard
              key={brand.id}
              brand={brand}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
          {brands.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-8">
              No brush brands yet. Use "Seed defaults" to add the major brands, or add your own.
            </p>
          )}
        </div>
      )}
    </>
  );
}
