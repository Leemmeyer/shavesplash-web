"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "razors", label: "Razors", icon: "🪒" },
  { id: "blades", label: "Blades", icon: "⚡" },
  { id: "brushes", label: "Brushes", icon: "🖌️" },
  { id: "soaps", label: "Soaps", icon: "🫧" },
  { id: "aftershaves", label: "Aftershaves", icon: "💧" },
  { id: "balms", label: "Balms", icon: "🧴" },
  { id: "preshaves", label: "Preshaves", icon: "✨" },
  { id: "edpedt", label: "EDP/EDT", icon: "🌸" },
];

type GearItem = {
  id: string;
  categoryId: string;
  brand: string;
  name: string;
  data: Record<string, unknown>;
  hasPhoto: boolean;
  createdAt: string;
};

function categoryIcon(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.icon ?? "📦";
}

function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

function specPreview(item: GearItem): string {
  const d = item.data;
  if (item.categoryId === "razors") {
    const parts: string[] = [];
    if (d.edgeType) parts.push(String(d.edgeType));
    if (d.construction) parts.push(String(d.construction));
    if (d.metal) parts.push(String(d.metal));
    return parts.join(" · ");
  }
  if (item.categoryId === "blades") {
    const parts: string[] = [];
    if (d.bladeFormat) parts.push(String(d.bladeFormat));
    if (d.bladeCountryOfOrigin) parts.push(String(d.bladeCountryOfOrigin));
    return parts.join(" · ");
  }
  if (item.categoryId === "brushes") {
    const parts: string[] = [];
    if (d.knot) parts.push(String(d.knot));
    if (d.diameter) parts.push(String(d.diameter));
    return parts.join(" · ");
  }
  if (item.categoryId === "soaps" || item.categoryId === "aftershaves") {
    if (d.scentFamily) return String(d.scentFamily);
  }
  return "";
}

// ─── Item Photo ───────────────────────────────────────────────────────────────

