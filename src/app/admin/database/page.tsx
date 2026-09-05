"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type GearSubmission = {
  id: string;
  categoryId: string;
  brand: string;
  name: string;
  data: Record<string, unknown>;
  hasPhoto: boolean;
  status: string;
  submittedBy: string;
  submittedByName: string | null;
  submittedByEmail: string | null;
  createdAt: string;
};

type GearEdit = {
  id: string;
  gearItemId: string;
  current: { brand: string; name: string; data: Record<string, unknown>; hasPhoto: boolean };
  proposed: { brand?: string; name?: string; data?: Record<string, unknown> };
  submittedBy: string;
  submittedByName: string | null;
  submittedByEmail: string | null;
  createdAt: string;
};

const EDGE_TYPE_OPTIONS = ["Double Edge", "GEM", "Injector", "AC", "SE", "Straight"] as const;
const CONSTRUCTION_OPTIONS = ["1pc", "2pc", "3pc", "4pc", "Adjustable"] as const;
const METAL_OPTIONS = ["Aluminum", "Brass", "Bronze", "Copper", "Steel", "Titanium", "Zamak"] as const;
const FINISH_OPTIONS = ["Machined", "Brushed", "Satin", "Polished", "Mirror Polished"] as const;
const KNOT_OPTIONS = ["Badger", "Boar", "Horse", "Mixed", "Synthetic"] as const;
const DIAMETER_OPTIONS = ["20mm","22mm","24mm","25mm","26mm","27mm","28mm","29mm","30mm","31mm","32mm"] as const;
const BLADE_FORMAT_OPTIONS = ["Double Edge", "GEM", "Injector", "AC", "SE"] as const;
const STRAIGHT_WIDTH_OPTIONS = ["4/8","5/8","6/8","7/8","8/8","11/16","13/16","15/16"] as const;
const STRAIGHT_POINT_OPTIONS = ["Round","Square","Spike","Barbers notch","French","Spanish"] as const;
const STRAIGHT_HOLLOW_OPTIONS = ["Extra Full","Full","1/2 hollow","1/4 hollow","Near Wedge","Wedge","Frameback","Faux frameback"] as const;
const PRESHAVE_TYPE_OPTIONS = ["Oil","Cream","Gel","Solid"] as const;
const PLATE_TYPE_OPTIONS = ["SB", "OC", "DC"] as const;
const SCENT_FAMILY_OPTIONS = ["Citrus","Floral","Fougère","Gourmand","Leather","Oriental","Woody","Aquatic","Chypre","Aromatic","Green","Spicy","Fresh","Tobacco","Musk"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  razors: "Razor", blades: "Blade", brushes: "Brush",
  soaps: "Soap", aftershaves: "Aftershave", balms: "Balm",
  preshaves: "Preshave", edpedt: "EDP/EDT", bowls: "Bowl",
};

