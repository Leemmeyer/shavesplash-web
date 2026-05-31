"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

// Mirrored from mobile shave-store
const EDGE_TYPE_OPTIONS = ["Double Edge", "GEM", "Injector", "AC", "SE", "Straight"] as const;
const EDGE_TYPE_LABELS: Record<string, string> = {
  "Double Edge": "DE", "GEM": "GEM", "Injector": "Injector", "AC": "AC", "SE": "SE", "Straight": "Straight",
};
const CONSTRUCTION_OPTIONS = ["1pc", "2pc", "3pc", "4pc", "Adjustable"] as const;
const METAL_OPTIONS = ["Aluminum", "Brass", "Bronze", "Copper", "Steel", "Titanium", "Zamak"] as const;
const FINISH_OPTIONS = ["Machined", "Brushed", "Satin", "Polished", "Mirror Polished"] as const;
const KNOT_OPTIONS = ["Badger", "Boar", "Horse", "Mixed", "Synthetic"] as const;
const DIAMETER_OPTIONS = [
  "16mm","17mm","18mm","19mm","20mm","22mm","24mm","25mm","26mm","27mm","28mm","29mm",
  "30mm","31mm","32mm","33mm","34mm","35mm","36mm","37mm","38mm","39mm","40mm",
] as const;
const BLADE_FORMAT_OPTIONS = ["Double Edge", "GEM", "Injector", "AC", "SE"] as const;
const BLADE_FORMAT_LABELS: Record<string, string> = {
  "Double Edge": "DE", "GEM": "GEM", "Injector": "Injector", "AC": "AC", "SE": "SE",
};
const STRAIGHT_WIDTH_OPTIONS = ["4/8", "5/8", "6/8", "7/8", "8/8", "11/16", "13/16", "15/16"] as const;
const STRAIGHT_POINT_OPTIONS = ["Round", "Square", "Spike", "Barbers notch", "French", "Spanish"] as const;
const STRAIGHT_HOLLOW_OPTIONS = ["Extra Full", "Full", "1/2 hollow", "1/4 hollow", "Near Wedge", "Wedge", "Frameback", "Faux frameback"] as const;
const PRESHAVE_TYPE_OPTIONS = ["Oil", "Cream", "Gel", "Solid"] as const;

const CATEGORY_ICONS: Record<string, string> = {
  razors: "🪒", blades: "⚡", brushes: "🖌️", soaps: "🫧",
  aftershaves: "💧", balms: "🧴", preshaves: "✨", edpedt: "🌸",
};
const CATEGORY_LABELS: Record<string, string> = {
  razors: "Razors", blades: "Blades", brushes: "Brushes", soaps: "Soaps",
  aftershaves: "Aftershaves", balms: "Balms", preshaves: "Preshaves", edpedt: "EDP/EDT",
};
const BST_CATEGORY_MAP: Record<string, string> = {
  razors: "razor", brushes: "brush", soaps: "soap", aftershaves: "aftershave",
};
const BST_CONDITIONS = ["New", "Mint", "Excellent", "Good", "Fair"];

type RazorPlate = { name: string; type: string; bladeGap?: number; exposure?: number };

type InventoryItem = {
  id: string; categoryId: string; name: string; brand: string;
  notes?: string; photoUrl?: string; createdAt: number;
  // Razor
  edgeType?: string; construction?: string; metal?: string; finish?: string;
  weight?: number; bladeGap?: number; exposure?: number; plates?: RazorPlate[];
  handleModel?: string;
  straightWidth?: string; straightPoint?: string; straightHollow?: string;
  // Blade
  bladeFormat?: string; bladeCountryOfOrigin?: string; bladeCoating?: string;
  bladeBrand?: string; bladeModel?: string; sharpness?: number;
  // Brush
  knot?: string; diameter?: string;
  // Soap
  soapDensity?: number; soapCushion?: number; soapSlickness?: number;
  soapStability?: number; soapScentStrength?: number;
  soapHasMenthol?: boolean; soapIsTallow?: boolean; shaveSplashUrl?: string;
  // Aftershave
  aftershaveScentStrength?: number;
  // EDP/EDT
  edpedtScentStrength?: number;
  // Preshave
  preshaveType?: string;
  // Scent info (soap & aftershave)
  topNotes?: string; heartNotes?: string; baseNotes?: string;
  scentDescription?: string; inspiration?: string; scentFamily?: string; familySubtype?: string;
};

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="min-h-screen flex flex-col">
      <AppNav />
      <AuthGuard><ItemDetailContent id={id} /></AuthGuard>
    </div>
  );
}

function ItemDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBST, setShowBST] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // BST form
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("");
  const [bstError, setBstError] = useState<string | null>(null);
  const [bstLoading, setBstLoading] = useState(false);
  const [bstSuccess, setBstSuccess] = useState(false);

  // Edit form — base fields
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Edit form — razor
  const [editEdgeType, setEditEdgeType] = useState<string | undefined>(undefined);
  const [editConstruction, setEditConstruction] = useState<string | undefined>(undefined);
  const [editBladeGap, setEditBladeGap] = useState("");
  const [editExposure, setEditExposure] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editMetal, setEditMetal] = useState<string | undefined>(undefined);
  const [editFinish, setEditFinish] = useState<string | undefined>(undefined);
  const [editHandleModel, setEditHandleModel] = useState("");
  const [editStraightWidth, setEditStraightWidth] = useState<string | undefined>(undefined);
  const [editStraightPoint, setEditStraightPoint] = useState<string | undefined>(undefined);
  const [editStraightHollow, setEditStraightHollow] = useState<string | undefined>(undefined);

  // Edit form — blade
  const [editBladeFormat, setEditBladeFormat] = useState<string | undefined>(undefined);
  const [editBladeCountryOfOrigin, setEditBladeCountryOfOrigin] = useState("");
  const [editBladeCoating, setEditBladeCoating] = useState("");
  const [editSharpness, setEditSharpness] = useState(0);

  // Edit form — brush
  const [editKnot, setEditKnot] = useState<string | undefined>(undefined);
  const [editDiameter, setEditDiameter] = useState<string | undefined>(undefined);

  // Edit form — soap
  const [editSoapDensity, setEditSoapDensity] = useState(0);
  const [editSoapCushion, setEditSoapCushion] = useState(0);
  const [editSoapSlickness, setEditSoapSlickness] = useState(0);
  const [editSoapStability, setEditSoapStability] = useState(0);
  const [editSoapScentStrength, setEditSoapScentStrength] = useState(0);
  const [editSoapHasMenthol, setEditSoapHasMenthol] = useState<boolean | undefined>(undefined);
  const [editSoapIsTallow, setEditSoapIsTallow] = useState<boolean | undefined>(undefined);

  // Edit form — aftershave
  const [editAftershaveScentStrength, setEditAftershaveScentStrength] = useState(0);

  // Edit form — edpedt
  const [editEdpedtScentStrength, setEditEdpedtScentStrength] = useState(0);

  // Edit form — preshave
  const [editPreshaveType, setEditPreshaveType] = useState<string | undefined>(undefined);

  // Edit form — scent info (soap & aftershave)
  const [editShaveSplashUrl, setEditShaveSplashUrl] = useState("");
  const [editTopNotes, setEditTopNotes] = useState("");
  const [editHeartNotes, setEditHeartNotes] = useState("");
  const [editBaseNotes, setEditBaseNotes] = useState("");
  const [editScentDescription, setEditScentDescription] = useState("");
  const [editInspiration, setEditInspiration] = useState("");
  const [editScentFamily, setEditScentFamily] = useState("");
  const [editFamilySubtype, setEditFamilySubtype] = useState("");

  // Edit form — plates (razors)
  const [editPlates, setEditPlates] = useState<RazorPlate[]>([]);
  const [editingPlateIdx, setEditingPlateIdx] = useState<number | null>(null); // null = no form, -1 = add new
  const [plateFormName, setPlateFormName] = useState("");
  const [plateFormType, setPlateFormType] = useState<string>("SB");
  const [plateFormGap, setPlateFormGap] = useState("");
  const [plateFormExposure, setPlateFormExposure] = useState("");

  useEffect(() => {
    api.get<{ items: InventoryItem[] }>("/api/inventory")
      .then((d) => { setItem(d.items.find((i) => i.id === id) ?? null); })
      .finally(() => setLoading(false));
  }, [id]);

  const openEdit = () => {
    if (!item) return;
    setEditName(item.name);
    setEditBrand(item.brand);
    setEditNotes(item.notes ?? "");
    setEditEdgeType(item.edgeType);
    setEditConstruction(item.construction);
    setEditBladeGap(item.bladeGap?.toString() ?? "");
    setEditExposure(item.exposure?.toString() ?? "");
    setEditWeight(item.weight?.toString() ?? "");
    setEditMetal(item.metal);
    setEditFinish(item.finish);
    setEditHandleModel(item.handleModel ?? "");
    setEditStraightWidth(item.straightWidth);
    setEditStraightPoint(item.straightPoint);
    setEditStraightHollow(item.straightHollow);
    setEditBladeFormat(item.bladeFormat);
    setEditBladeCountryOfOrigin(item.bladeCountryOfOrigin ?? "");
    setEditBladeCoating(item.bladeCoating ?? "");
    setEditSharpness(item.sharpness ?? 0);
    setEditKnot(item.knot);
    setEditDiameter(item.diameter);
    setEditSoapDensity(item.soapDensity ?? 0);
    setEditSoapCushion(item.soapCushion ?? 0);
    setEditSoapSlickness(item.soapSlickness ?? 0);
    setEditSoapStability(item.soapStability ?? 0);
    setEditSoapScentStrength(item.soapScentStrength ?? 0);
    setEditSoapHasMenthol(item.soapHasMenthol);
    setEditSoapIsTallow(item.soapIsTallow);
    setEditAftershaveScentStrength(item.aftershaveScentStrength ?? 0);
    setEditEdpedtScentStrength(item.edpedtScentStrength ?? 0);
    setEditPreshaveType(item.preshaveType);
    setEditShaveSplashUrl(item.shaveSplashUrl ?? "");
    setEditTopNotes(item.topNotes ?? "");
    setEditHeartNotes(item.heartNotes ?? "");
    setEditBaseNotes(item.baseNotes ?? "");
    setEditScentDescription(item.scentDescription ?? "");
    setEditInspiration(item.inspiration ?? "");
    setEditScentFamily(item.scentFamily ?? "");
    setEditFamilySubtype(item.familySubtype ?? "");
    setEditPlates(item.plates ? item.plates.map(p => ({ ...p })) : []);
    setEditingPlateIdx(null);
    setEditError(null);
    setShowEdit(true);
    setShowBST(false);
  };

  const handleSaveEdit = async () => {
    if (!item) return;
    if (!editName.trim()) { setEditError("Name is required"); return; }
    if (!editBrand.trim()) { setEditError("Brand is required"); return; }
    setEditError(null);
    setEditSaving(true);

    const catId = item.categoryId;
    const isRazor = catId === "razors";
    const isBlade = catId === "blades";
    const isBrush = catId === "brushes";
    const isSoap = catId === "soaps";
    const isAftershave = catId === "aftershaves";
    const isEdpEdt = catId === "edpedt";
    const isPreshave = catId === "preshaves";
    const isStraight = isRazor && editEdgeType === "Straight";

    const data: Record<string, unknown> = {};
    if (isRazor) {
      if (editEdgeType) data.edgeType = editEdgeType;
      if (editConstruction) data.construction = editConstruction;
      if (editBladeGap.trim()) data.bladeGap = parseFloat(editBladeGap);
      if (editExposure.trim()) data.exposure = parseFloat(editExposure);
      if (editWeight.trim()) data.weight = parseInt(editWeight, 10);
      if (editMetal) data.metal = editMetal;
      if (editFinish) data.finish = editFinish;
      if (editHandleModel.trim()) data.handleModel = editHandleModel.trim();
      data.plates = editPlates;
      if (isStraight) {
        if (editStraightWidth) data.straightWidth = editStraightWidth;
        if (editStraightPoint) data.straightPoint = editStraightPoint;
        if (editStraightHollow) data.straightHollow = editStraightHollow;
      }
    }
    if (isBlade) {
      if (editBladeFormat) data.bladeFormat = editBladeFormat;
      if (editBladeCountryOfOrigin.trim()) data.bladeCountryOfOrigin = editBladeCountryOfOrigin.trim();
      if (editBladeCoating.trim()) data.bladeCoating = editBladeCoating.trim();
      if (editSharpness > 0) data.sharpness = editSharpness;
    }
    if (isBrush) {
      if (editKnot) data.knot = editKnot;
      if (editDiameter) data.diameter = editDiameter;
    }
    if (isSoap) {
      if (editSoapDensity > 0) data.soapDensity = editSoapDensity;
      if (editSoapCushion > 0) data.soapCushion = editSoapCushion;
      if (editSoapSlickness > 0) data.soapSlickness = editSoapSlickness;
      if (editSoapStability > 0) data.soapStability = editSoapStability;
      if (editSoapScentStrength > 0) data.soapScentStrength = editSoapScentStrength;
      if (editSoapHasMenthol !== undefined) data.soapHasMenthol = editSoapHasMenthol;
      if (editSoapIsTallow !== undefined) data.soapIsTallow = editSoapIsTallow;
    }
    if (isAftershave) {
      if (editAftershaveScentStrength > 0) data.aftershaveScentStrength = editAftershaveScentStrength;
    }
    if (isSoap || isAftershave) {
      if (editShaveSplashUrl.trim()) data.shaveSplashUrl = editShaveSplashUrl.trim();
      if (editTopNotes.trim()) data.topNotes = editTopNotes.trim();
      if (editHeartNotes.trim()) data.heartNotes = editHeartNotes.trim();
      if (editBaseNotes.trim()) data.baseNotes = editBaseNotes.trim();
      if (editScentDescription.trim()) data.scentDescription = editScentDescription.trim();
      if (editInspiration.trim()) data.inspiration = editInspiration.trim();
      if (editScentFamily.trim()) data.scentFamily = editScentFamily.trim();
      if (editFamilySubtype.trim()) data.familySubtype = editFamilySubtype.trim();
    }
    if (isEdpEdt) {
      if (editEdpedtScentStrength > 0) data.edpedtScentStrength = editEdpedtScentStrength;
    }
    if (isPreshave) {
      if (editPreshaveType) data.preshaveType = editPreshaveType;
    }

    try {
      await api.patch(`/api/inventory/${item.id}`, {
        name: editName.trim(),
        brand: editBrand.trim(),
        notes: editNotes.trim() || undefined,
        data,
      });
      setItem({
        ...item,
        name: editName.trim(),
        brand: editBrand.trim(),
        notes: editNotes.trim() || undefined,
        ...data,
      });
      setShowEdit(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setDeleting(true);
    try {
      await api.delete(`/api/inventory/${item.id}`);
      router.push("/den");
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleListInBST = async () => {
    if (!item) return;
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) { setBstError("Enter a valid price"); return; }
    if (!condition) { setBstError("Select a condition"); return; }
    setBstError(null);
    setBstLoading(true);
    try {
      await api.post("/api/bst/listings", {
        title: item.name, brand: item.brand || undefined,
        description: item.notes || item.name, price: priceNum,
        condition, category: BST_CATEGORY_MAP[item.categoryId] ?? "misc",
        linkedItemId: item.id, photos: [],
      });
      setBstSuccess(true);
      setTimeout(() => router.push("/bst"), 1500);
    } catch (e) {
      setBstError(e instanceof Error ? e.message : "Failed to create listing");
      setBstLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }
  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Item not found</p>
          <Link href="/den" className="text-[#c9a050] hover:underline">← Back to Den</Link>
        </div>
      </div>
    );
  }

  const isBSTEligible = item.categoryId in BST_CATEGORY_MAP;
  const isRazor = item.categoryId === "razors";
  const isBlade = item.categoryId === "blades";
  const isBrush = item.categoryId === "brushes";
  const isSoap = item.categoryId === "soaps";
  const isAftershave = item.categoryId === "aftershaves";
  const isEdpEdt = item.categoryId === "edpedt";
  const isPreshave = item.categoryId === "preshaves";
  const isStraight = isRazor && item.edgeType === "Straight";
  const editIsStraight = isRazor && editEdgeType === "Straight";

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 w-full">
      <div className="flex items-center justify-between mb-6">
        <Link href="/den" className="text-[#c9a050] text-sm hover:underline">← Back to Den</Link>
        <div className="flex gap-2">
          <button onClick={openEdit} className="text-sm px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-[#f5f2eb] hover:border-white/20 transition-colors">
            Edit
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="text-sm px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors">
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {/* Photo */}
        <div className="aspect-square bg-[#242424] rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
          {item.photoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
            : <span className="text-7xl opacity-20">{CATEGORY_ICONS[item.categoryId] ?? "📦"}</span>}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{CATEGORY_ICONS[item.categoryId]}</span>
            <span className="text-gray-500 text-sm">{CATEGORY_LABELS[item.categoryId] ?? item.categoryId}</span>
          </div>
          <p className="text-[#c9a050] text-sm font-medium mb-1">{item.brand}</p>
          <h1 className="text-[#f5f2eb] text-2xl font-bold mb-4">{item.name}</h1>

          <div className="bg-[#242424] rounded-xl p-4 border border-white/5 space-y-2 mb-4 flex-1">
            {/* Common */}
            {item.notes && <Spec label="Notes" value={item.notes} />}

            {/* Razor */}
            {item.edgeType && <Spec label="Edge Type" value={EDGE_TYPE_LABELS[item.edgeType] ?? item.edgeType} />}
            {item.construction && <Spec label="Construction" value={item.construction} />}
            {item.metal && <Spec label="Metal" value={item.metal} />}
            {item.finish && <Spec label="Finish" value={item.finish} />}
            {item.weight != null && item.weight > 0 && <Spec label="Weight" value={`${item.weight}g`} />}
            {item.bladeGap != null && <Spec label="Blade Gap" value={`${item.bladeGap}mm`} />}
            {item.exposure != null && <Spec label="Exposure" value={`${item.exposure}mm`} />}
            {/* Straight razor */}
            {isStraight && item.straightWidth && <Spec label="Width" value={`${item.straightWidth}"`} />}
            {isStraight && item.straightPoint && <Spec label="Point" value={item.straightPoint} />}
            {isStraight && item.straightHollow && <Spec label="Hollow" value={item.straightHollow} />}
            {/* Plates */}
            {isRazor && item.plates && item.plates.length > 0 && (
              <div className="pt-1">
                <span className="text-gray-500 text-xs uppercase tracking-wider">Plates</span>
                <div className="mt-1.5 space-y-1">
                  {item.plates.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-[#c9a050] font-medium w-5 text-center">{p.type}</span>
                      <span className="text-[#f5f2eb]">{p.name}</span>
                      {p.bladeGap != null && <span className="text-gray-500">· Gap: {p.bladeGap}mm</span>}
                      {p.exposure != null && <span className="text-gray-500">· Exp: {p.exposure}mm</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Blade */}
            {item.bladeFormat && <Spec label="Format" value={BLADE_FORMAT_LABELS[item.bladeFormat] ?? item.bladeFormat} />}
            {item.bladeCountryOfOrigin && <Spec label="Country" value={item.bladeCountryOfOrigin} />}
            {item.bladeCoating && <Spec label="Coating" value={item.bladeCoating} />}
            {item.sharpness != null && item.sharpness > 0 && <Spec label="Sharpness" value={`${item.sharpness}/10`} />}

            {/* Brush */}
            {item.knot && <Spec label="Knot" value={item.knot} />}
            {item.diameter && <Spec label="Diameter" value={item.diameter} />}

            {/* Soap */}
            {item.soapDensity != null && item.soapDensity > 0 && <Spec label="Density" value={`${item.soapDensity}/10`} />}
            {item.soapCushion != null && item.soapCushion > 0 && <Spec label="Cushion" value={`${item.soapCushion}/10`} />}
            {item.soapSlickness != null && item.soapSlickness > 0 && <Spec label="Slickness" value={`${item.soapSlickness}/10`} />}
            {item.soapStability != null && item.soapStability > 0 && <Spec label="Stability" value={`${item.soapStability}/10`} />}
            {item.soapScentStrength != null && item.soapScentStrength > 0 && <Spec label="Scent Strength" value={`${item.soapScentStrength}/10`} />}
            {item.soapHasMenthol != null && <Spec label="Menthol" value={item.soapHasMenthol ? "Yes" : "No"} />}
            {item.soapIsTallow != null && <Spec label="Base" value={item.soapIsTallow ? "Tallow" : "Vegan"} />}
            {item.shaveSplashUrl && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500 text-sm">ShaveSplash</span>
                <a href={item.shaveSplashUrl} target="_blank" rel="noopener noreferrer" className="text-[#c9a050] text-sm hover:underline truncate flex-1 text-right">View ↗</a>
              </div>
            )}

            {/* Aftershave */}
            {isAftershave && item.aftershaveScentStrength != null && item.aftershaveScentStrength > 0 && (
              <Spec label="Scent Strength" value={`${item.aftershaveScentStrength}/10`} />
            )}

            {/* EDP/EDT */}
            {isEdpEdt && item.edpedtScentStrength != null && item.edpedtScentStrength > 0 && (
              <Spec label="Scent Strength" value={`${item.edpedtScentStrength}/10`} />
            )}

            {/* Preshave */}
            {item.preshaveType && <Spec label="Type" value={item.preshaveType} />}
          </div>

          {isBSTEligible && !showBST && !showEdit && (
            <button onClick={() => setShowBST(true)} className="w-full border border-[#c9a050]/30 text-[#c9a050] py-3 rounded-xl hover:bg-[#c9a050]/10 transition-colors font-semibold text-sm">
              🛒 List in Marketplace (BST)
            </button>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {showEdit && (
        <div className="mt-8 bg-[#242424] rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-[family-name:var(--font-fredericka)] text-xl text-[#f5f2eb]">Edit Item</h2>
            <button onClick={() => setShowEdit(false)} className="text-gray-500 hover:text-gray-300 text-xl">✕</button>
          </div>

          <div className="space-y-5">
            {/* Base fields */}
            <Field label="Brand *">
              <input value={editBrand} onChange={(e) => setEditBrand(e.target.value)} className={input} />
            </Field>
            <Field label="Name *">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className={input} />
            </Field>
            <Field label="Notes">
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className={`${input} resize-none`} />
            </Field>

            {/* Razor fields */}
            {isRazor && (
              <>
                <Field label="Edge Type">
                  <SegmentedControl
                    options={EDGE_TYPE_OPTIONS as unknown as string[]}
                    labels={EDGE_TYPE_LABELS}
                    value={editEdgeType}
                    onChange={setEditEdgeType}
                  />
                </Field>
                <Field label="Construction">
                  <SegmentedControl
                    options={CONSTRUCTION_OPTIONS as unknown as string[]}
                    value={editConstruction}
                    onChange={setEditConstruction}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Blade Gap (mm)">
                    <input type="number" step="0.01" value={editBladeGap} onChange={(e) => setEditBladeGap(e.target.value)} placeholder="e.g. 0.45" className={input} />
                  </Field>
                  <Field label="Exposure (mm)">
                    <input type="number" step="0.01" value={editExposure} onChange={(e) => setEditExposure(e.target.value)} placeholder="e.g. 0.02" className={input} />
                  </Field>
                </div>
                <Field label="Weight (g)">
                  <input type="number" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} placeholder="e.g. 84" className={input} />
                </Field>
                <Field label="Metal">
                  <SelectField
                    options={METAL_OPTIONS as unknown as string[]}
                    value={editMetal}
                    onChange={setEditMetal}
                    placeholder="Select metal"
                  />
                </Field>
                <Field label="Finish">
                  <SelectField
                    options={FINISH_OPTIONS as unknown as string[]}
                    value={editFinish}
                    onChange={setEditFinish}
                    placeholder="Select finish"
                  />
                </Field>
                <Field label="Handle Model">
                  <input value={editHandleModel} onChange={(e) => setEditHandleModel(e.target.value)}
                    placeholder="e.g. Fatip Grande"
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
                </Field>
                {/* Straight razor extras */}
                {editIsStraight && (
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Width">
                      <SelectField options={STRAIGHT_WIDTH_OPTIONS as unknown as string[]} value={editStraightWidth} onChange={setEditStraightWidth} placeholder="Select" />
                    </Field>
                    <Field label="Point">
                      <SelectField options={STRAIGHT_POINT_OPTIONS as unknown as string[]} value={editStraightPoint} onChange={setEditStraightPoint} placeholder="Select" />
                    </Field>
                    <Field label="Hollow">
                      <SelectField options={STRAIGHT_HOLLOW_OPTIONS as unknown as string[]} value={editStraightHollow} onChange={setEditStraightHollow} placeholder="Select" />
                    </Field>
                  </div>
                )}

                {/* Plates */}
                <Field label="Plates">
                  <div className="space-y-2">
                    {editPlates.map((plate, idx) => (
                      <div key={idx}>
                        {editingPlateIdx === idx ? (
                          <PlateForm
                            name={plateFormName} setName={setPlateFormName}
                            type={plateFormType} setType={setPlateFormType}
                            gap={plateFormGap} setGap={setPlateFormGap}
                            exposure={plateFormExposure} setExposure={setPlateFormExposure}
                            onSave={() => {
                              if (!plateFormName.trim()) return;
                              const updated = [...editPlates];
                              updated[idx] = {
                                name: plateFormName.trim(),
                                type: plateFormType as "SB" | "OC" | "DC",
                                bladeGap: plateFormGap.trim() ? parseFloat(plateFormGap) : undefined,
                                exposure: plateFormExposure.trim() ? parseFloat(plateFormExposure) : undefined,
                              };
                              setEditPlates(updated);
                              setEditingPlateIdx(null);
                            }}
                            onCancel={() => setEditingPlateIdx(null)}
                          />
                        ) : (
                          <div className="flex items-center gap-3 bg-[#1e1e1e] rounded-xl px-3 py-2.5 border border-white/10">
                            <span className="text-[#c9a050] text-xs font-bold w-8 text-center bg-[#c9a050]/10 rounded px-1 py-0.5">{plate.type}</span>
                            <span className="text-[#f5f2eb] text-sm font-medium flex-1">{plate.name}</span>
                            {plate.bladeGap != null && <span className="text-gray-500 text-xs">Gap: {plate.bladeGap}mm</span>}
                            {plate.exposure != null && <span className="text-gray-500 text-xs">Exp: {plate.exposure}mm</span>}
                            <button
                              onClick={() => { setPlateFormName(plate.name); setPlateFormType(plate.type); setPlateFormGap(plate.bladeGap?.toString() ?? ""); setPlateFormExposure(plate.exposure?.toString() ?? ""); setEditingPlateIdx(idx); }}
                              className="text-gray-500 hover:text-[#c9a050] text-xs px-1.5 py-0.5 transition-colors"
                            >Edit</button>
                            <button
                              onClick={() => setEditPlates(editPlates.filter((_, i) => i !== idx))}
                              className="text-gray-600 hover:text-red-400 text-xs px-1 transition-colors"
                            >✕</button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add plate form */}
                    {editingPlateIdx === -1 ? (
                      <PlateForm
                        name={plateFormName} setName={setPlateFormName}
                        type={plateFormType} setType={setPlateFormType}
                        gap={plateFormGap} setGap={setPlateFormGap}
                        exposure={plateFormExposure} setExposure={setPlateFormExposure}
                        onSave={() => {
                          if (!plateFormName.trim()) return;
                          setEditPlates([...editPlates, {
                            name: plateFormName.trim(),
                            type: plateFormType as "SB" | "OC" | "DC",
                            bladeGap: plateFormGap.trim() ? parseFloat(plateFormGap) : undefined,
                            exposure: plateFormExposure.trim() ? parseFloat(plateFormExposure) : undefined,
                          }]);
                          setPlateFormName(""); setPlateFormType("SB"); setPlateFormGap(""); setPlateFormExposure("");
                          setEditingPlateIdx(null);
                        }}
                        onCancel={() => setEditingPlateIdx(null)}
                      />
                    ) : editingPlateIdx === null && (
                      <button
                        onClick={() => { setPlateFormName(""); setPlateFormType("SB"); setPlateFormGap(""); setPlateFormExposure(""); setEditingPlateIdx(-1); }}
                        className="w-full py-2 rounded-xl border border-dashed border-white/15 text-gray-500 hover:text-[#c9a050] hover:border-[#c9a050]/30 text-sm transition-colors"
                      >
                        + Add Plate
                      </button>
                    )}
                  </div>
                </Field>
              </>
            )}

            {/* Blade fields */}
            {isBlade && (
              <>
                <Field label="Format">
                  <SegmentedControl
                    options={BLADE_FORMAT_OPTIONS as unknown as string[]}
                    labels={BLADE_FORMAT_LABELS}
                    value={editBladeFormat}
                    onChange={setEditBladeFormat}
                  />
                </Field>
                <Field label="Sharpness">
                  <RatingField value={editSharpness} onChange={setEditSharpness} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Country of Origin">
                    <input value={editBladeCountryOfOrigin} onChange={(e) => setEditBladeCountryOfOrigin(e.target.value)} placeholder="e.g. Russia" className={input} />
                  </Field>
                  <Field label="Coating">
                    <input value={editBladeCoating} onChange={(e) => setEditBladeCoating(e.target.value)} placeholder="e.g. PTFE" className={input} />
                  </Field>
                </div>
              </>
            )}

            {/* Brush fields */}
            {isBrush && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Knot Type">
                  <SelectField options={KNOT_OPTIONS as unknown as string[]} value={editKnot} onChange={setEditKnot} placeholder="Select knot" />
                </Field>
                <Field label="Diameter">
                  <SelectField options={DIAMETER_OPTIONS as unknown as string[]} value={editDiameter} onChange={setEditDiameter} placeholder="Select size" />
                </Field>
              </div>
            )}

            {/* Soap fields */}
            {isSoap && (
              <>
                <Field label="Density"><RatingField value={editSoapDensity} onChange={setEditSoapDensity} /></Field>
                <Field label="Cushion"><RatingField value={editSoapCushion} onChange={setEditSoapCushion} /></Field>
                <Field label="Slickness"><RatingField value={editSoapSlickness} onChange={setEditSoapSlickness} /></Field>
                <Field label="Stability"><RatingField value={editSoapStability} onChange={setEditSoapStability} /></Field>
                <Field label="Scent Strength"><RatingField value={editSoapScentStrength} onChange={setEditSoapScentStrength} /></Field>
                <Field label="Menthol">
                  <ToggleField
                    options={["Non-Menthol", "Menthol"]}
                    value={editSoapHasMenthol === undefined ? undefined : editSoapHasMenthol ? "Menthol" : "Non-Menthol"}
                    onChange={(v) => setEditSoapHasMenthol(v === "Menthol" ? true : v === "Non-Menthol" ? false : undefined)}
                  />
                </Field>
                <Field label="Base">
                  <ToggleField
                    options={["Tallow", "Vegan"]}
                    value={editSoapIsTallow === undefined ? undefined : editSoapIsTallow ? "Tallow" : "Vegan"}
                    onChange={(v) => setEditSoapIsTallow(v === "Tallow" ? true : v === "Vegan" ? false : undefined)}
                  />
                </Field>
              </>
            )}

            {/* Aftershave fields */}
            {isAftershave && (
              <Field label="Scent Strength"><RatingField value={editAftershaveScentStrength} onChange={setEditAftershaveScentStrength} /></Field>
            )}

            {/* Scent profile (soap & aftershave) */}
            {(isSoap || isAftershave) && (
              <>
                <Field label="ShaveSplash URL">
                  <input value={editShaveSplashUrl} onChange={(e) => setEditShaveSplashUrl(e.target.value)}
                    placeholder={isSoap ? "https://www.shavesplash.com/soap-items/..." : "https://www.shavesplash.com/aftershave-items/..."}
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
                </Field>
                <Field label="Scent Family">
                  <input value={editScentFamily} onChange={(e) => setEditScentFamily(e.target.value)}
                    placeholder="e.g. Fougère, Citrus, Woody"
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
                </Field>
                <Field label="Subtype">
                  <input value={editFamilySubtype} onChange={(e) => setEditFamilySubtype(e.target.value)}
                    placeholder="e.g. Classic, Modern"
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
                </Field>
                <Field label="Top Notes">
                  <input value={editTopNotes} onChange={(e) => setEditTopNotes(e.target.value)}
                    placeholder="e.g. Bergamot, Lemon"
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
                </Field>
                <Field label="Heart Notes">
                  <input value={editHeartNotes} onChange={(e) => setEditHeartNotes(e.target.value)}
                    placeholder="e.g. Lavender, Geranium"
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
                </Field>
                <Field label="Base Notes">
                  <input value={editBaseNotes} onChange={(e) => setEditBaseNotes(e.target.value)}
                    placeholder="e.g. Oakmoss, Musk"
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
                </Field>
                <Field label="Scent Description">
                  <textarea value={editScentDescription} onChange={(e) => setEditScentDescription(e.target.value)} rows={3}
                    placeholder="Describe the scent..."
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 resize-none" />
                </Field>
                <Field label="Inspiration">
                  <input value={editInspiration} onChange={(e) => setEditInspiration(e.target.value)}
                    placeholder="e.g. Classic barbershop"
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
                </Field>
              </>
            )}

            {/* EDP/EDT fields */}
            {isEdpEdt && (
              <Field label="Scent Strength"><RatingField value={editEdpedtScentStrength} onChange={setEditEdpedtScentStrength} /></Field>
            )}

            {/* Preshave fields */}
            {isPreshave && (
              <Field label="Type">
                <SegmentedControl options={PRESHAVE_TYPE_OPTIONS as unknown as string[]} value={editPreshaveType} onChange={setEditPreshaveType} />
              </Field>
            )}
          </div>

          {editError && <p className="text-red-400 text-sm mt-4">{editError}</p>}
          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowEdit(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-[#f5f2eb] transition-colors">
              Cancel
            </button>
            <button onClick={handleSaveEdit} disabled={editSaving} className="flex-1 py-2.5 rounded-xl bg-[#c9a050] text-black font-bold text-sm hover:bg-[#b8903f] transition-colors disabled:opacity-60">
              {editSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#242424] rounded-2xl border border-white/10 p-6 max-w-sm w-full">
            <h2 className="text-[#f5f2eb] font-bold text-lg mb-2">Delete item?</h2>
            <p className="text-gray-400 text-sm mb-6">
              <span className="text-[#f5f2eb]">{item.brand} {item.name}</span> will be removed from your den.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-[#f5f2eb] transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-60">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BST Form */}
      {isBSTEligible && showBST && (
        <div className="mt-8 bg-[#242424] rounded-2xl border border-[#c9a050]/20 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-[family-name:var(--font-fredericka)] text-xl text-[#c9a050]">List in Marketplace</h2>
            <button onClick={() => setShowBST(false)} className="text-gray-500 hover:text-gray-300 text-xl">✕</button>
          </div>
          <div className="flex items-center gap-3 bg-[#1e1e1e] rounded-xl p-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-lg">
              {item.photoUrl
                ? <img src={item.photoUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                : CATEGORY_ICONS[item.categoryId]}
            </div>
            <div>
              <p className="text-[#f5f2eb] text-sm font-semibold">{item.name}</p>
              <p className="text-[#c9a050] text-xs">{item.brand}</p>
            </div>
          </div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Price (USD) *</label>
          <div className="flex items-center bg-[#1e1e1e] border border-white/10 rounded-xl px-4 h-12 mb-5 focus-within:border-[#c9a050]/50">
            <span className="text-[#c9a050] font-bold text-lg mr-2">$</span>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="flex-1 bg-transparent text-[#f5f2eb] text-lg font-semibold focus:outline-none" />
          </div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Condition *</label>
          <div className="flex gap-2 flex-wrap mb-5">
            {BST_CONDITIONS.map((c) => (
              <button key={c} onClick={() => setCondition(c)} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${condition === c ? "bg-[#c9a050]/15 border-[#c9a050] text-[#c9a050]" : "border-white/10 text-gray-500 hover:border-[#c9a050]/30"}`}>
                {c}
              </button>
            ))}
          </div>
          {bstError && <p className="text-red-400 text-sm text-center mb-4">{bstError}</p>}
          <button onClick={handleListInBST} disabled={bstLoading || bstSuccess} className="w-full bg-[#c9a050] text-black font-bold py-3.5 rounded-xl hover:bg-[#b8903f] transition-colors disabled:opacity-60 text-base shadow-lg shadow-[#c9a050]/20">
            {bstLoading ? "Posting..." : bstSuccess ? "✓ Listed! Redirecting..." : "Post to Marketplace"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---- helper components ----

const input = "w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</label>
      {children}
    </div>
  );
}

function SegmentedControl({ options, labels, value, onChange }: {
  options: string[]; labels?: Record<string, string>; value: string | undefined; onChange: (v: string) => void;
}) {
  return (
    <div className="flex bg-[#1e1e1e] rounded-xl p-1 border border-white/10 gap-1 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${value === opt ? "bg-[#c9a050] text-black" : "text-gray-400 hover:text-[#f5f2eb]"}`}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

function SelectField({ options, value, onChange, placeholder }: {
  options: string[]; value: string | undefined; onChange: (v: string | undefined) => void; placeholder: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50 appearance-none"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function RatingField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n === value ? 0 : n)}
          className={`flex-1 h-8 rounded-lg text-xs font-bold transition-colors ${value >= n ? "bg-[#c9a050] text-black" : "bg-[#1e1e1e] text-gray-500 hover:text-[#f5f2eb] border border-white/10"}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function ToggleField({ options, value, onChange }: {
  options: string[]; value: string | undefined; onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="flex bg-[#1e1e1e] rounded-xl p-1 border border-white/10 gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(value === opt ? undefined : opt)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${value === opt ? "bg-[#c9a050] text-black" : "text-gray-400 hover:text-[#f5f2eb]"}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function PlateForm({ name, setName, type, setType, gap, setGap, exposure, setExposure, onSave, onCancel }: {
  name: string; setName: (v: string) => void;
  type: string; setType: (v: string) => void;
  gap: string; setGap: (v: string) => void;
  exposure: string; setExposure: (v: string) => void;
  onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#c9a050]/25 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Plate Name</label>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. .84, Open Comb…"
            autoFocus
            className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Type</label>
          <div className="flex bg-[#111] rounded-lg p-0.5 border border-white/10">
            {["SB", "OC", "DC"].map((opt) => (
              <button key={opt} onClick={() => setType(opt)}
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${type === opt ? "bg-[#c9a050] text-black" : "text-gray-400 hover:text-[#f5f2eb]"}`}
              >{opt}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Blade Gap (mm)</label>
          <input type="number" step="0.01" value={gap} onChange={(e) => setGap(e.target.value)}
            placeholder="e.g. 0.45"
            className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Exposure (mm)</label>
          <input type="number" step="0.01" value={exposure} onChange={(e) => setExposure(e.target.value)}
            placeholder="e.g. 0.02"
            className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-1.5 rounded-lg border border-white/10 text-gray-400 text-xs hover:text-[#f5f2eb] transition-colors">Cancel</button>
        <button onClick={onSave} disabled={!name.trim()} className="flex-1 py-1.5 rounded-lg bg-[#c9a050] text-black text-xs font-bold disabled:opacity-40 transition-colors">Save Plate</button>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-500 text-sm flex-shrink-0">{label}</span>
      <span className="text-[#f5f2eb] text-sm text-right">{value}</span>
    </div>
  );
}