function GearPhoto({ item }: { item: GearItem }) {
  const ref = useRef<HTMLDivElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fetched = useRef(false);

  const fetchPhoto = useCallback(() => {
    if (fetched.current || !item.hasPhoto) return;
    fetched.current = true;
    api.get<{ photoUrl: string | null }>(`/api/gear/${item.id}/photo`)
      .then((d) => setPhotoUrl(d.photoUrl))
      .catch(() => {});
  }, [item.id, item.hasPhoto]);

  useEffect(() => {
    if (!item.hasPhoto) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { fetchPhoto(); observer.disconnect(); } },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [item.hasPhoto, fetchPhoto]);

  return (
    <div ref={ref} className="aspect-square bg-[#161616] relative overflow-hidden rounded-t-xl">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={item.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-4xl opacity-10">{categoryIcon(item.categoryId)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function SpecRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-start gap-4 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-gray-500 text-sm shrink-0">{label}</span>
      <span className="text-[#f5f2eb] text-sm text-right">{value}</span>
    </div>
  );
}

function DetailSpecs({ item }: { item: GearItem }) {
  const d = item.data;
  const cat = item.categoryId;

  const rows: { label: string; value: string | number }[] = [];

  if (cat === "razors") {
    if (d.edgeType) rows.push({ label: "Edge Type", value: String(d.edgeType) });
    if (d.construction) rows.push({ label: "Construction", value: String(d.construction) });
    if (d.metal) rows.push({ label: "Metal", value: String(d.metal) });
    if (d.finish) rows.push({ label: "Finish", value: String(d.finish) });
    if (d.bladeGap != null) rows.push({ label: "Blade Gap", value: `${d.bladeGap}mm` });
    if (d.exposure != null) rows.push({ label: "Exposure", value: `${d.exposure}mm` });
    if (d.weight != null) rows.push({ label: "Weight", value: `${d.weight}g` });
    if (d.straightWidth) rows.push({ label: "Width", value: `${d.straightWidth}"` });
    if (d.straightPoint) rows.push({ label: "Point", value: String(d.straightPoint) });
    if (d.straightHollow) rows.push({ label: "Hollow", value: String(d.straightHollow) });
  }
  if (cat === "blades") {
    if (d.bladeFormat) rows.push({ label: "Format", value: String(d.bladeFormat) });
    if (d.bladeCountryOfOrigin) rows.push({ label: "Country", value: String(d.bladeCountryOfOrigin) });
    if (d.bladeCoating) rows.push({ label: "Coating", value: String(d.bladeCoating) });
    if (d.sharpness) rows.push({ label: "Sharpness", value: `${d.sharpness}/10` });
  }
  if (cat === "brushes") {
    if (d.knot) rows.push({ label: "Knot", value: String(d.knot) });
    if (d.diameter) rows.push({ label: "Diameter", value: String(d.diameter) });
  }
  if (cat === "soaps") {
    if (d.soapDensity) rows.push({ label: "Density", value: `${d.soapDensity}/10` });
    if (d.soapCushion) rows.push({ label: "Cushion", value: `${d.soapCushion}/10` });
    if (d.soapSlickness) rows.push({ label: "Slickness", value: `${d.soapSlickness}/10` });
    if (d.soapStability) rows.push({ label: "Stability", value: `${d.soapStability}/10` });
    if (d.soapScentStrength) rows.push({ label: "Scent Strength", value: `${d.soapScentStrength}/10` });
    if (d.soapHasMenthol != null) rows.push({ label: "Menthol", value: d.soapHasMenthol ? "Yes" : "No" });
    if (d.soapIsTallow != null) rows.push({ label: "Base", value: d.soapIsTallow ? "Tallow" : "Vegan" });
  }
  if (cat === "aftershaves") {
    if (d.aftershaveScentStrength) rows.push({ label: "Scent Strength", value: `${d.aftershaveScentStrength}/10` });
  }
  if (cat === "edpedt") {
    if (d.edpedtScentStrength) rows.push({ label: "Scent Strength", value: `${d.edpedtScentStrength}/10` });
  }
  if (cat === "preshaves") {
    if (d.preshaveType) rows.push({ label: "Type", value: String(d.preshaveType) });
  }
  if (["soaps", "aftershaves", "edpedt"].includes(cat)) {
    if (d.scentFamily) rows.push({ label: "Scent Family", value: d.familySubtype ? `${d.scentFamily} · ${d.familySubtype}` : String(d.scentFamily) });
    if (d.topNotes) rows.push({ label: "Top Notes", value: String(d.topNotes) });
    if (d.heartNotes) rows.push({ label: "Heart Notes", value: String(d.heartNotes) });
    if (d.baseNotes) rows.push({ label: "Base Notes", value: String(d.baseNotes) });
    if (d.inspiration) rows.push({ label: "Inspiration", value: String(d.inspiration) });
  }
  if (["soaps", "balms", "aftershaves", "edpedt"].includes(cat)) {
    if (d.size != null) {
      const unit = ["soaps", "balms"].includes(cat) ? "oz" : "mL";
      rows.push({ label: "Size", value: `${d.size} ${unit}` });
    }
  }

  const hasIngredients = !!d.ingredients && ["soaps", "aftershaves", "balms", "preshaves", "edpedt"].includes(cat);
  if (rows.length === 0 && !d.scentDescription && !hasIngredients) return null;

  return (
    <div className="mt-4">
      {rows.map((r) => <SpecRow key={r.label} {...r} />)}
      {!!d.scentDescription && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5">Description</p>
          <p className="text-[#f5f2eb] text-sm leading-relaxed">{String(d.scentDescription)}</p>
        </div>
      )}
      {hasIngredients && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5">Ingredients</p>
          <p className="text-[#f5f2eb] text-sm leading-relaxed">{String(d.ingredients)}</p>
        </div>
      )}
    </div>
  );
}

