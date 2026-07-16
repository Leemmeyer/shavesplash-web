"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { api } from "@/lib/api";

const CUSTOM_BRAND_KEY = "__custom__";

const STANDARD_METALS = [
  "Aluminum", "Brass", "Bronze", "Chrome Plated", "Chrome Plated Zinc",
  "Copper", "Gold Plated", "Rosegold", "Silver Plated",
  "Stainless Steel", "Titanium", "Zamak",
];

const CATEGORIES = [
  { value: "aftershave", label: "Aftershave" },
  { value: "brush", label: "Brush" },
  { value: "edp", label: "EDP/EDT" },
  { value: "misc", label: "Misc" },
  { value: "razor", label: "Razor" },
  { value: "soap", label: "Soap" },
];

const CONDITIONS = ["New", "Mint", "Excellent", "Good", "Fair"];

type BrandEntry = { name: string; models: string[]; materials: string[] };

async function resizeToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 600 / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}

const inputCls = "w-full bg-[#161616] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50";
const selectCls = "w-full bg-[#161616] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50";
const labelCls = "block text-xs text-gray-500 font-medium uppercase tracking-wide mb-1.5";

export default function CreateListingModal() {
  const { session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);

  // form state
  const [displayName, setDisplayName] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [material, setMaterial] = useState("");
  const [customBrandInput, setCustomBrandInput] = useState("");
  const [customModelInput, setCustomModelInput] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // remote data
  const [brands, setBrands] = useState<BrandEntry[]>([]);
  const [isExpert, setIsExpert] = useState(false);

  const MAX_PHOTOS = isExpert ? 10 : 3;

  // Derived brand/model/metal options
  const brandOptions = brands.map((b) => b.name).sort((a, b) => a.localeCompare(b));
  const isCustomBrand = brand === CUSTOM_BRAND_KEY;
  const selectedBrandData = brands.find((b) => b.name === brand);
  const modelOptions = (selectedBrandData?.models ?? []).slice().sort((a, b) => a.localeCompare(b));
  const materialOptions = isCustomBrand
    ? STANDARD_METALS
    : (selectedBrandData?.materials ?? []).slice().sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!open || !session) return;
    api.get<{ brands: BrandEntry[] }>("/api/bst/brands").then((d) => setBrands(d.brands)).catch(() => {});
    api.get<{ profile: { displayName?: string | null }; user: { name: string } }>("/api/bst/profile")
      .then((d) => setDisplayName(d.profile?.displayName || d.user?.name || ""))
      .catch(() => {});
    api.get<{ isExpert: boolean }>("/api/subscriptions/status").then((d) => setIsExpert(d.isExpert)).catch(() => {});
  }, [open, session]);

  const reset = () => {
    setPhotos([]);
    setCategory("");
    setBrand("");
    setModel("");
    setMaterial("");
    setCustomBrandInput("");
    setCustomModelInput("");
    setTitle("");
    setDescription("");
    setPrice("");
    setCondition("");
    setError(null);
    setSubmitting(false);
  };

  const handleClose = () => { setOpen(false); reset(); };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length);
    if (!files.length) return;
    const encoded = await Promise.all(files.map(resizeToBase64));
    setPhotos((prev) => [...prev, ...encoded]);
    e.target.value = "";
  };

  const canSubmit =
    category && title.trim() && price.trim() && condition && displayName.trim() && !submitting &&
    (category !== "razor" || !isCustomBrand || customBrandInput.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) { setError("Enter a valid price"); return; }

    setSubmitting(true);
    setError(null);

    try {
      const resolvedBrand = isCustomBrand ? customBrandInput.trim() : (brand || undefined);
      const resolvedModel = isCustomBrand ? (customModelInput.trim() || undefined) : (model || undefined);

      await api.post("/api/bst/listings", {
        title: title.trim(),
        brand: resolvedBrand,
        model: resolvedModel,
        material: material || undefined,
        description: description.trim() || title.trim(),
        price: priceNum,
        condition,
        category,
        photos: photos.map((data, order) => ({ data, order })),
      });

      handleClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
      setSubmitting(false);
    }
  };

  if (!session) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-[#c9a050] text-black text-sm font-bold rounded-xl hover:bg-[#b8903f] transition-colors"
      >
        + List an Item
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#1e1e1e] rounded-2xl w-full max-w-2xl my-8 border border-white/5 shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-[#1e1e1e] border-b border-white/5 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="font-[family-name:var(--font-fredericka)] text-xl text-[#c9a050]">New Listing</h2>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-300 text-2xl leading-none transition-colors">×</button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
              {/* Display Name */}
              <div>
                <label className={labelCls}>Your Display Name <span className="text-[#c9a050]">*</span></label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How buyers will see you"
                  maxLength={60}
                  className={inputCls}
                />
                <p className="text-gray-600 text-xs mt-1">Shown on your listing · saved to your profile</p>
              </div>

              {/* Photos */}
              <div>
                <label className={labelCls}>Photos (up to {MAX_PHOTOS}){!isExpert && <span className="text-gray-600 normal-case font-normal ml-1">· Expert gets 10</span>}</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {photos.map((data, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[#161616]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`data:image/jpeg;base64,${data}`} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white text-xs hover:bg-black/90 transition-colors"
                      >
                        ×
                      </button>
                      <span className="absolute bottom-1.5 left-1.5 bg-black/60 rounded-md px-1.5 py-0.5 text-[10px] text-white font-semibold">
                        {i + 1}
                      </span>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1 text-gray-600 hover:border-[#c9a050]/40 hover:text-[#c9a050] transition-colors"
                    >
                      <span className="text-2xl leading-none">+</span>
                      <span className="text-xs">Add photo</span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFiles}
                  className="hidden"
                />
              </div>

              {/* Category */}
              <div>
                <label className={labelCls}>Category <span className="text-[#c9a050]">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => { setCategory(cat.value); setBrand(""); setModel(""); setMaterial(""); setCustomBrandInput(""); setCustomModelInput(""); }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        category === cat.value
                          ? "bg-[#c9a050]/10 border-[#c9a050] text-[#c9a050]"
                          : "border-white/10 text-gray-400 hover:border-white/20"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Razor: brand / model / metal */}
              {category === "razor" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Brand</label>
                    <select
                      value={brand}
                      onChange={(e) => { setBrand(e.target.value); setModel(""); setMaterial(""); setCustomBrandInput(""); setCustomModelInput(""); }}
                      className={selectCls}
                    >
                      <option value="">Any brand</option>
                      {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                      <option value={CUSTOM_BRAND_KEY}>Other / Enter my own</option>
                    </select>
                    {isCustomBrand && (
                      <input
                        type="text"
                        value={customBrandInput}
                        onChange={(e) => setCustomBrandInput(e.target.value)}
                        placeholder="Brand name…"
                        autoFocus
                        className={`mt-2 w-full bg-[#161616] border border-[#c9a050]/40 rounded-lg px-3 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/70`}
                      />
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Model</label>
                    {isCustomBrand ? (
                      <input
                        type="text"
                        value={customModelInput}
                        onChange={(e) => setCustomModelInput(e.target.value)}
                        placeholder="Model name (optional)"
                        className={inputCls}
                      />
                    ) : (
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        disabled={!brand}
                        className={`${selectCls} disabled:opacity-40`}
                      >
                        <option value="">Any model</option>
                        {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Metal</label>
                    <select
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      disabled={!brand}
                      className={`${selectCls} disabled:opacity-40`}
                    >
                      <option value="">Any metal</option>
                      {materialOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Item Name */}
              <div>
                <label className={labelCls}>Item Name <span className="text-[#c9a050]">*</span></label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Merkur 34C Heavy Duty Safety Razor"
                  maxLength={120}
                  className={inputCls}
                />
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Condition details, included accessories, reason for selling…"
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Price */}
              <div className="max-w-[180px]">
                <label className={labelCls}>Price (USD) <span className="text-[#c9a050]">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c9a050] font-bold text-base">$</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className={`${inputCls} pl-7`}
                  />
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className={labelCls}>Condition <span className="text-[#c9a050]">*</span></label>
                <div className="flex gap-2 flex-wrap">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCondition(c)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        condition === c
                          ? "bg-[#c9a050]/10 border-[#c9a050] text-[#c9a050]"
                          : "border-white/10 text-gray-400 hover:border-white/20"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex-1 bg-[#c9a050] text-black font-bold text-sm py-3 rounded-xl hover:bg-[#b8903f] transition-colors disabled:opacity-40"
                >
                  {submitting ? "Posting…" : "Post Listing"}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-3 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
