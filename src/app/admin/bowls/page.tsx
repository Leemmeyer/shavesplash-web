"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type BowlItem = {
  id?: string;
  name: string;
  material: string;
  diameterIn: string;
  depthIn: string;
  weightG: string;
};

type Brand = {
  id: string;
  name: string;
  items: BowlItem[];
  sortOrder: number;
  pending: boolean;
};

const EMPTY_BOWL: BowlItem = { name: "", material: "", diameterIn: "", depthIn: "", weightG: "" };

function BowlForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: BowlItem;
  onSave: (item: BowlItem) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<BowlItem>(initial);
  const set = (key: keyof BowlItem, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="bg-[#1e1e1e] border border-white/10 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Captain's Choice"
            className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-1">Material</label>
          <input
            type="text"
            value={form.material}
            onChange={(e) => set("material", e.target.value)}
            placeholder="e.g. Ceramic, Stainless Steel"
            className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-1">Diameter (in)</label>
          <input
            type="text"
            value={form.diameterIn}
            onChange={(e) => set("diameterIn", e.target.value)}
            placeholder="e.g. 4.5"
            className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-1">Depth (in)</label>
          <input
            type="text"
            value={form.depthIn}
            onChange={(e) => set("depthIn", e.target.value)}
            placeholder="e.g. 2.0"
            className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-1">Weight (g)</label>
          <input
            type="text"
            value={form.weightG}
            onChange={(e) => set("weightG", e.target.value)}
            placeholder="e.g. 320"
            className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-300 px-3 py-1.5 transition-colors">
          Cancel
        </button>
        <button
          onClick={() => { if (form.name.trim()) onSave(form); }}
          disabled={!form.name.trim()}
          className="px-4 py-1.5 bg-[#c9a050] text-black text-sm font-bold rounded-lg hover:bg-[#b8903f] transition-colors disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function BrandCard({
  brand,
  onSave,
  onDelete,
}: {
  brand: Brand;
  onSave: (id: string, items: BowlItem[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<BowlItem[]>(brand.items);
  const [addingNew, setAddingNew] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (updated: BowlItem[]) => {
    setSaving(true);
    await onSave(brand.id, updated);
    setSaving(false);
  };

  const handleAdd = async (item: BowlItem) => {
    const updated = [...items, item];
    setItems(updated);
    setAddingNew(false);
    await save(updated);
  };

  const handleEdit = async (idx: number, item: BowlItem) => {
    const updated = items.map((it, i) => (i === idx ? item : it));
    setItems(updated);
    setEditingIdx(null);
    await save(updated);
  };

  const handleDelete = async (idx: number) => {
    if (!confirm(`Remove "${items[idx]?.name}"?`)) return;
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated);
    await save(updated);
  };

  const handleDeleteBrand = async () => {
    if (!confirm(`Delete brand "${brand.name}"? This cannot be undone.`)) return;
    await onDelete(brand.id);
  };

  return (
    <div className="bg-[#242424] rounded-2xl border border-white/5 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#f5f2eb] font-semibold">{brand.name}</span>
          <span className="text-gray-600 text-xs">{items.length} {items.length === 1 ? "bowl" : "bowls"}</span>
        </div>
        <span className="text-gray-600 text-sm">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-3">
          {items.length === 0 && !addingNew && (
            <p className="text-gray-600 text-sm italic">No bowls yet.</p>
          )}

          {items.map((item, idx) => (
            editingIdx === idx ? (
              <BowlForm
                key={idx}
                initial={item}
                onSave={(updated) => handleEdit(idx, updated)}
                onCancel={() => setEditingIdx(null)}
              />
            ) : (
              <div key={idx} className="bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <p className="text-[#f5f2eb] font-semibold text-sm">{item.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    {item.material && <span className="text-gray-400 text-xs">Material: {item.material}</span>}
                    {item.diameterIn && <span className="text-gray-400 text-xs">Ø {item.diameterIn}"</span>}
                    {item.depthIn && <span className="text-gray-400 text-xs">Depth {item.depthIn}"</span>}
                    {item.weightG && <span className="text-gray-400 text-xs">{item.weightG} g</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setEditingIdx(idx)}
                    className="text-xs text-gray-500 hover:text-[#c9a050] transition-colors px-2 py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(idx)}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1"
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          ))}

          {addingNew && (
            <BowlForm
              initial={EMPTY_BOWL}
              onSave={handleAdd}
              onCancel={() => setAddingNew(false)}
            />
          )}

          {!addingNew && editingIdx === null && (
            <button
              onClick={() => setAddingNew(true)}
              className="w-full py-2 border border-dashed border-white/10 rounded-xl text-gray-600 text-sm hover:border-[#c9a050]/30 hover:text-[#c9a050] transition-colors"
            >
              + Add bowl
            </button>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <button
              onClick={handleDeleteBrand}
              className="text-xs text-gray-600 hover:text-red-400 transition-colors"
            >
              Delete brand
            </button>
            {saving && <span className="text-xs text-gray-500">Saving…</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BowlsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [fetching, setFetching] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.get<{ brands: Brand[] }>("/api/admin/bowl-brands")
      .then((d) => setBrands(d.brands.slice().sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleSave = async (id: string, items: BowlItem[]) => {
    const updated = await api.patch<{ brand: Brand }>(`/api/admin/bowl-brands/${id}`, { items });
    setBrands((prev) => prev.map((b) => b.id === id ? updated.brand : b));
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/admin/bowl-brands/${id}`);
    setBrands((prev) => prev.filter((b) => b.id !== id));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await api.post<{ brand: Brand }>("/api/admin/bowl-brands", { name: newName.trim() });
      setBrands((prev) => [...prev, res.brand].sort((a, b) => a.name.localeCompare(b.name)));
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
          <h2 className="text-[#f5f2eb] font-semibold text-lg">Shaving Bowls</h2>
          <p className="text-gray-500 text-sm mt-0.5">{brands.length} brands · click to add or edit bowls</p>
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="px-4 py-2 bg-[#c9a050]/10 text-[#c9a050] text-sm font-semibold rounded-xl hover:bg-[#c9a050]/20 transition-colors"
        >
          + Add brand
        </button>
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
            <BrandCard
              key={brand.id}
              brand={brand}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
          {brands.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-8">No bowl brands yet.</p>
          )}
        </div>
      )}
    </>
  );
}
