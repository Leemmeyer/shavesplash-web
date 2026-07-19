"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";
import CatalogPicker, { CatalogEntry } from "@/components/CatalogPicker";

const EDGE_TYPE_OPTIONS = ["Double Edge", "GEM", "Injector", "AC", "SE", "Straight"] as const;
const CONSTRUCTION_OPTIONS = ["1pc", "2pc", "3pc", "4pc", "Adjustable"] as const;
const METAL_OPTIONS = ["Aluminum", "Brass", "Bronze", "Copper", "Steel", "Titanium", "Zamak"] as const;
const FINISH_OPTIONS = ["Machined", "Brushed", "Satin", "Polished", "Mirror Polished"] as const;
const KNOT_OPTIONS = ["Badger", "Boar", "Horse", "Mixed", "Synthetic"] as const;
const DIAMETER_OPTIONS = [
  "16mm","17mm","18mm","19mm","20mm","22mm","24mm","25mm","26mm","27mm","28mm","29mm",
  "30mm","31mm","32mm","33mm","34mm","35mm","36mm","37mm","38mm","39mm","40mm",
] as const;
const BLADE_FORMAT_OPTIONS = ["Double Edge", "GEM", "Injector", "AC", "SE"] as const;
const STRAIGHT_WIDTH_OPTIONS = ["4/8", "5/8", "6/8", "7/8", "8/8", "11/16", "13/16", "15/16"] as const;
const STRAIGHT_POINT_OPTIONS = ["Round", "Square", "Spike", "Barbers notch", "French", "Spanish"] as const;
const STRAIGHT_HOLLOW_OPTIONS = ["Extra Full", "Full", "1/2 hollow", "1/4 hollow", "Near Wedge", "Wedge", "Frameback", "Faux frameback"] as const;
const PRESHAVE_TYPE_OPTIONS = ["Oil", "Cream", "Gel", "Solid"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  razors: "Razor", blades: "Blade", brushes: "Brush", soaps: "Shave Soap",
  aftershaves: "Aftershave", balms: "Balm", preshaves: "Preshave", edpedt: "EDP/EDT",
};
const CATEGORY_ICONS: Record<string, string> = {
  razors: "🪒", blades: "⚡", brushes: "🖌️", soaps: "🫧",
  aftershaves: "💧", balms: "🧴", preshaves: "✨", edpedt: "🌸",
};

