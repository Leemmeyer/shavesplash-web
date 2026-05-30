"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

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

type InventoryItem = {
  id: string; categoryId: string; name: string; brand: string;
  notes?: string; photoUrl?: string; createdAt: number;
  edgeType?: string; metal?: string; finish?: string; weight?: number;
  construction?: string; knot?: string; diameter?: string;
  soapDensity?: number; soapCushion?: number; soapSlickness?: number;
  soapStability?: number; soapScentStrength?: number;
  soapHasMenthol?: boolean; soapIsTallow?: boolean;
  topNotes?: string; heartNotes?: string; baseNotes?: string;
  scentDescription?: string; scentFamily?: string;
  aftershaveScentStrength?: number; sharpness?: number;
};

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="min-h-screen flex flex-col">
      <AppNav />
      <AuthGuard>
        <ItemDetailContent id={id} />
      </AuthGuard>
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
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("");
  const [bstError, setBstError] = useState<string | null>(null);
  const [bstLoading, setBstLoading] = useState(false);
  const [bstSuccess, setBstSuccess] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<{ items: InventoryItem[] }>("/api/inventory")
      .then((d) => {
        const found = d.items.find((i) => i.id === id);
        setItem(found ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const openEdit = () => {
    if (!item) return;
    setEditName(item.name);
    setEditBrand(item.brand);
    setEditNotes(item.notes ?? "");
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
    try {
      await api.patch(`/api/inventory/${item.id}`, {
        name: editName.trim(),
        brand: editBrand.trim(),
        notes: editNotes.trim() || undefined,
      });
      setItem({ ...item, name: editName.trim(), brand: editBrand.trim(), notes: editNotes.trim() || undefined });
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
        title: item.name,
        brand: item.brand || undefined,
        description: item.notes || item.name,
        price: priceNum,
        condition,
        category: BST_CATEGORY_MAP[item.categoryId] ?? "misc",
        linkedItemId: item.id,
        photos: [],
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 w-full">
      <div className="flex items-center justify-between mb-6">
        <Link href="/den" className="text-[#c9a050] text-sm hover:underline">
          ← Back to Den
        </Link>
        <div className="flex gap-2">
          <button
            onClick={openEdit}
            className="text-sm px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-[#f5f2eb] hover:border-white/20 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {/* Photo */}
        <div className="aspect-square bg-[#242424] rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
          {item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-7xl opacity-20">{CATEGORY_ICONS[item.categoryId] ?? "📦"}</span>
          )}
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
            {item.notes && <Spec label="Notes" value={item.notes} />}
            {item.edgeType && <Spec label="Edge Type" value={item.edgeType} />}
            {item.metal && <Spec label="Metal" value={item.metal} />}
            {item.finish && <Spec label="Finish" value={item.finish} />}
            {item.weight && <Spec label="Weight" value={`${item.weight}g`} />}
            {item.construction && <Spec label="Construction" value={item.construction} />}
            {item.knot && <Spec label="Knot" value={item.knot} />}
            {item.diameter && <Spec label="Diameter" value={item.diameter} />}
            {item.sharpness != null && item.sharpness > 0 && <Spec label="Sharpness" value={`${item.sharpness}/10`} />}
            {item.soapDensity != null && item.soapDensity > 0 && <Spec label="Density" value={`${item.soapDensity}/10`} />}
            {item.soapCushion != null && item.soapCushion > 0 && <Spec label="Cushion" value={`${item.soapCushion}/10`} />}
            {item.soapSlickness != null && item.soapSlickness > 0 && <Spec label="Slickness" value={`${item.soapSlickness}/10`} />}
            {item.soapScentStrength != null && item.soapScentStrength > 0 && <Spec label="Scent Strength" value={`${item.soapScentStrength}/10`} />}
            {item.aftershaveScentStrength != null && item.aftershaveScentStrength > 0 && <Spec label="Scent Strength" value={`${item.aftershaveScentStrength}/10`} />}
            {item.topNotes && <Spec label="Top Notes" value={item.topNotes} />}
            {item.heartNotes && <Spec label="Heart Notes" value={item.heartNotes} />}
            {item.baseNotes && <Spec label="Base Notes" value={item.baseNotes} />}
            {item.scentFamily && <Spec label="Scent Family" value={item.scentFamily} />}
            {item.soapHasMenthol != null && <Spec label="Menthol" value={item.soapHasMenthol ? "Yes" : "No"} />}
            {item.soapIsTallow != null && <Spec label="Base" value={item.soapIsTallow ? "Tallow" : "Vegan"} />}
          </div>

          {isBSTEligible && !showBST && !showEdit && (
            <button
              onClick={() => setShowBST(true)}
              className="w-full border border-[#c9a050]/30 text-[#c9a050] py-3 rounded-xl hover:bg-[#c9a050]/10 transition-colors font-semibold text-sm"
            >
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
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Brand *</label>
              <input
                value={editBrand}
                onChange={(e) => setEditBrand(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Name *</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50 resize-none"
              />
            </div>
          </div>
          {editError && <p className="text-red-400 text-sm mt-3">{editError}</p>}
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setShowEdit(false)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-[#f5f2eb] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={editSaving}
              className="flex-1 py-2.5 rounded-xl bg-[#c9a050] text-black font-bold text-sm hover:bg-[#b8903f] transition-colors disabled:opacity-60"
            >
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
              <span className="text-[#f5f2eb]">{item.brand} {item.name}</span> will be removed from your den. This can be undone by syncing from your phone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-[#f5f2eb] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-60"
              >
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
            <h2 className="font-[family-name:var(--font-fredericka)] text-xl text-[#c9a050]">
              List in Marketplace
            </h2>
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
            <input
              type="number" min="0" step="0.01"
              value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-[#f5f2eb] text-lg font-semibold focus:outline-none"
            />
          </div>

          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Condition *</label>
          <div className="flex gap-2 flex-wrap mb-5">
            {BST_CONDITIONS.map((c) => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  condition === c
                    ? "bg-[#c9a050]/15 border-[#c9a050] text-[#c9a050]"
                    : "border-white/10 text-gray-500 hover:border-[#c9a050]/30"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {bstError && <p className="text-red-400 text-sm text-center mb-4">{bstError}</p>}

          <button
            onClick={handleListInBST}
            disabled={bstLoading || bstSuccess}
            className="w-full bg-[#c9a050] text-black font-bold py-3.5 rounded-xl hover:bg-[#b8903f] transition-colors disabled:opacity-60 text-base shadow-lg shadow-[#c9a050]/20"
          >
            {bstLoading ? "Posting..." : bstSuccess ? "✓ Listed! Redirecting..." : "Post to Marketplace"}
          </button>
        </div>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-[#f5f2eb] text-sm text-right flex-1">{value}</span>
    </div>
  );
}