function DetailModal({ item, selected, onToggle, onEdit, onClose }: {
  item: GearItem; selected: boolean;
  onToggle: () => void; onEdit: () => void; onClose: () => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!item.hasPhoto) return;
    api.get<{ photoUrl: string | null }>(`/api/gear/${item.id}/photo`)
      .then((d) => setPhotoUrl(d.photoUrl))
      .catch(() => {});
  }, [item.id, item.hasPhoto]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-[#1e1e1e] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-white/10 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5 shrink-0">
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            {categoryIcon(item.categoryId)} {categoryLabel(item.categoryId)}
          </span>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-xl leading-none">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 pb-5">
          {/* Photo */}
          {item.hasPhoto && (
            <div className="aspect-square bg-[#161616] rounded-xl overflow-hidden mt-4">
              {photoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={photoUrl} alt={item.name} className="w-full h-full object-contain" />
                : <div className="w-full h-full flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
                  </div>
              }
            </div>
          )}

          {/* Identity */}
          <div className="mt-4">
            <p className="text-[#c9a050] text-sm font-medium">{item.brand}</p>
            <h2 className="text-[#f5f2eb] text-xl font-bold leading-snug mt-0.5">{item.name}</h2>
          </div>

          {/* Specs */}
          <DetailSpecs item={item} />
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-5 pt-3 border-t border-white/5 shrink-0 flex gap-3">
          <button
            onClick={onEdit}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-[#f5f2eb] hover:border-white/20 transition-colors"
          >
            Propose Edit
          </button>
          <button
            onClick={onToggle}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${selected ? "bg-[#c9a050]/20 border border-[#c9a050]/60 text-[#c9a050]" : "bg-[#c9a050] text-black hover:bg-[#d4aa60]"}`}
          >
            {selected ? "✓ Selected for Den" : "Add to Den"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ item, onClose }: { item: GearItem; onClose: () => void }) {
  const [brand, setBrand] = useState(item.brand);
  const [name, setName] = useState(item.name);
  const [data, setData] = useState<Record<string, unknown>>(item.data);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (key: string, value: unknown) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!brand.trim() || !name.trim()) { setError("Brand and name are required"); return; }
    setSaving(true);
    try {
      await api.post(`/api/gear/${item.id}/edit`, {
        brand: brand.trim(),
        name: name.trim(),
        data,
        ...(photoPreview !== null ? { photoUrl: photoPreview } : {}),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-[#1e1e1e] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/10 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-[#f5f2eb] font-semibold">Propose Edit</h2>
            <p className="text-gray-500 text-xs mt-0.5">{item.brand} — {item.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-xl leading-none">✕</button>
        </div>

        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-[#f5f2eb] font-semibold">Edit submitted for review</p>
            <p className="text-gray-500 text-sm mt-1">An admin will review your proposed changes.</p>
            <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-[#c9a050] text-black rounded-xl text-sm font-semibold">Done</button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Brand</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-2.5 text-[#f5f2eb] text-sm focus:outline-none focus:border-[#c9a050]/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-2.5 text-[#f5f2eb] text-sm focus:outline-none focus:border-[#c9a050]/50" />
            </div>

            {/* Category-specific editable fields */}
            {item.categoryId === "razors" && (
              <EditRazorFields data={data} setField={setField} />
            )}
            {item.categoryId === "blades" && (
              <EditBladeFields data={data} setField={setField} />
            )}
            {item.categoryId === "brushes" && (
              <EditBrushFields data={data} setField={setField} />
            )}
            {(item.categoryId === "soaps" || item.categoryId === "aftershaves" || item.categoryId === "edpedt") && (
              <EditScentFields data={data} setField={setField} />
            )}

            {/* Photo */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Photo (optional update)</label>
              {photoPreview ? (
                <div className="relative w-24 aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button onClick={() => setPhotoPreview(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">✕</button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#242424] border border-white/10 rounded-xl text-sm text-gray-400 cursor-pointer hover:border-white/20 transition-colors">
                  Upload photo
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const supported = ['image/jpeg', 'image/png', 'image/webp'];
                      if (!supported.includes(file.type)) { setError('Please use JPEG, PNG, or WEBP.'); return; }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const img = new Image();
                        img.onload = () => {
                          const MAX = 800;
                          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                          const canvas = document.createElement('canvas');
                          canvas.width = Math.round(img.width * scale);
                          canvas.height = Math.round(img.height * scale);
                          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                          setPhotoPreview(canvas.toDataURL('image/jpeg', 0.7));
                          setError(null);
                        };
                        img.src = reader.result as string;
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}

        {!done && (
          <div className="px-5 pb-5 pt-3 border-t border-white/5 shrink-0">
            <button onClick={handleSubmit} disabled={saving}
              className="w-full py-3 bg-[#c9a050] text-black rounded-xl font-semibold text-sm hover:bg-[#d4aa60] transition-colors disabled:opacity-50">
              {saving ? "Submitting…" : "Submit for Review"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditRazorFields({ data, setField }: { data: Record<string, unknown>; setField: (k: string, v: unknown) => void }) {
  const pills = (label: string, key: string, opts: string[]) => (
    <div>
      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => (
          <button key={o} type="button" onClick={() => setField(key, data[key] === o ? "" : o)}
            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${data[key] === o ? "bg-[#c9a050]/20 border-[#c9a050]/60 text-[#c9a050]" : "bg-[#242424] border-white/10 text-gray-400"}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="space-y-3">
      {pills("Edge Type", "edgeType", ["Double Edge", "GEM", "Injector", "AC", "SE", "Straight"])}
      {pills("Construction", "construction", ["1pc", "2pc", "3pc", "4pc", "Adjustable"])}
      {pills("Metal", "metal", ["Aluminum", "Brass", "Bronze", "Copper", "Steel", "Titanium", "Zamak"])}
      {pills("Finish", "finish", ["Machined", "Brushed", "Satin", "Polished", "Mirror Polished"])}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Blade Gap (mm)</label>
          <input type="number" step="0.01" value={String(data.bladeGap ?? "")} onChange={(e) => setField("bladeGap", e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full bg-[#242424] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Weight (g)</label>
          <input type="number" value={String(data.weight ?? "")} onChange={(e) => setField("weight", e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full bg-[#242424] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50" />
        </div>
      </div>
    </div>
  );
}

function EditBladeFields({ data, setField }: { data: Record<string, unknown>; setField: (k: string, v: unknown) => void }) {
  const pills = (label: string, key: string, opts: string[]) => (
    <div>
      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => (
          <button key={o} type="button" onClick={() => setField(key, data[key] === o ? "" : o)}
            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${data[key] === o ? "bg-[#c9a050]/20 border-[#c9a050]/60 text-[#c9a050]" : "bg-[#242424] border-white/10 text-gray-400"}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="space-y-3">
      {pills("Format", "bladeFormat", ["Double Edge", "GEM", "Injector", "AC", "SE"])}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Country of Origin</label>
        <input value={String(data.bladeCountryOfOrigin ?? "")} onChange={(e) => setField("bladeCountryOfOrigin", e.target.value)}
          className="w-full bg-[#242424] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Coating</label>
        <input value={String(data.bladeCoating ?? "")} onChange={(e) => setField("bladeCoating", e.target.value)}
          className="w-full bg-[#242424] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50" />
      </div>
    </div>
  );
}

function EditBrushFields({ data, setField }: { data: Record<string, unknown>; setField: (k: string, v: unknown) => void }) {
  const pills = (label: string, key: string, opts: string[]) => (
    <div>
      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => (
          <button key={o} type="button" onClick={() => setField(key, data[key] === o ? "" : o)}
            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${data[key] === o ? "bg-[#c9a050]/20 border-[#c9a050]/60 text-[#c9a050]" : "bg-[#242424] border-white/10 text-gray-400"}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="space-y-3">
      {pills("Knot", "knot", ["Badger", "Boar", "Horse", "Mixed", "Synthetic"])}
      {pills("Diameter", "diameter", ["20mm","22mm","24mm","25mm","26mm","27mm","28mm","30mm"])}
    </div>
  );
}

function EditScentFields({ data, setField }: { data: Record<string, unknown>; setField: (k: string, v: unknown) => void }) {
  const field = (label: string, key: string) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input value={String(data[key] ?? "")} onChange={(e) => setField(key, e.target.value)}
        className="w-full bg-[#242424] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50" />
    </div>
  );
  return (
    <div className="space-y-3">
      {field("Scent Family", "scentFamily")}
      {field("Top Notes", "topNotes")}
      {field("Heart Notes", "heartNotes")}
      {field("Base Notes", "baseNotes")}
      {field("Inspiration", "inspiration")}
    </div>
  );
}

// ─── Gear Card ────────────────────────────────────────────────────────────────

function GearCard({
  item, selected, onToggle, onEdit, onView,
}: {
  item: GearItem; selected: boolean;
  onToggle: () => void; onEdit: () => void; onView: () => void;
}) {
  const preview = specPreview(item);

  return (
    <div
      onClick={onView}
      className={`group relative bg-[#1e1e1e] rounded-xl border transition-all cursor-pointer flex flex-col ${selected ? "border-[#c9a050]/60 ring-1 ring-[#c9a050]/30" : "border-white/5 hover:border-white/15"}`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${selected ? "bg-[#c9a050] border-[#c9a050] text-black" : "bg-black/60 border-white/30 hover:border-white/60"}`}
      >
        {selected && <span className="text-xs font-bold leading-none">✓</span>}
      </button>

      {/* Photo */}
      <GearPhoto item={item} />

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider font-medium mb-1">
          {categoryIcon(item.categoryId)} {categoryLabel(item.categoryId)}
        </span>
        <p className="text-[#c9a050] text-xs font-medium leading-tight">{item.brand}</p>
        <p className="text-[#f5f2eb] text-sm font-semibold leading-snug mt-0.5 line-clamp-2">{item.name}</p>
        {preview && <p className="text-gray-600 text-xs mt-1.5 line-clamp-1">{preview}</p>}

        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="mt-auto pt-2.5 text-xs text-gray-600 hover:text-[#c9a050] transition-colors text-left"
        >
          Propose edit →
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DB_SORT_KEY = "shavesplash-db-sort";

function DatabasePageContent() {
  const [items, setItems] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"brand" | "name">(() => {
    try { return (localStorage.getItem(DB_SORT_KEY) as "brand" | "name") ?? "brand"; } catch { return "brand"; }
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editItem, setEditItem] = useState<GearItem | null>(null);
  const [viewItem, setViewItem] = useState<GearItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  const fetchItems = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (search.trim()) params.set("q", search.trim());
    api.get<{ items: GearItem[] }>(`/api/gear?${params}`)
      .then((d) => setItems(d.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddToDen = async () => {
    if (selected.size === 0 || adding) return;
    setAdding(true);
    try {
      const { created } = await api.post<{ created: string[] }>("/api/gear/add-to-den", { ids: [...selected] });
      setAddedCount(created.length);
      setSelected(new Set());
      setTimeout(() => setAddedCount(0), 3000);
    } catch {}
    finally { setAdding(false); }
  };

  // Derive unique brands for current filter
  const brands = [...new Set(items.map((i) => i.brand))].sort();

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) =>
      sort === "brand"
        ? a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name) || a.brand.localeCompare(b.brand)
    );
  }, [items, sort]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050]">Gear Database</h1>
          <p className="text-gray-500 text-sm mt-0.5">Community-contributed shaving gear</p>
        </div>
        <Link href="/database/submit"
          className="shrink-0 px-4 py-2 bg-[#c9a050] text-black rounded-xl text-sm font-semibold hover:bg-[#d4aa60] transition-colors">
          + Submit Item
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brand or item name…"
          className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/40 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">✕</button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-6 pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${category === cat.id ? "bg-[#c9a050] text-black" : "bg-[#1e1e1e] text-gray-400 hover:text-[#f5f2eb] border border-white/5"}`}
          >
            {cat.icon ? `${cat.icon} ` : ""}{cat.label}
          </button>
        ))}
      </div>

      {/* Sort + Stats row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-600 text-xs">
          {loading ? "" : `${items.length} item${items.length !== 1 ? "s" : ""}${brands.length > 0 ? ` · ${brands.length} brand${brands.length !== 1 ? "s" : ""}` : ""}`}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-sm">Sort by</span>
          <select
            value={sort}
            onChange={(e) => {
              const v = e.target.value as "brand" | "name";
              setSort(v);
              try { localStorage.setItem(DB_SORT_KEY, v); } catch {}
            }}
            className="bg-[#1e1e1e] border border-white/10 rounded-xl px-3 py-1.5 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/40 cursor-pointer"
          >
            <option value="brand">Brand A–Z</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-sm">No items yet.</p>
          <Link href="/database/submit" className="mt-3 inline-block text-[#c9a050] text-sm hover:underline">
            Be the first to submit →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {sortedItems.map((item) => (
            <GearCard
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={() => toggleSelect(item.id)}
              onEdit={() => setEditItem(item)}
              onView={() => setViewItem(item)}
            />
          ))}
        </div>
      )}

      {/* Floating add-to-den bar */}
      {(selected.size > 0 || addedCount > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-[#1e1e1e] border border-[#c9a050]/40 rounded-2xl px-5 py-3 shadow-2xl">
          {addedCount > 0 ? (
            <span className="text-[#c9a050] text-sm font-semibold">✓ {addedCount} item{addedCount !== 1 ? "s" : ""} added to Den</span>
          ) : (
            <>
              <span className="text-gray-400 text-sm">{selected.size} selected</span>
              <button onClick={() => setSelected(new Set())} className="text-gray-600 text-xs hover:text-gray-400">Clear</button>
              <button
                onClick={handleAddToDen}
                disabled={adding}
                className="px-4 py-1.5 bg-[#c9a050] text-black rounded-xl text-sm font-semibold hover:bg-[#d4aa60] transition-colors disabled:opacity-50"
              >
                {adding ? "Adding…" : "Add to Den"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Detail modal */}
      {viewItem && (
        <DetailModal
          item={viewItem}
          selected={selected.has(viewItem.id)}
          onToggle={() => toggleSelect(viewItem.id)}
          onEdit={() => { setViewItem(null); setEditItem(viewItem); }}
          onClose={() => setViewItem(null)}
        />
      )}

      {/* Edit modal */}
      {editItem && <EditModal item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  );
}

export default function DatabasePage() {
  return (
    <AuthGuard>
      <DatabasePageContent />
    </AuthGuard>
  );
}