type RazorPlate = { name: string; type: string; bladeGap?: number; exposure?: number };

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(value === o ? "" : o)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              value === o
                ? "bg-[#c9a050]/20 border-[#c9a050]/60 text-[#c9a050]"
                : "bg-[#242424] border-white/10 text-gray-400 hover:border-white/20"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function RatingField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
        {label} {value > 0 && <span className="text-[#c9a050]">({value}/10)</span>}
      </label>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
              n <= value
                ? "bg-[#c9a050] text-[#1a1a1a]"
                : "bg-[#242424] border border-white/10 text-gray-600 hover:border-white/20"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean | undefined; onChange: (v: boolean | undefined) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex gap-2">
        {([undefined, true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              value === v
                ? "bg-[#c9a050]/20 border-[#c9a050]/60 text-[#c9a050]"
                : "bg-[#242424] border-white/10 text-gray-400 hover:border-white/20"
            }`}
          >
            {v === undefined ? "Unknown" : v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlateForm({ name, type, gap, exposure, onName, onType, onGap, onExposure, onSave, onCancel }: {
  name: string; type: string; gap: string; exposure: string;
  onName: (v: string) => void; onType: (v: string) => void;
  onGap: (v: string) => void; onExposure: (v: string) => void;
  onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-[#c9a050]/30 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Plate Name</label>
          <input value={name} onChange={(e) => onName(e.target.value)} placeholder="e.g. OC plate"
            className="w-full bg-[#242424] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <div className="flex gap-1">
            {["SB", "OC", "DC"].map((t) => (
              <button key={t} type="button" onClick={() => onType(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  type === t ? "bg-[#c9a050]/20 border-[#c9a050]/60 text-[#c9a050]" : "bg-[#242424] border-white/10 text-gray-400"
                }`}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Blade Gap (mm)</label>
          <input value={gap} onChange={(e) => onGap(e.target.value)} placeholder="0.00" type="number" step="0.01"
            className="w-full bg-[#242424] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Exposure (mm)</label>
          <input value={exposure} onChange={(e) => onExposure(e.target.value)} placeholder="0.00" type="number" step="0.01"
            className="w-full bg-[#242424] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onSave}
          className="flex-1 bg-[#c9a050] text-[#1a1a1a] rounded-lg py-2 text-sm font-semibold hover:bg-[#d4aa60] transition-colors">
          Save Plate
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:bg-white/10 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function NewItemForm({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Razor
  const [edgeType, setEdgeType] = useState<string>("");
  const [construction, setConstruction] = useState<string>("");
  const [bladeGap, setBladeGap] = useState("");
  const [exposure, setExposure] = useState("");
  const [weight, setWeight] = useState("");
  const [metal, setMetal] = useState<string>("");
  const [finish, setFinish] = useState<string>("");
  const [straightWidth, setStraightWidth] = useState<string>("");
  const [straightPoint, setStraightPoint] = useState<string>("");
  const [straightHollow, setStraightHollow] = useState<string>("");
  const [plates, setPlates] = useState<RazorPlate[]>([]);
  const [editingPlateIdx, setEditingPlateIdx] = useState<number | null>(null);
  const [plateFormName, setPlateFormName] = useState("");
  const [plateFormType, setPlateFormType] = useState("SB");
  const [plateFormGap, setPlateFormGap] = useState("");
  const [plateFormExposure, setPlateFormExposure] = useState("");

  // Blade
  const [bladeFormat, setBladeFormat] = useState<string>("");
  const [bladeCountryOfOrigin, setBladeCountryOfOrigin] = useState("");
  const [bladeCoating, setBladeCoating] = useState("");
  const [sharpness, setSharpness] = useState(0);

  // Brush
  const [knot, setKnot] = useState<string>("");
  const [diameter, setDiameter] = useState<string>("");

  // Soap
  const [soapDensity, setSoapDensity] = useState(0);
  const [soapCushion, setSoapCushion] = useState(0);
  const [soapSlickness, setSoapSlickness] = useState(0);
  const [soapStability, setSoapStability] = useState(0);
  const [soapScentStrength, setSoapScentStrength] = useState(0);
  const [soapHasMenthol, setSoapHasMenthol] = useState<boolean | undefined>(undefined);
  const [soapIsTallow, setSoapIsTallow] = useState<boolean | undefined>(undefined);

  // Razor handle
  const [handleModel, setHandleModel] = useState("");

  // Aftershave / EDP/EDT
  const [aftershaveScentStrength, setAftershaveScentStrength] = useState(0);
  const [edpedtScentStrength, setEdpedtScentStrength] = useState(0);

  // Preshave
  const [preshaveType, setPreshaveType] = useState<string>("");

  // Catalog picker
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);

  // Scent info (soap & aftershave)
  const [shaveSplashUrl, setShaveSplashUrl] = useState("");
  const [topNotes, setTopNotes] = useState("");
  const [heartNotes, setHeartNotes] = useState("");
  const [baseNotes, setBaseNotes] = useState("");
  const [scentDescription, setScentDescription] = useState("");
  const [inspiration, setInspiration] = useState("");
  const [scentFamily, setScentFamily] = useState("");
  const [familySubtype, setFamilySubtype] = useState("");

  const isRazor = categoryId === "razors";
  const isBlade = categoryId === "blades";
  const isBrush = categoryId === "brushes";
  const isSoap = categoryId === "soaps";
  const isAftershave = categoryId === "aftershaves";
  const isEdpEdt = categoryId === "edpedt";
  const isPreshave = categoryId === "preshaves";
  const isStraight = isRazor && edgeType === "Straight";

  const openAddPlate = () => {
    setPlateFormName(""); setPlateFormType("SB"); setPlateFormGap(""); setPlateFormExposure("");
    setEditingPlateIdx(-1);
  };
  const openEditPlate = (idx: number) => {
    const p = plates[idx];
    setPlateFormName(p.name); setPlateFormType(p.type);
    setPlateFormGap(p.bladeGap?.toString() ?? ""); setPlateFormExposure(p.exposure?.toString() ?? "");
    setEditingPlateIdx(idx);
  };
  const savePlate = () => {
    if (!plateFormName.trim()) return;
    const plate: RazorPlate = {
      name: plateFormName.trim(), type: plateFormType,
      ...(plateFormGap.trim() ? { bladeGap: parseFloat(plateFormGap) } : {}),
      ...(plateFormExposure.trim() ? { exposure: parseFloat(plateFormExposure) } : {}),
    };
    if (editingPlateIdx === -1) {
      setPlates((prev) => [...prev, plate]);
    } else if (editingPlateIdx !== null) {
      setPlates((prev) => prev.map((p, i) => i === editingPlateIdx ? plate : p));
    }
    setEditingPlateIdx(null);
  };
  const deletePlate = (idx: number) => setPlates((prev) => prev.filter((_, i) => i !== idx));

  const handleCatalogSelect = (entry: CatalogEntry) => {
    setBrand(entry.brandDisplay);
    setName(entry.productDisplay);
    const url = entry.urlPath.startsWith("http")
      ? entry.urlPath
      : `https://www.shavesplash.com${entry.urlPath}`;
    setShaveSplashUrl(url);
    if (entry.topNotes) setTopNotes(entry.topNotes);
    if (entry.heartNotes) setHeartNotes(entry.heartNotes);
    if (entry.baseNotes) setBaseNotes(entry.baseNotes);
    if (entry.description) setScentDescription(
      entry.description
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
        .replace(/\s+/g, " ").trim()
    );
    if (entry.inspiration) setInspiration(entry.inspiration);
    if (entry.scentFamily) setScentFamily(entry.scentFamily);
    if (entry.familySubtype) setFamilySubtype(entry.familySubtype);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    if (!brand.trim()) { setError("Brand is required"); return; }
    setError(null);
    setSaving(true);

    const data: Record<string, unknown> = {};
    if (isRazor) {
      if (edgeType) data.edgeType = edgeType;
      if (construction) data.construction = construction;
      if (bladeGap.trim()) data.bladeGap = parseFloat(bladeGap);
      if (exposure.trim()) data.exposure = parseFloat(exposure);
      if (weight.trim()) data.weight = parseInt(weight, 10);
      if (metal) data.metal = metal;
      if (finish) data.finish = finish;
      if (handleModel.trim()) data.handleModel = handleModel.trim();
      data.plates = plates;
      if (isStraight) {
        if (straightWidth) data.straightWidth = straightWidth;
        if (straightPoint) data.straightPoint = straightPoint;
        if (straightHollow) data.straightHollow = straightHollow;
      }
    }
    if (isBlade) {
      if (bladeFormat) data.bladeFormat = bladeFormat;
      if (bladeCountryOfOrigin.trim()) data.bladeCountryOfOrigin = bladeCountryOfOrigin.trim();
      if (bladeCoating.trim()) data.bladeCoating = bladeCoating.trim();
      if (sharpness > 0) data.sharpness = sharpness;
    }
    if (isBrush) {
      if (knot) data.knot = knot;
      if (diameter) data.diameter = diameter;
    }
    if (isSoap) {
      if (soapDensity > 0) data.soapDensity = soapDensity;
      if (soapCushion > 0) data.soapCushion = soapCushion;
      if (soapSlickness > 0) data.soapSlickness = soapSlickness;
      if (soapStability > 0) data.soapStability = soapStability;
      if (soapScentStrength > 0) data.soapScentStrength = soapScentStrength;
      if (soapHasMenthol !== undefined) data.soapHasMenthol = soapHasMenthol;
      if (soapIsTallow !== undefined) data.soapIsTallow = soapIsTallow;
    }
    if (isSoap || isAftershave) {
      if (shaveSplashUrl.trim()) data.shaveSplashUrl = shaveSplashUrl.trim();
      if (topNotes.trim()) data.topNotes = topNotes.trim();
      if (heartNotes.trim()) data.heartNotes = heartNotes.trim();
      if (baseNotes.trim()) data.baseNotes = baseNotes.trim();
      if (scentDescription.trim()) data.scentDescription = scentDescription.trim();
      if (inspiration.trim()) data.inspiration = inspiration.trim();
      if (scentFamily.trim()) data.scentFamily = scentFamily.trim();
      if (familySubtype.trim()) data.familySubtype = familySubtype.trim();
    }
    if (isAftershave && aftershaveScentStrength > 0) data.aftershaveScentStrength = aftershaveScentStrength;
    if (isEdpEdt && edpedtScentStrength > 0) data.edpedtScentStrength = edpedtScentStrength;
    if (isPreshave && preshaveType) data.preshaveType = preshaveType;

    try {
      const newId = crypto.randomUUID();
      await api.post("/api/inventory", {
        id: newId,
        categoryId,
        name: name.trim(),
        brand: brand.trim(),
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
        data,
      });
      router.push(`/den/${newId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  };

  const label = CATEGORY_LABELS[categoryId] ?? categoryId;
  const icon = CATEGORY_ICONS[categoryId] ?? "📦";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 w-full">
      {/* Back link */}
      <Link href="/den" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#c9a050] text-sm transition-colors mb-8">
        ← Back to Den
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-3xl">{icon}</span>
        <div>
          <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050]">
            Add {label}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">New item to your den</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Base fields */}
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-4">
          <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider mb-4">Details</h2>
          {(isSoap || isAftershave) && (
            <button
              type="button"
              onClick={() => setShowCatalogPicker(true)}
              className="w-full py-3 rounded-xl border border-[#c9a050]/40 bg-[#c9a050]/10 text-[#c9a050] text-sm font-semibold hover:bg-[#c9a050]/20 transition-colors"
            >
              📚 Browse ShaveSplash Catalog
            </button>
          )}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Brand <span className="text-red-400">*</span></label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Gillette"
              className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Name <span className="text-red-400">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. ${label} name`}
              className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes about this item..."
              className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Category-specific fields */}
        {isRazor && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Razor Specs</h2>
            <SelectField label="Edge Type" value={edgeType} options={EDGE_TYPE_OPTIONS} onChange={setEdgeType} />
            <SelectField label="Construction" value={construction} options={CONSTRUCTION_OPTIONS} onChange={setConstruction} />
            <SelectField label="Metal" value={metal} options={METAL_OPTIONS} onChange={setMetal} />
            <SelectField label="Finish" value={finish} options={FINISH_OPTIONS} onChange={setFinish} />
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Handle Model</label>
              <input value={handleModel} onChange={(e) => setHandleModel(e.target.value)} placeholder="e.g. Fatip Grande"
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Blade Gap (mm)</label>
                <input value={bladeGap} onChange={(e) => setBladeGap(e.target.value)} type="number" step="0.01" placeholder="0.00"
                  className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Exposure (mm)</label>
                <input value={exposure} onChange={(e) => setExposure(e.target.value)} type="number" step="0.01" placeholder="0.00"
                  className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Weight (g)</label>
                <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" placeholder="0"
                  className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
              </div>
            </div>
            {isStraight && (
              <>
                <SelectField label="Width" value={straightWidth} options={STRAIGHT_WIDTH_OPTIONS} onChange={setStraightWidth} />
                <SelectField label="Point" value={straightPoint} options={STRAIGHT_POINT_OPTIONS} onChange={setStraightPoint} />
                <SelectField label="Hollow" value={straightHollow} options={STRAIGHT_HOLLOW_OPTIONS} onChange={setStraightHollow} />
              </>
            )}

            {/* Plates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs text-gray-500 uppercase tracking-wider">Plates</label>
                {editingPlateIdx === null && (
                  <button type="button" onClick={openAddPlate}
                    className="text-xs text-[#c9a050] hover:text-[#d4aa60] transition-colors">
                    + Add Plate
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {plates.map((p, i) => (
                  editingPlateIdx === i ? (
                    <PlateForm key={i}
                      name={plateFormName} type={plateFormType} gap={plateFormGap} exposure={plateFormExposure}
                      onName={setPlateFormName} onType={setPlateFormType} onGap={setPlateFormGap} onExposure={setPlateFormExposure}
                      onSave={savePlate} onCancel={() => setEditingPlateIdx(null)} />
                  ) : (
                    <div key={i} className="flex items-center gap-2 text-sm bg-[#242424] rounded-lg px-3 py-2 border border-white/5">
                      <span className="text-[#c9a050] font-semibold w-8 text-center text-xs">{p.type}</span>
                      <span className="text-[#f5f2eb] flex-1">{p.name}</span>
                      {p.bladeGap != null && <span className="text-gray-500 text-xs">Gap: {p.bladeGap}mm</span>}
                      {p.exposure != null && <span className="text-gray-500 text-xs">Exp: {p.exposure}mm</span>}
                      <button type="button" onClick={() => openEditPlate(i)} className="text-gray-500 hover:text-[#c9a050] text-xs transition-colors">Edit</button>
                      <button type="button" onClick={() => deletePlate(i)} className="text-gray-500 hover:text-red-400 text-xs transition-colors">✕</button>
                    </div>
                  )
                ))}
                {editingPlateIdx === -1 && (
                  <PlateForm
                    name={plateFormName} type={plateFormType} gap={plateFormGap} exposure={plateFormExposure}
                    onName={setPlateFormName} onType={setPlateFormType} onGap={setPlateFormGap} onExposure={setPlateFormExposure}
                    onSave={savePlate} onCancel={() => setEditingPlateIdx(null)} />
                )}
              </div>
            </div>
          </div>
        )}

        {isBlade && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Blade Specs</h2>
            <SelectField label="Format" value={bladeFormat} options={BLADE_FORMAT_OPTIONS} onChange={setBladeFormat} />
            <RatingField label="Sharpness" value={sharpness} onChange={setSharpness} />
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Country of Origin</label>
              <input value={bladeCountryOfOrigin} onChange={(e) => setBladeCountryOfOrigin(e.target.value)} placeholder="e.g. Russia"
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Coating</label>
              <input value={bladeCoating} onChange={(e) => setBladeCoating(e.target.value)} placeholder="e.g. PTFE"
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
            </div>
          </div>
        )}

        {isBrush && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Brush Specs</h2>
            <SelectField label="Knot" value={knot} options={KNOT_OPTIONS} onChange={setKnot} />
            <SelectField label="Diameter" value={diameter} options={DIAMETER_OPTIONS} onChange={setDiameter} />
          </div>
        )}

        {isSoap && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Soap Ratings</h2>
            <RatingField label="Density" value={soapDensity} onChange={setSoapDensity} />
            <RatingField label="Cushion" value={soapCushion} onChange={setSoapCushion} />
            <RatingField label="Slickness" value={soapSlickness} onChange={setSoapSlickness} />
            <RatingField label="Stability" value={soapStability} onChange={setSoapStability} />
            <RatingField label="Scent Strength" value={soapScentStrength} onChange={setSoapScentStrength} />
            <ToggleField label="Menthol" value={soapHasMenthol} onChange={setSoapHasMenthol} />
            <ToggleField label="Tallow" value={soapIsTallow} onChange={setSoapIsTallow} />
          </div>
        )}

        {isAftershave && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Aftershave Ratings</h2>
            <RatingField label="Scent Strength" value={aftershaveScentStrength} onChange={setAftershaveScentStrength} />
          </div>
        )}

        {(isSoap || isAftershave) && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Scent Profile</h2>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">ShaveSplash URL <span className="normal-case text-gray-600">(optional)</span></label>
              <input value={shaveSplashUrl} onChange={(e) => setShaveSplashUrl(e.target.value)}
                placeholder={isSoap ? "https://www.shavesplash.com/soap-items/..." : "https://www.shavesplash.com/aftershave-items/..."}
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Scent Family</label>
              <input value={scentFamily} onChange={(e) => setScentFamily(e.target.value)} placeholder="e.g. Fougère, Citrus, Woody"
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Subtype</label>
              <input value={familySubtype} onChange={(e) => setFamilySubtype(e.target.value)} placeholder="e.g. Classic, Modern"
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Top Notes</label>
              <input value={topNotes} onChange={(e) => setTopNotes(e.target.value)} placeholder="e.g. Bergamot, Lemon"
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Heart Notes</label>
              <input value={heartNotes} onChange={(e) => setHeartNotes(e.target.value)} placeholder="e.g. Lavender, Geranium"
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Base Notes</label>
              <input value={baseNotes} onChange={(e) => setBaseNotes(e.target.value)} placeholder="e.g. Oakmoss, Musk"
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Scent Description</label>
              <textarea value={scentDescription} onChange={(e) => setScentDescription(e.target.value)} rows={3}
                placeholder="Describe the scent..."
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 resize-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Inspiration</label>
              <input value={inspiration} onChange={(e) => setInspiration(e.target.value)} placeholder="e.g. Classic barbershop"
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
            </div>
          </div>
        )}

        {isEdpEdt && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Fragrance Ratings</h2>
            <RatingField label="Scent Strength" value={edpedtScentStrength} onChange={setEdpedtScentStrength} />
          </div>
        )}

        {isPreshave && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Preshave Specs</h2>
            <SelectField label="Type" value={preshaveType} options={PRESHAVE_TYPE_OPTIONS} onChange={setPreshaveType} />
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-10">
          <Link href="/den"
            className="flex-1 text-center py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition-colors text-sm">
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#c9a050] text-[#1a1a1a] font-semibold text-sm hover:bg-[#d4aa60] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : `Add ${label}`}
          </button>
        </div>
      </div>

      {showCatalogPicker && (
        <CatalogPicker
          category={isSoap ? "soaps" : "aftershaves"}
          onSelect={handleCatalogSelect}
          onClose={() => setShowCatalogPicker(false)}
        />
      )}
    </div>
  );
}

function NewItemPageContent() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category") ?? "razors";
  return <NewItemForm categoryId={categoryId} />;
}

export default function NewItemPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AuthGuard>
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
          </div>
        }>
          <NewItemPageContent />
        </Suspense>
      </AuthGuard>
    </div>
  );
}