// All fields per category, with display labels
const ALL_FIELDS: Record<string, { key: string; label: string }[]> = {
  razors: [
    { key: "edgeType", label: "Edge Type" },
    { key: "construction", label: "Construction" },
    { key: "metal", label: "Metal" },
    { key: "finish", label: "Finish" },
    { key: "bladeGap", label: "Blade Gap (mm)" },
    { key: "exposure", label: "Exposure (mm)" },
    { key: "weight", label: "Weight (g)" },
    { key: "plates", label: "Plates" },
    { key: "straightWidth", label: "Width" },
    { key: "straightPoint", label: "Point" },
    { key: "straightHollow", label: "Hollow" },
  ],
  blades: [
    { key: "bladeFormat", label: "Format" },
    { key: "bladeCountryOfOrigin", label: "Country of Origin" },
    { key: "bladeCoating", label: "Coating" },
    { key: "sharpness", label: "Sharpness" },
  ],
  brushes: [
    { key: "knot", label: "Knot" },
    { key: "diameter", label: "Diameter" },
  ],
  soaps: [
    { key: "soapDensity", label: "Density" },
    { key: "soapCushion", label: "Cushion" },
    { key: "soapSlickness", label: "Slickness" },
    { key: "soapStability", label: "Stability" },
    { key: "soapScentStrength", label: "Scent Strength" },
    { key: "soapHasMenthol", label: "Menthol" },
    { key: "soapIsTallow", label: "Base" },
    { key: "scentFamily", label: "Scent Family" },
    { key: "familySubtype", label: "Subtype" },
    { key: "topNotes", label: "Top Notes" },
    { key: "heartNotes", label: "Heart Notes" },
    { key: "baseNotes", label: "Base Notes" },
    { key: "ingredients", label: "Ingredients" },
    { key: "inspiration", label: "Inspiration" },
    { key: "size", label: "Size (oz)" },
  ],
  aftershaves: [
    { key: "aftershaveScentStrength", label: "Scent Strength" },
    { key: "scentFamily", label: "Scent Family" },
    { key: "familySubtype", label: "Subtype" },
    { key: "topNotes", label: "Top Notes" },
    { key: "heartNotes", label: "Heart Notes" },
    { key: "baseNotes", label: "Base Notes" },
    { key: "ingredients", label: "Ingredients" },
    { key: "inspiration", label: "Inspiration" },
    { key: "size", label: "Size (mL)" },
  ],
  balms: [
    { key: "ingredients", label: "Ingredients" },
    { key: "size", label: "Size (oz)" },
  ],
  preshaves: [
    { key: "preshaveType", label: "Type" },
    { key: "ingredients", label: "Ingredients" },
  ],
  edpedt: [
    { key: "edpedtScentStrength", label: "Scent Strength" },
    { key: "scentFamily", label: "Scent Family" },
    { key: "familySubtype", label: "Subtype" },
    { key: "topNotes", label: "Top Notes" },
    { key: "heartNotes", label: "Heart Notes" },
    { key: "baseNotes", label: "Base Notes" },
    { key: "ingredients", label: "Ingredients" },
    { key: "inspiration", label: "Inspiration" },
    { key: "size", label: "Size (mL)" },
  ],
  bowls: [
    { key: "bowlMaterial", label: "Material" },
    { key: "bowlDiameterIn", label: "Diameter (in)" },
    { key: "bowlDepthIn", label: "Depth (in)" },
    { key: "bowlWeightG", label: "Weight (g)" },
  ],
};

function formatValue(key: string, value: unknown): string {
  if (key === "soapHasMenthol") return value ? "Yes" : "No";
  if (key === "soapIsTallow") return value ? "Tallow" : "Vegan";
  if (key.endsWith("Strength") || key === "sharpness") return `${value}/10`;
  if (key === "plates" && Array.isArray(value)) {
    return (value as { name: string; type: string; bladeGap?: number; exposure?: number }[])
      .map((p) => {
        const details = [p.type, p.bladeGap != null && `${p.bladeGap}mm`, p.exposure != null && `${p.exposure}exp`].filter(Boolean).join(" ");
        return `${p.name}${details ? ` (${details})` : ""}`;
      })
      .join(", ");
  }
  return String(value);
}

function SubmitterBadge({ name, email }: { name: string | null; email: string | null }) {
  const display = name || email || "Unknown";
  const sub = name && email ? email : null;
  return (
    <div className="text-[11px] text-gray-500 leading-tight">
      <span className="font-medium text-gray-400">{display}</span>
      {sub && <span className="ml-1 text-gray-600">({sub})</span>}
    </div>
  );
}

// ─── Edit Field Helpers ───────────────────────────────────────────────────────

function EField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#161616] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-700 focus:outline-none focus:border-[#c9a050]/50" />
    </div>
  );
}

function ETextarea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
        className="w-full bg-[#161616] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-700 focus:outline-none focus:border-[#c9a050]/50 resize-none" />
    </div>
  );
}

