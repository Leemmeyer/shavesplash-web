"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";

type Brand = {
  id: string;
  name: string;
  models: string[];
  pendingModels: string[];
  materials: string[];
  sortOrder: number;
  pending: boolean;
};

const STANDARD_METALS = [
  "Aluminum", "Brass", "Bronze", "Chrome Plated", "Chrome Plated Zinc",
  "Copper", "Gold Plated", "Rosegold", "Silver Plated",
  "Stainless Steel", "Titanium", "Zamak",
];

function ChipEditor({
  label,
  items,
  suggestions,
  onChange,
}: {
  label: string;
  items: string[];
  suggestions?: string[];
  onChange: (items: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const val = input.trim();
    if (!val || items.includes(val)) return;
    onChange([...items, val]);
    setInput("");
    inputRef.current?.focus();
  };

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const filtered = suggestions?.filter(
    (s) => !items.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  ) ?? [];

  return (
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {items.map((item, i) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 bg-[#2a2a2a] border border-white/10 rounded-full px-3 py-0.5 text-sm text-[#f5f2eb]"
          >
            {item}
            <button
              onClick={() => remove(i)}
              className="text-gray-500 hover:text-red-400 transition-colors ml-0.5 text-xs leading-none"
            >
              ×
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-gray-600 text-xs italic">None yet</span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder={`Add ${label.toLowerCase()}…`}
            className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
          />
          {input && filtered.length > 0 && (
            <ul className="absolute top-full left-0 right-0 mt-1 bg-[#2a2a2a] border border-white/10 rounded-lg overflow-hidden z-10 shadow-lg">
              {filtered.slice(0, 6).map((s) => (
                <li key={s}>
                  <button
                    onClick={() => { onChange([...items, s]); setInput(""); inputRef.current?.focus(); }}
                    className="w-full text-left px-3 py-2 text-sm text-[#f5f2eb] hover:bg-[#c9a050]/10 hover:text-[#c9a050] transition-colors"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={add}
          disabled={!input.trim()}
          className="px-3 py-1.5 bg-[#c9a050]/10 text-[#c9a050] text-sm font-semibold rounded-lg hover:bg-[#c9a050]/20 transition-colors disabled:opacity-30"
        >
          Add
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
  onSave: (id: string, updates: Partial<Pick<Brand, "models" | "materials">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [models, setModels] = useState(brand.models);
  const [materials, setMaterials] = useState(brand.materials);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleSetModels = (m: string[]) => { setModels(m); setDirty(true); };
  const handleSetMaterials = (m: string[]) => { setMaterials(m); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    await onSave(brand.id, { models, materials });
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
        <div className="flex items-center gap-3">
          <span className="text-[#f5f2eb] font-semibold">{brand.name}</span>
          <span className="text-gray-600 text-xs">{brand.models.length} models</span>
        </div>
        <span className="text-gray-600 text-sm">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-5">
          <ChipEditor label="Models" items={models} onChange={handleSetModels} />
          <ChipEditor label="Metals" items={materials} suggestions={STANDARD_METALS} onChange={handleSetMaterials} />

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleDelete}
              className="text-xs text-gray-600 hover:text-red-400 transition-colors"
            >
              Delete brand
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
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

export default function RazorsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [fetching, setFetching] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.get<{ brands: Brand[] }>("/api/admin/brands")
      .then((d) => setBrands(d.brands.slice().sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleSave = async (id: string, updates: Partial<Pick<Brand, "models" | "materials">>) => {
    const updated = await api.patch<{ brand: Brand }>(`/api/admin/brands/${id}`, updates);
    setBrands((prev) => prev.map((b) => b.id === id ? updated.brand : b));
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/admin/brands/${id}`);
    setBrands((prev) => prev.filter((b) => b.id !== id));
  };

  const handleApprove = async (id: string) => {
    const updated = await api.patch<{ brand: Brand }>(`/api/admin/brands/${id}/approve`, {});
    setBrands((prev) => prev.map((b) => b.id === id ? updated.brand : b).sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleApproveModel = async (id: string, model: string) => {
    const updated = await api.patch<{ brand: Brand }>(`/api/admin/brands/${id}/approve-model`, { model });
    setBrands((prev) => prev.map((b) => b.id === id ? updated.brand : b));
  };

  const handleRejectModel = async (id: string, model: string) => {
    const updated = await api.patch<{ brand: Brand }>(`/api/admin/brands/${id}/reject-model`, { model });
    setBrands((prev) => prev.map((b) => b.id === id ? updated.brand : b));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await api.post<{ brand: Brand }>("/api/admin/brands", { name: newName.trim(), models: [], materials: [] });
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
          <h2 className="text-[#f5f2eb] font-semibold text-lg">Razor Brands</h2>
          <p className="text-gray-500 text-sm mt-0.5">{brands.length} brands · click to edit models</p>
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
        <>
          {brands.some((b) => b.pending) && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3">
                ⏳ Pending Brands ({brands.filter((b) => b.pending).length})
              </h2>
              <div className="space-y-2">
                {brands.filter((b) => b.pending).map((brand) => (
                  <div key={brand.id} className="bg-[#242424] rounded-2xl border border-amber-400/20 px-5 py-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[#f5f2eb] font-semibold">{brand.name}</p>
                      {brand.models.length > 0 && (
                        <p className="text-gray-500 text-xs mt-1">Models: {brand.models.join(", ")}</p>
                      )}
                      <p className="text-gray-600 text-xs mt-0.5 italic">User-submitted</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(brand.id)}
                        className="text-sm bg-[#c9a050] text-black font-semibold px-4 py-1.5 rounded-lg hover:bg-[#b8903f] transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDelete(brand.id)}
                        className="text-sm text-gray-500 hover:text-red-400 transition-colors px-2"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {brands.some((b) => b.pendingModels?.length > 0) && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3">
                ⏳ Pending Models ({brands.reduce((sum, b) => sum + (b.pendingModels?.length ?? 0), 0)})
              </h2>
              <div className="space-y-2">
                {brands.filter((b) => b.pendingModels?.length > 0).map((brand) => (
                  <div key={brand.id} className="bg-[#242424] rounded-2xl border border-amber-400/20 px-5 py-4">
                    <p className="text-[#f5f2eb] font-semibold mb-3">{brand.name}</p>
                    <div className="space-y-2">
                      {brand.pendingModels.map((model) => (
                        <div key={model} className="flex items-center justify-between gap-4 bg-[#1e1e1e] rounded-xl px-4 py-2.5">
                          <p className="text-[#f5f2eb] text-sm">{model}</p>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleApproveModel(brand.id, model)}
                              className="text-xs bg-[#c9a050] text-black font-semibold px-3 py-1 rounded-lg hover:bg-[#b8903f] transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectModel(brand.id, model)}
                              className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {brands.filter((b) => !b.pending).map((brand) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
