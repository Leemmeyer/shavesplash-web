"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

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

const CATEGORY_OPTIONS = [
  { id: "razors", label: "Razor", icon: "🪒" },
  { id: "blades", label: "Blade", icon: "⚡" },
  { id: "brushes", label: "Brush", icon: "🖌️" },
  { id: "soaps", label: "Shave Soap", icon: "🫧" },
  { id: "aftershaves", label: "Aftershave", icon: "💧" },
  { id: "balms", label: "Balm", icon: "🧴" },
  { id: "preshaves", label: "Preshave", icon: "✨" },
  { id: "edpedt", label: "EDP/EDT", icon: "🌸" },
];

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => onChange(value === o ? "" : o)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${value === o ? "bg-[#c9a050]/20 border-[#c9a050]/60 text-[#c9a050]" : "bg-[#242424] border-white/10 text-gray-400 hover:border-white/20"}`}>
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
          <button key={n} type="button" onClick={() => onChange(value === n ? 0 : n)}
            className={`w-7 h-7 rounded text-xs font-medium transition-colors ${n <= value ? "bg-[#c9a050] text-[#1a1a1a]" : "bg-[#242424] border border-white/10 text-gray-600"}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function SubmitForm({ defaultCategory, fromDenId }: { defaultCategory: string; fromDenId?: string | null }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(defaultCategory || "razors");
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [prefilling, setPrefilling] = useState(!!fromDenId);
  const [duplicates, setDuplicates] = useState<{ id: string; brand: string; name: string }[]>([]);
  const dupeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Razor
  const [edgeType, setEdgeType] = useState("");
  const [construction, setConstruction] = useState("");
  const [bladeGap, setBladeGap] = useState("");
  const [exposure, setExposure] = useState("");
  const [weight, setWeight] = useState("");
  const [metal, setMetal] = useState("");
  const [finish, setFinish] = useState("");
  const [straightWidth, setStraightWidth] = useState("");
  const [straightPoint, setStraightPoint] = useState("");
  const [straightHollow, setStraightHollow] = useState("");
  // Blade
  const [bladeFormat, setBladeFormat] = useState("");
  const [bladeCountryOfOrigin, setBladeCountryOfOrigin] = useState("");
  const [bladeCoating, setBladeCoating] = useState("");
  // Brush
  const [knot, setKnot] = useState("");
  const [diameter, setDiameter] = useState("");
  // Soap
  const [soapHasMenthol, setSoapHasMenthol] = useState<boolean | undefined>();
  const [soapIsTallow, setSoapIsTallow] = useState<boolean | undefined>();
  // Scent
  const [topNotes, setTopNotes] = useState("");
  const [heartNotes, setHeartNotes] = useState("");
  const [baseNotes, setBaseNotes] = useState("");
  const [scentFamily, setScentFamily] = useState("");
  const [familySubtype, setFamilySubtype] = useState("");
  const [inspiration, setInspiration] = useState("");
  // Preshave
  const [preshaveType, setPreshaveType] = useState("");
  // Size
  const [size, setSize] = useState("");

  // Pre-fill from a Den item when ?from= is present
  useEffect(() => {
    if (!fromDenId) return;
    api.get<{ items: Record<string, unknown>[] }>("/api/inventory")
      .then((d) => {
        const item = d.items.find((i) => i.id === fromDenId) as Record<string, unknown> | undefined;
        if (!item) return;
        if (item.categoryId) setCategoryId(item.categoryId as string);
        if (item.brand) setBrand(item.brand as string);
        if (item.name) setName(item.name as string);
        if (item.edgeType) setEdgeType(item.edgeType as string);
        if (item.construction) setConstruction(item.construction as string);
        if (item.bladeGap != null) setBladeGap(String(item.bladeGap));
        if (item.exposure != null) setExposure(String(item.exposure));
        if (item.weight != null) setWeight(String(item.weight));
        if (item.metal) setMetal(item.metal as string);
        if (item.finish) setFinish(item.finish as string);
        if (item.straightWidth) setStraightWidth(item.straightWidth as string);
        if (item.straightPoint) setStraightPoint(item.straightPoint as string);
        if (item.straightHollow) setStraightHollow(item.straightHollow as string);
        if (item.bladeFormat) setBladeFormat(item.bladeFormat as string);
        if (item.bladeCountryOfOrigin) setBladeCountryOfOrigin(item.bladeCountryOfOrigin as string);
        if (item.bladeCoating) setBladeCoating(item.bladeCoating as string);
        if (item.knot) setKnot(item.knot as string);
        if (item.diameter) setDiameter(item.diameter as string);
        if (item.soapHasMenthol != null) setSoapHasMenthol(item.soapHasMenthol as boolean);
        if (item.soapIsTallow != null) setSoapIsTallow(item.soapIsTallow as boolean);
        if (item.topNotes) setTopNotes(item.topNotes as string);
        if (item.heartNotes) setHeartNotes(item.heartNotes as string);
        if (item.baseNotes) setBaseNotes(item.baseNotes as string);
        if (item.scentFamily) setScentFamily(item.scentFamily as string);
        if (item.familySubtype) setFamilySubtype(item.familySubtype as string);
        if (item.inspiration) setInspiration(item.inspiration as string);
        if (item.preshaveType) setPreshaveType(item.preshaveType as string);
        if (item.size != null) setSize(String(item.size));
        if (item.hasPhoto) {
          api.get<{ photoUrl: string | null }>(`/api/inventory/${fromDenId}/photo`)
            .then((p) => { if (p.photoUrl) setPhotoPreview(p.photoUrl); })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setPrefilling(false));
  }, [fromDenId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced duplicate check
  useEffect(() => {
    const b = brand.trim();
    const n = name.trim();
    if (!b || !n) { setDuplicates([]); return; }
    if (dupeTimer.current) clearTimeout(dupeTimer.current);
    dupeTimer.current = setTimeout(async () => {
      try {
        const { items } = await api.get<{ items: { id: string; brand: string; name: string; categoryId: string }[] }>(
          `/api/gear?q=${encodeURIComponent(b + " " + n)}&category=${categoryId}`
        );
        const matches = items.filter(
          (i) => i.brand.toLowerCase() === b.toLowerCase() && i.name.toLowerCase() === n.toLowerCase()
        );
        setDuplicates(matches);
      } catch { setDuplicates([]); }
    }, 600);
    return () => { if (dupeTimer.current) clearTimeout(dupeTimer.current); };
  }, [brand, name, categoryId]);

  const isRazor = categoryId === "razors";
  const isBlade = categoryId === "blades";
  const isBrush = categoryId === "brushes";
  const isSoap = categoryId === "soaps";
  const isAftershave = categoryId === "aftershaves";
  const isEdpEdt = categoryId === "edpedt";
  const isPreshave = categoryId === "preshaves";
  const isBalm = categoryId === "balms";
  const hasSize = isSoap || isAftershave || isEdpEdt || isBalm;
  const sizeUnit = (isSoap || isBalm) ? "oz" : "mL";
  const isStraight = isRazor && edgeType === "Straight";
  const hasScent = isSoap || isAftershave;

  const handleSubmit = async () => {
    if (!brand.trim()) { setError("Brand is required"); return; }
    if (!name.trim()) { setError("Name is required"); return; }
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
    }
    if (isBrush) {
      if (knot) data.knot = knot;
      if (diameter) data.diameter = diameter;
    }
    if (isSoap) {
      if (soapHasMenthol !== undefined) data.soapHasMenthol = soapHasMenthol;
      if (soapIsTallow !== undefined) data.soapIsTallow = soapIsTallow;
    }
    if (hasScent) {
      if (topNotes.trim()) data.topNotes = topNotes.trim();
      if (heartNotes.trim()) data.heartNotes = heartNotes.trim();
      if (baseNotes.trim()) data.baseNotes = baseNotes.trim();
      if (scentFamily.trim()) data.scentFamily = scentFamily.trim();
      if (familySubtype.trim()) data.familySubtype = familySubtype.trim();
      if (inspiration.trim()) data.inspiration = inspiration.trim();
    }
    if (isPreshave && preshaveType) data.preshaveType = preshaveType;
    if (hasSize && size.trim()) data.size = parseFloat(size);

    try {
      const { id } = await api.post<{ id: string }>("/api/gear", { categoryId, brand: brand.trim(), name: name.trim(), data });
      if (photoPreview) {
        await api.post(`/api/gear/${id}/photo`, { data: photoPreview });
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  if (prefilling) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading item from your Den…</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-[#f5f2eb] text-xl font-bold mb-2">Submitted for Review</h2>
        <p className="text-gray-500 text-sm mb-8">An admin will review your submission. Approved items appear in the Gear Database.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setDone(false); setBrand(""); setName(""); setPhotoPreview(null); }}
            className="px-5 py-2.5 border border-white/10 rounded-xl text-gray-400 text-sm hover:bg-white/5 transition-colors">
            Submit Another
          </button>
          <Link href="/database" className="px-5 py-2.5 bg-[#c9a050] text-black rounded-xl text-sm font-semibold hover:bg-[#d4aa60] transition-colors">
            Back to Database
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 w-full">
      <Link href="/database" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#c9a050] text-sm transition-colors mb-8">
        ← Back to Database
      </Link>

      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050]">Submit Gear Item</h1>
        <p className="text-gray-500 text-sm mt-1">Contributions are reviewed before appearing in the database.</p>
        {fromDenId && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#c9a050] bg-[#c9a050]/10 border border-[#c9a050]/20 rounded-xl px-3 py-2">
            <span>📦</span>
            <span>Pre-filled from your Den — review and edit before submitting.</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Category */}
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6">
          <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider mb-4">Category</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${categoryId === cat.id ? "bg-[#c9a050]/20 border-[#c9a050]/60 text-[#c9a050]" : "bg-[#242424] border-white/10 text-gray-400 hover:border-white/20"}`}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Base fields */}
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-4">
          <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider mb-4">Details</h2>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Brand <span className="text-red-400">*</span></label>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Wolfman Razors"
              className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Name <span className="text-red-400">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. WR2 1.05 OC"
              className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 transition-colors" />
          </div>
          {/* Duplicate warning */}
          {duplicates.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-yellow-400 text-sm font-semibold">⚠️ This item may already exist in the database:</p>
              {duplicates.map((d) => (
                <Link key={d.id} href="/database" className="block text-yellow-300/80 text-sm hover:text-yellow-300 underline underline-offset-2">
                  {d.brand} — {d.name}
                </Link>
              ))}
              <p className="text-yellow-500/60 text-xs pt-0.5">You can still submit if this is a different version or variant.</p>
            </div>
          )}

          {/* Photo */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Photo (optional)</label>
            <div className="flex items-center gap-3">
              {photoPreview ? (
                <div className="relative w-20 aspect-square shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button type="button" onClick={() => setPhotoPreview(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">✕</button>
                </div>
              ) : (
                <label className="w-20 aspect-square bg-[#242424] border border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:border-white/20 transition-colors shrink-0">
                  <span className="text-gray-600 text-xs text-center leading-tight">Add<br/>Photo</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                        setError('Please use JPEG, PNG, or WEBP.'); return;
                      }
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
              <p className="text-gray-600 text-xs">JPEG, PNG, or WEBP. Max 800px.</p>
            </div>
          </div>
        </div>

        {/* Razor specs */}
        {isRazor && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Razor Specs</h2>
            <SelectField label="Edge Type" value={edgeType} options={EDGE_TYPE_OPTIONS} onChange={setEdgeType} />
            <SelectField label="Construction" value={construction} options={CONSTRUCTION_OPTIONS} onChange={setConstruction} />
            <SelectField label="Metal" value={metal} options={METAL_OPTIONS} onChange={setMetal} />
            <SelectField label="Finish" value={finish} options={FINISH_OPTIONS} onChange={setFinish} />
            <div className="grid grid-cols-3 gap-3">
              {[["Blade Gap (mm)", bladeGap, setBladeGap], ["Exposure (mm)", exposure, setExposure], ["Weight (g)", weight, setWeight]].map(([label, val, set]) => (
                <div key={String(label)}>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">{label as string}</label>
                  <input value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} type="number" step="0.01" placeholder="0"
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
                </div>
              ))}
            </div>
            {isStraight && (
              <>
                <SelectField label="Width" value={straightWidth} options={STRAIGHT_WIDTH_OPTIONS} onChange={setStraightWidth} />
                <SelectField label="Point" value={straightPoint} options={STRAIGHT_POINT_OPTIONS} onChange={setStraightPoint} />
                <SelectField label="Hollow" value={straightHollow} options={STRAIGHT_HOLLOW_OPTIONS} onChange={setStraightHollow} />
              </>
            )}
          </div>
        )}

        {/* Blade specs */}
        {isBlade && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Blade Specs</h2>
            <SelectField label="Format" value={bladeFormat} options={BLADE_FORMAT_OPTIONS} onChange={setBladeFormat} />
            <div className="grid grid-cols-2 gap-3">
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
          </div>
        )}

        {/* Brush specs */}
        {isBrush && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Brush Specs</h2>
            <SelectField label="Knot" value={knot} options={KNOT_OPTIONS} onChange={setKnot} />
            <SelectField label="Diameter" value={diameter} options={DIAMETER_OPTIONS} onChange={setDiameter} />
          </div>
        )}

        {/* Soap specs */}
        {isSoap && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Soap Specs</h2>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Menthol</label>
              <div className="flex gap-2">
                {([undefined, true, false] as const).map((v) => (
                  <button key={String(v)} type="button" onClick={() => setSoapHasMenthol(v)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${soapHasMenthol === v ? "bg-[#c9a050]/20 border-[#c9a050]/60 text-[#c9a050]" : "bg-[#242424] border-white/10 text-gray-400"}`}>
                    {v === undefined ? "Unknown" : v ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Tallow</label>
              <div className="flex gap-2">
                {([undefined, true, false] as const).map((v) => (
                  <button key={String(v)} type="button" onClick={() => setSoapIsTallow(v)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${soapIsTallow === v ? "bg-[#c9a050]/20 border-[#c9a050]/60 text-[#c9a050]" : "bg-[#242424] border-white/10 text-gray-400"}`}>
                    {v === undefined ? "Unknown" : v ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}



        {/* Scent profile */}
        {hasScent && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-4">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Scent Profile</h2>
            {[["Scent Family", scentFamily, setScentFamily], ["Subtype", familySubtype, setFamilySubtype],
              ["Top Notes", topNotes, setTopNotes], ["Heart Notes", heartNotes, setHeartNotes],
              ["Base Notes", baseNotes, setBaseNotes], ["Inspiration", inspiration, setInspiration]].map(([label, val, set]) => (
              <div key={String(label)}>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">{label as string}</label>
                <input value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)}
                  className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 transition-colors" />
              </div>
            ))}
          </div>
        )}

        {/* Preshave */}
        {isPreshave && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider">Preshave Specs</h2>
            <SelectField label="Type" value={preshaveType} options={PRESHAVE_TYPE_OPTIONS} onChange={setPreshaveType} />
          </div>
        )}

        {/* Size */}
        {hasSize && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6">
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Size ({sizeUnit}) <span className="normal-case text-gray-600">(optional)</span></label>
            <input value={size} onChange={(e) => setSize(e.target.value)} type="number" step="0.1" min="0"
              placeholder={sizeUnit === "oz" ? "e.g. 4" : "e.g. 100"}
              className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 transition-colors" />
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pb-10">
          <Link href="/database" className="flex-1 text-center py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition-colors text-sm">
            Cancel
          </Link>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#c9a050] text-[#1a1a1a] font-semibold text-sm hover:bg-[#d4aa60] transition-colors disabled:opacity-50">
            {saving ? "Submitting…" : "Submit for Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmitPageContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  return <SubmitForm defaultCategory={searchParams.get("category") ?? "razors"} fromDenId={from} />;
}

export default function SubmitPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AuthGuard>
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" /></div>}>
          <SubmitPageContent />
        </Suspense>
      </AuthGuard>
    </div>
  );
}