function EPills({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => onChange(value === o ? "" : o)}
            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${value === o ? "bg-[#c9a050]/20 border-[#c9a050]/60 text-[#c9a050]" : "bg-[#161616] border-white/10 text-gray-400 hover:border-white/20"}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function EBool({ label, value, onChange }: {
  label: string; value: boolean | undefined; onChange: (v: boolean | undefined) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</label>
      <div className="flex gap-1.5">
        {([undefined, true, false] as const).map((v) => (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${value === v ? "bg-[#c9a050]/20 border-[#c9a050]/60 text-[#c9a050]" : "bg-[#161616] border-white/10 text-gray-400 hover:border-white/20"}`}>
            {v === undefined ? "Unknown" : v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

function EPlates({ plates, onChange }: {
  plates: { name: string; type: string; bladeGap: string; exposure: string }[];
  onChange: (p: { name: string; type: string; bladeGap: string; exposure: string }[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-gray-600 uppercase tracking-wider">Plates</label>
        <button type="button" onClick={() => onChange([...plates, { name: "", type: "SB", bladeGap: "", exposure: "" }])}
          className="text-[10px] text-[#c9a050] hover:text-[#d4aa60]">+ Add</button>
      </div>
      {plates.length === 0
        ? <p className="text-gray-700 text-xs italic">None</p>
        : <div className="space-y-2">
            {plates.map((p, i) => (
              <div key={i} className="bg-[#161616] border border-white/10 rounded-lg p-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <input value={p.name} onChange={(e) => onChange(plates.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    placeholder="Name" className="flex-1 bg-[#1e1e1e] border border-white/10 rounded px-2 py-1 text-xs text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50" />
                  <button type="button" onClick={() => onChange(plates.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400 text-sm">✕</button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {PLATE_TYPE_OPTIONS.map((t) => (
                      <button key={t} type="button" onClick={() => onChange(plates.map((x, j) => j === i ? { ...x, type: t } : x))}
                        className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${p.type === t ? "bg-[#c9a050]/20 border-[#c9a050]/60 text-[#c9a050]" : "bg-[#1e1e1e] border-white/10 text-gray-400"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <input type="number" step="0.01" value={p.bladeGap} onChange={(e) => onChange(plates.map((x, j) => j === i ? { ...x, bladeGap: e.target.value } : x))}
                    placeholder="Gap mm" className="w-16 bg-[#1e1e1e] border border-white/10 rounded px-2 py-0.5 text-xs text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50" />
                  <input type="number" step="0.01" value={p.exposure} onChange={(e) => onChange(plates.map((x, j) => j === i ? { ...x, exposure: e.target.value } : x))}
                    placeholder="Exp mm" className="w-16 bg-[#1e1e1e] border border-white/10 rounded px-2 py-0.5 text-xs text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50" />
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

function SubmissionEditForm({ categoryId, draftData, setField }: {
  categoryId: string;
  draftData: Record<string, unknown>;
  setField: (key: string, value: unknown) => void;
}) {
  const str = (k: string) => String(draftData[k] ?? "");
  const isStraight = categoryId === "razors" && draftData.edgeType === "Straight";

  const plates = (Array.isArray(draftData.plates)
    ? (draftData.plates as { name: string; type: string; bladeGap?: number; exposure?: number }[]).map((p) => ({
        name: p.name ?? "", type: p.type ?? "SB",
        bladeGap: p.bladeGap != null ? String(p.bladeGap) : "",
        exposure: p.exposure != null ? String(p.exposure) : "",
      }))
    : []) as { name: string; type: string; bladeGap: string; exposure: string }[];

  const savePlates = (rows: { name: string; type: string; bladeGap: string; exposure: string }[]) => {
    setField("plates", rows.filter((r) => r.name.trim()).map((r) => ({
      name: r.name.trim(), type: r.type || "SB",
      ...(r.bladeGap.trim() ? { bladeGap: parseFloat(r.bladeGap) } : {}),
      ...(r.exposure.trim() ? { exposure: parseFloat(r.exposure) } : {}),
    })));
  };

  if (categoryId === "razors") return (
    <div className="space-y-3">
      <EPills label="Edge Type" value={str("edgeType")} options={EDGE_TYPE_OPTIONS} onChange={(v) => setField("edgeType", v)} />
      <EPills label="Construction" value={str("construction")} options={CONSTRUCTION_OPTIONS} onChange={(v) => setField("construction", v)} />
      <EPills label="Metal" value={str("metal")} options={METAL_OPTIONS} onChange={(v) => setField("metal", v)} />
      <EPills label="Finish" value={str("finish")} options={FINISH_OPTIONS} onChange={(v) => setField("finish", v)} />
      <div className="grid grid-cols-3 gap-2">
        <EField label="Blade Gap (mm)" value={str("bladeGap")} onChange={(v) => setField("bladeGap", v ? parseFloat(v) : undefined)} type="number" />
        <EField label="Exposure (mm)" value={str("exposure")} onChange={(v) => setField("exposure", v ? parseFloat(v) : undefined)} type="number" />
        <EField label="Weight (g)" value={str("weight")} onChange={(v) => setField("weight", v ? parseInt(v) : undefined)} type="number" />
      </div>
      <EPlates plates={plates} onChange={savePlates} />
      {isStraight && <>
        <EPills label="Width" value={str("straightWidth")} options={STRAIGHT_WIDTH_OPTIONS} onChange={(v) => setField("straightWidth", v)} />
        <EPills label="Point" value={str("straightPoint")} options={STRAIGHT_POINT_OPTIONS} onChange={(v) => setField("straightPoint", v)} />
        <EPills label="Hollow" value={str("straightHollow")} options={STRAIGHT_HOLLOW_OPTIONS} onChange={(v) => setField("straightHollow", v)} />
      </>}
    </div>
  );

  if (categoryId === "blades") return (
    <div className="space-y-3">
      <EPills label="Format" value={str("bladeFormat")} options={BLADE_FORMAT_OPTIONS} onChange={(v) => setField("bladeFormat", v)} />
      <EField label="Country of Origin" value={str("bladeCountryOfOrigin")} onChange={(v) => setField("bladeCountryOfOrigin", v)} placeholder="e.g. Russia" />
      <EField label="Coating" value={str("bladeCoating")} onChange={(v) => setField("bladeCoating", v)} placeholder="e.g. PTFE" />
    </div>
  );

  if (categoryId === "brushes") return (
    <div className="space-y-3">
      <EPills label="Knot" value={str("knot")} options={KNOT_OPTIONS} onChange={(v) => setField("knot", v)} />
      <EPills label="Diameter" value={str("diameter")} options={DIAMETER_OPTIONS} onChange={(v) => setField("diameter", v)} />
    </div>
  );

  const scentFields = (
    <>
      <EPills label="Scent Family" value={str("scentFamily")} options={SCENT_FAMILY_OPTIONS} onChange={(v) => setField("scentFamily", v)} />
      <EField label="Subtype" value={str("familySubtype")} onChange={(v) => setField("familySubtype", v)} placeholder="e.g. Lavender" />
      <EField label="Top Notes" value={str("topNotes")} onChange={(v) => setField("topNotes", v)} />
      <EField label="Heart Notes" value={str("heartNotes")} onChange={(v) => setField("heartNotes", v)} />
      <EField label="Base Notes" value={str("baseNotes")} onChange={(v) => setField("baseNotes", v)} />
      <ETextarea label="Ingredients" value={str("ingredients")} onChange={(v) => setField("ingredients", v)} placeholder="Aqua, Stearic Acid…" />
      <EField label="Inspiration" value={str("inspiration")} onChange={(v) => setField("inspiration", v)} />
    </>
  );

  if (categoryId === "soaps") return (
    <div className="space-y-3">
      <EBool label="Menthol" value={draftData.soapHasMenthol as boolean | undefined} onChange={(v) => setField("soapHasMenthol", v)} />
      <EBool label="Tallow" value={draftData.soapIsTallow as boolean | undefined} onChange={(v) => setField("soapIsTallow", v)} />
      {scentFields}
      <EField label="Size (oz)" value={str("size")} onChange={(v) => setField("size", v ? parseFloat(v) : undefined)} type="number" />
    </div>
  );

  if (categoryId === "aftershaves") return (
    <div className="space-y-3">
      {scentFields}
      <EField label="Size (mL)" value={str("size")} onChange={(v) => setField("size", v ? parseFloat(v) : undefined)} type="number" />
    </div>
  );

  if (categoryId === "balms") return (
    <div className="space-y-3">
      <ETextarea label="Ingredients" value={str("ingredients")} onChange={(v) => setField("ingredients", v)} />
      <EField label="Size (oz)" value={str("size")} onChange={(v) => setField("size", v ? parseFloat(v) : undefined)} type="number" />
    </div>
  );

  if (categoryId === "preshaves") return (
    <div className="space-y-3">
      <EPills label="Type" value={str("preshaveType")} options={PRESHAVE_TYPE_OPTIONS} onChange={(v) => setField("preshaveType", v)} />
      <ETextarea label="Ingredients" value={str("ingredients")} onChange={(v) => setField("ingredients", v)} />
    </div>
  );

  if (categoryId === "edpedt") return (
    <div className="space-y-3">
      {scentFields}
      <EField label="Size (mL)" value={str("size")} onChange={(v) => setField("size", v ? parseFloat(v) : undefined)} type="number" />
    </div>
  );

  if (categoryId === "bowls") return (
    <div className="space-y-3">
      <EField label="Material" value={str("bowlMaterial")} onChange={(v) => setField("bowlMaterial", v)} placeholder="e.g. Ceramic" />
      <div className="grid grid-cols-3 gap-2">
        <EField label="Diameter (in)" value={str("bowlDiameterIn")} onChange={(v) => setField("bowlDiameterIn", v)} placeholder="e.g. 4.5" />
        <EField label="Depth (in)" value={str("bowlDepthIn")} onChange={(v) => setField("bowlDepthIn", v)} placeholder="e.g. 2.0" />
        <EField label="Weight (g)" value={str("bowlWeightG")} onChange={(v) => setField("bowlWeightG", v)} placeholder="e.g. 320" />
      </div>
    </div>
  );

  return null;
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function FullPhotoModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    api.get<{ photoUrl: string | null }>(`/api/admin/gear/${id}/photo`)
      .then((d) => setUrl(d.photoUrl)).catch(() => {});
  }, [id]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        {url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={url} alt="" className="w-full rounded-xl object-contain max-h-[80vh]" />
          : <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>
        }
      </div>
    </div>
  );
}

function SubmissionDetailModal({ item, onAction, onClose }: {
  item: GearSubmission;
  onAction: (action: "approve" | "reject" | "delete", reasons?: { incompleteData: boolean; noPhoto: boolean }) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | "delete" | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Committed (server-consistent) values — update after a successful save
  const [viewBrand, setViewBrand] = useState(item.brand);
  const [viewName, setViewName] = useState(item.name);
  const [viewData, setViewData] = useState<Record<string, unknown>>({ ...item.data });

  // Draft values — live while editing
  const [draftBrand, setDraftBrand] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftData, setDraftData] = useState<Record<string, unknown>>({});

  const startEdit = () => {
    setDraftBrand(viewBrand);
    setDraftName(viewName);
    setDraftData({ ...viewData });
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await api.patch(`/api/admin/gear/${item.id}`, {
        brand: draftBrand.trim(),
        name: draftName.trim(),
        data: draftData,
      });
      setViewBrand(draftBrand.trim());
      setViewName(draftName.trim());
      setViewData({ ...draftData });
      setEditing(false);
    } catch {
      setSaveError("Failed to save — check console");
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: string, value: unknown) =>
    setDraftData((prev) => ({ ...prev, [key]: value }));

  const handle = async (action: "approve" | "reject" | "delete", reasons?: { incompleteData: boolean; noPhoto: boolean }) => {
    setBusy(action);
    await onAction(action, reasons);
    onClose();
  };

  const fields = ALL_FIELDS[item.categoryId] ?? [];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
        <div className="bg-[#1e1e1e] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/10 max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5 shrink-0">
            <div className="flex-1 min-w-0">
              <span className="text-xs bg-[#c9a050]/10 text-[#c9a050] border border-[#c9a050]/20 rounded-full px-2 py-0.5">
                {CATEGORY_LABELS[item.categoryId] ?? item.categoryId}
              </span>
              <p className="text-[#f5f2eb] font-semibold mt-1.5 truncate">{viewBrand} — {viewName}</p>
              <div className="flex items-center gap-2 mt-1">
                <SubmitterBadge name={item.submittedByName} email={item.submittedByEmail} />
                <span className="text-gray-700 text-[10px]">· {new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4 shrink-0">
              {!editing && (
                <button onClick={startEdit}
                  className="text-xs text-[#c9a050] border border-[#c9a050]/30 rounded-lg px-2.5 py-1 hover:bg-[#c9a050]/10 transition-colors">
                  Edit
                </button>
              )}
              <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-xl leading-none">✕</button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-5 py-4">
            {/* Photo */}
            {item.hasPhoto && !editing && (
              <button onClick={() => setShowPhoto(true)}
                className="w-full aspect-video bg-[#161616] rounded-xl overflow-hidden block hover:opacity-90 transition-opacity mb-4">
                <PhotoThumbnail id={item.id} />
              </button>
            )}

            {editing ? (
              <div className="space-y-3">
                <EField label="Brand" value={draftBrand} onChange={setDraftBrand} placeholder="Brand" />
                <EField label="Name" value={draftName} onChange={setDraftName} placeholder="Name" />
                <div className="border-t border-white/5 pt-3">
                  <SubmissionEditForm categoryId={item.categoryId} draftData={draftData} setField={setField} />
                </div>
                {saveError && <p className="text-red-400 text-xs">{saveError}</p>}
              </div>
            ) : (
              <div className="space-y-0">
                {fields.map(({ key, label }) => {
                  const val = viewData[key];
                  const populated = val !== null && val !== undefined && val !== "" && val !== 0 && !(Array.isArray(val) && val.length === 0);
                  return (
                    <div key={key} className={`flex justify-between items-start gap-4 py-1.5 border-b border-white/5 last:border-0 ${populated ? "" : "opacity-30"}`}>
                      <span className="text-gray-500 text-sm shrink-0">{label}</span>
                      <span className={`text-sm text-right ${populated ? "text-[#f5f2eb]" : "text-gray-700 italic"}`}>
                        {populated ? formatValue(key, val) : "—"}
                      </span>
                    </div>
                  );
                })}
                {fields.length === 0 && (
                  <p className="text-gray-600 text-sm text-center py-4">No category-specific fields</p>
                )}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-5 pb-5 pt-3 border-t border-white/5 shrink-0 flex gap-2">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 bg-[#c9a050] text-black text-sm font-semibold rounded-xl hover:bg-[#d4aa60] transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={cancelEdit} disabled={saving}
                  className="px-4 py-2.5 border border-white/10 text-gray-500 text-sm rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={() => handle("approve")} disabled={!!busy}
                  className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-500 transition-colors disabled:opacity-50">
                  {busy === "approve" ? "Approving…" : "Approve"}
                </button>
                <button onClick={() => setShowRejectModal(true)} disabled={!!busy}
                  className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50">
                  {busy === "reject" ? "Rejecting…" : "Reject"}
                </button>
                <button onClick={() => handle("delete")} disabled={!!busy}
                  className="px-4 py-2.5 border border-white/10 text-gray-500 text-sm rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50">
                  {busy === "delete" ? "…" : "Delete"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {showPhoto && <FullPhotoModal id={item.id} onClose={() => setShowPhoto(false)} />}
      {showRejectModal && (
        <RejectReasonModal
          item={item}
          onConfirm={(reasons) => handle("reject", reasons)}
          onClose={() => setShowRejectModal(false)}
        />
      )}
    </>
  );
}

function PhotoThumbnail({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    api.get<{ photoUrl: string | null }>(`/api/admin/gear/${id}/photo`)
      .then((d) => setUrl(d.photoUrl)).catch(() => {});
  }, [id]);
  if (!url) return <div className="w-full h-full flex items-center justify-center"><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" onLoad={() => setLoaded(true)} className={`w-full h-full object-contain transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`} />;
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function fieldCompletion(categoryId: string, data: Record<string, unknown>) {
  const fields = ALL_FIELDS[categoryId] ?? [];
  if (!fields.length) return null;
  const filled = fields.filter(({ key }) => {
    const v = data[key];
    return v !== null && v !== undefined && v !== "" && v !== 0;
  }).length;
  return { filled, total: fields.length, pct: Math.round(filled / fields.length * 100) };
}

function RejectReasonModal({ item, onConfirm, onClose }: {
  item: GearSubmission;
  onConfirm: (reasons: { incompleteData: boolean; noPhoto: boolean }) => Promise<void>;
  onClose: () => void;
}) {
  const [incompleteData, setIncompleteData] = useState(false);
  const [noPhoto, setNoPhoto] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    await onConfirm({ incompleteData, noPhoto });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[#f5f2eb] font-semibold text-base mb-1">Reject Submission</h3>
        <p className="text-gray-500 text-xs mb-5">{item.brand} — {item.name}</p>
        <p className="text-gray-400 text-xs mb-4">Select reason(s) to include in the rejection email to the submitter:</p>
        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={incompleteData} onChange={(e) => setIncompleteData(e.target.checked)} className="w-4 h-4 accent-[#c9a050]" />
            <span className="text-sm text-[#f5f2eb]">Incomplete data</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={noPhoto} onChange={(e) => setNoPhoto(e.target.checked)} className="w-4 h-4 accent-[#c9a050]" />
            <span className="text-sm text-[#f5f2eb]">No photo</span>
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} disabled={busy} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-colors disabled:opacity-40">
            Cancel
          </button>
          <button onClick={confirm} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors disabled:opacity-40">
            {busy ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmissionCard({ item, onAction, isSelected, onToggle }: {
  item: GearSubmission;
  onAction: (id: string, action: "approve" | "reject" | "delete", reasons?: { incompleteData: boolean; noPhoto: boolean }) => Promise<void>;
  isSelected?: boolean;
  onToggle?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [busy, setBusy] = useState<"approve" | "reject" | "delete" | null>(null);
  const [done, setDone] = useState(false);

  const handle = async (action: "approve" | "reject" | "delete", reasons?: { incompleteData: boolean; noPhoto: boolean }) => {
    setBusy(action);
    await onAction(item.id, action, reasons);
    setBusy(null);
    setDone(true);
  };

  if (done) return null;

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-4 cursor-pointer hover:border-white/15 transition-colors"
      >
        <div className="flex items-start gap-3">
          {item.hasPhoto && (
            <div className="w-14 aspect-square rounded-lg overflow-hidden bg-[#242424] shrink-0">
              <PhotoThumbnail id={item.id} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs bg-[#c9a050]/10 text-[#c9a050] border border-[#c9a050]/20 rounded-full px-2 py-0.5">
                {CATEGORY_LABELS[item.categoryId] ?? item.categoryId}
              </span>
              <span className="text-[10px] text-gray-600">{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-[#f5f2eb] font-semibold text-sm">{item.brand} — {item.name}</p>
            <SubmitterBadge name={item.submittedByName} email={item.submittedByEmail} />
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {(() => {
                const fc = fieldCompletion(item.categoryId, item.data);
                const pct = fc?.pct ?? 0;
                const color = pct >= 75 ? "text-green-400 border-green-500/30 bg-green-500/10"
                  : pct >= 25 ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                  : "text-red-400 border-red-500/30 bg-red-500/10";
                return fc ? (
                  <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${color}`}>
                    {fc.filled}/{fc.total} fields
                  </span>
                ) : null;
              })()}
              <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${item.hasPhoto ? "text-green-400 border-green-500/30 bg-green-500/10" : "text-gray-500 border-white/10 bg-white/5"}`}>
                {item.hasPhoto ? "Photo ✓" : "No photo"}
              </span>

            </div>
            <p className="text-[10px] text-gray-600 mt-1.5">Click to view all fields →</p>
          </div>
          {onToggle && (
            <input
              type="checkbox"
              checked={isSelected ?? false}
              onChange={() => {}}
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="w-4 h-4 mt-0.5 accent-[#c9a050] shrink-0 cursor-pointer"
            />
          )}
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handle("approve")} disabled={!!busy}
            className="px-4 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50">
            {busy === "approve" ? "Approving…" : "Approve"}
          </button>
          <button onClick={() => setShowRejectModal(true)} disabled={!!busy}
            className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50">
            {busy === "reject" ? "Rejecting…" : "Reject"}
          </button>
          <button onClick={() => handle("delete")} disabled={!!busy}
            className="px-4 py-1.5 border border-white/10 text-gray-500 text-xs rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50 ml-auto">
            {busy === "delete" ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {open && (
        <SubmissionDetailModal item={item} onAction={handle} onClose={() => setOpen(false)} />
      )}
      {showRejectModal && (
        <RejectReasonModal
          item={item}
          onConfirm={(reasons) => handle("reject", reasons)}
          onClose={() => setShowRejectModal(false)}
        />
      )}
    </>
  );
}

function EditCard({ edit, onAction }: {
  edit: GearEdit;
  onAction: (id: string, action: "approve" | "reject") => Promise<void>;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState(false);

  const handle = async (action: "approve" | "reject") => {
    setBusy(action);
    await onAction(edit.id, action);
    setDone(true);
  };

  if (done) return null;

  const { brand, name, data } = edit.proposed;

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-5">
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5">Edit Proposal</span>
          <span className="text-[10px] text-gray-600">{new Date(edit.createdAt).toLocaleDateString()}</span>
        </div>
        <p className="text-gray-500 text-sm">
          Editing: <span className="text-[#f5f2eb] font-medium">{edit.current.brand} — {edit.current.name}</span>
        </p>
        <SubmitterBadge name={edit.submittedByName} email={edit.submittedByEmail} />
      </div>
      <div className="space-y-1 mt-2">
        {brand && <p className="text-xs"><span className="text-gray-600">Brand → </span><span className="text-[#f5f2eb]">{brand}</span></p>}
        {name && <p className="text-xs"><span className="text-gray-600">Name → </span><span className="text-[#f5f2eb]">{name}</span></p>}
        {data && Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== 0).map(([k, v]) => (
          <p key={k} className="text-xs"><span className="text-gray-600">{k} → </span><span className="text-[#f5f2eb]">{String(v)}</span></p>
        ))}
      </div>
      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
        <button onClick={() => handle("approve")} disabled={!!busy}
          className="flex-1 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50">
          {busy === "approve" ? "Approving…" : "Approve"}
        </button>
        <button onClick={() => handle("reject")} disabled={!!busy}
          className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50">
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDatabasePage() {
  const [submissions, setSubmissions] = useState<GearSubmission[]>([]);
  const [edits, setEdits] = useState<GearEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchApproving, setBatchApproving] = useState(false);
  const [batchRejecting, setBatchRejecting] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<{ submissions: GearSubmission[]; edits: GearEdit[] }>("/api/admin/gear")
      .then((d) => { setSubmissions(d.submissions); setEdits(d.edits); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmission = async (id: string, action: "approve" | "reject" | "delete", reasons?: { incompleteData: boolean; noPhoto: boolean }) => {
    if (action === "delete") {
      await api.delete(`/api/admin/gear/${id}`);
    } else {
      await api.post(`/api/admin/gear/${id}/${action}`, reasons ?? {});
    }
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const allSelected = submissions.length > 0 && submissions.every((s) => selected.has(s.id));

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(submissions.map((s) => s.id)));
  };

  const handleBatchApprove = async () => {
    if (!selected.size || batchApproving) return;
    setBatchApproving(true);
    await Promise.all([...selected].map((id) => handleSubmission(id, "approve")));
    setSelected(new Set());
    setBatchApproving(false);
  };

  const handleBatchReject = async () => {
    if (!selected.size || batchRejecting) return;
    setBatchRejecting(true);
    await Promise.all([...selected].map((id) => handleSubmission(id, "reject")));
    setSelected(new Set());
    setBatchRejecting(false);
  };

  const handleEdit = async (id: string, action: "approve" | "reject") => {
    await api.post(`/api/admin/gear/edits/${id}/${action}`, {});
    setEdits((prev) => prev.filter((e) => e.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  const total = submissions.length + edits.length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{total} item{total !== 1 ? "s" : ""} pending review</p>
        <button onClick={load} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Refresh</button>
      </div>

      {submissions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">
              New Submissions ({submissions.length})
            </h2>
            <div className="flex items-center gap-3">
              <button onClick={toggleAll} className="text-xs text-[#c9a050] hover:text-[#b8903f] transition-colors">
                {allSelected ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={handleBatchReject}
                disabled={selected.size === 0 || batchRejecting}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-40"
              >
                {batchRejecting ? "Rejecting…" : `Reject Selected (${selected.size})`}
              </button>
              <button
                onClick={handleBatchApprove}
                disabled={selected.size === 0 || batchApproving}
                className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-500 transition-colors disabled:opacity-40"
              >
                {batchApproving ? "Approving…" : `Approve Selected (${selected.size})`}
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {submissions.map((s) => (
              <SubmissionCard key={s.id} item={s} onAction={handleSubmission} isSelected={selected.has(s.id)} onToggle={() => toggleSelected(s.id)} />
            ))}
          </div>
        </section>
      )}

      {edits.length > 0 && (
        <section>
          <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider mb-4">
            Edit Proposals ({edits.length})
          </h2>
          <div className="space-y-3">
            {edits.map((e) => (
              <EditCard key={e.id} edit={e} onAction={handleEdit} />
            ))}
          </div>
        </section>
      )}

      {total === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-600">Nothing pending review.</p>
        </div>
      )}
    </div>
  );
}
