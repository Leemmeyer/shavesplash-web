"use client";

import { useState, useEffect, useRef, cloneElement, isValidElement } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { api } from "@/lib/api";

const CUSTOM_BRAND_KEY = "__custom__";
const CUSTOM_MODEL_KEY = "__custom_model__";

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
type CategoryBrand = { name: string; items: string[] };
type CategoryBrandsData = { soap: CategoryBrand[]; aftershave: CategoryBrand[]; blade: CategoryBrand[]; brush: string[] };

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

interface Props {
  prefillTitle?: string;
  prefillCategory?: string;
  prefillSize?: number;
  trigger?: React.ReactNode;
}

export default function CreateListingModal({ prefillTitle, prefillCategory, prefillSize, trigger }: Props = {}) {
  const { session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const prefillApplied = useRef(false);

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
  const [percentRemaining, setPercentRemaining] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [size, setSize] = useState(prefillSize != null ? String(prefillSize) : "");
  const [listingType, setListingType] = useState<"for_sale" | "wtb" | "for_trade" | "pif">("for_sale");
  const [shippingPaidBy, setShippingPaidBy] = useState<"giver" | "receiver">("receiver");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // remote data
  const [brands, setBrands] = useState<BrandEntry[]>([]);
  const [categoryBrands, setCategoryBrands] = useState<CategoryBrandsData>({ soap: [], aftershave: [], blade: [], brush: [] });
  const [isExpert, setIsExpert] = useState(false);

  const MAX_PHOTOS = isExpert ? 10 : 3;

  // Derived options
  const isCustomBrand = brand === CUSTOM_BRAND_KEY;
  const isCustomModel = !isCustomBrand && model === CUSTOM_MODEL_KEY;

  // Razor options
  const razorBrandOptions = brands.map((b) => b.name).sort((a, b) => a.localeCompare(b));
  const selectedRazorBrand = brands.find((b) => b.name === brand);
  const modelOptions = (selectedRazorBrand?.models ?? []).slice().sort((a, b) => a.localeCompare(b));
  const allMaterials = Array.from(
    new Set([...STANDARD_METALS, ...(selectedRazorBrand?.materials ?? [])])
  ).sort((a, b) => a.localeCompare(b));

  // Soap / aftershave / brush options
  const isItemCategory = ["soap", "aftershave"].includes(category);
  const isBrushCategory = category === "brush";
  const currentCategoryBrands: CategoryBrand[] =
    category === "soap" ? categoryBrands.soap :
    category === "aftershave" ? categoryBrands.aftershave : [];
  const currentItemOptions = (currentCategoryBrands.find((b) => b.name === brand)?.items ?? [])
    .slice().sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!open || !session) return;
    api.get<{ brands: BrandEntry[] }>("/api/bst/brands").then((d) => setBrands(d.brands)).catch(() => {});
    api.get<CategoryBrandsData>("/api/bst/category-brands").then((d) => setCategoryBrands(d)).catch(() => {});
    api.get<{ profile: { displayName?: string | null }; user: { name: string } }>("/api/bst/profile")
      .then((d) => setDisplayName(d.profile?.displayName || d.user?.name || ""))
      .catch(() => {});
    api.get<{ isExpert: boolean }>("/api/subscriptions/status").then((d) => setIsExpert(d.isExpert)).catch(() => {});
  }, [open, session]);

  // Apply Den prefill (title + category only) when modal opens
  useEffect(() => {
    if (prefillApplied.current || !open || !prefillCategory) return;
    prefillApplied.current = true;
    setCategory(prefillCategory);
    if (prefillTitle) setTitle(prefillTitle);
  }, [open, prefillCategory, prefillTitle]);

  const reset = () => {
    prefillApplied.current = false;
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
    setPercentRemaining("");
    setAgeMonths("");
    setListingType("for_sale");
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

  const cleanDisplayName = displayName.trim();
  const displayNameValid = cleanDisplayName.length > 0 && !cleanDisplayName.includes("@");
  const isRazor = category === "razor";

  const priceRequired = listingType === "for_sale";
  const conditionRequired = listingType === "for_sale";
  const isPif = listingType === "pif";

  const canSubmit =
    category && displayNameValid && !submitting &&
    (isRazor || title.trim()) &&
    (!isRazor || !isCustomBrand || customBrandInput.trim().length > 0) &&
    (!priceRequired || price.trim()) &&
    (!conditionRequired || condition);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (cleanDisplayName.includes("@")) { setError("Display name cannot be an email address"); return; }
    const priceNum = parseFloat(price);
    if (priceRequired && (isNaN(priceNum) || priceNum <= 0)) { setError("Enter a valid price"); return; }

    setSubmitting(true);
    setError(null);

    try {
      // Save display name to profile if changed
      const savedDn = (await api.get<{ profile: { displayName?: string | null } }>("/api/bst/profile")).profile?.displayName ?? "";
      if (cleanDisplayName !== savedDn) {
        await api.patch("/api/bst/profile", { displayName: cleanDisplayName });
      }

      const resolvedBrand = isCustomBrand ? customBrandInput.trim() : (brand || undefined);
      const resolvedModel = isCustomBrand || model === CUSTOM_MODEL_KEY
        ? (customModelInput.trim() || undefined)
        : (model || undefined);

      const resolvedTitle = isRazor
        ? ([resolvedBrand, resolvedModel].filter(Boolean).join(" ") || "Razor")
        : title.trim();

      const hasLiquidFields = ["soap", "aftershave", "edp"].includes(category);
      const resolvedSize = hasLiquidFields && size ? parseFloat(size) : undefined;
      await api.post("/api/bst/listings", {
        title: resolvedTitle,
        brand: resolvedBrand,
        model: resolvedModel,
        material: material || undefined,
        description: description.trim() || title.trim(),
        price: !isNaN(priceNum) && priceNum > 0 ? priceNum : 0,
        condition: condition || undefined,
        category,
        listingType,
        ...(listingType === "pif" ? { shippingPaidBy } : {}),
        percentRemaining: hasLiquidFields && percentRemaining ? parseInt(percentRemaining) : undefined,
        ageMonths: hasLiquidFields && ageMonths ? parseInt(ageMonths) : undefined,
        size: !isNaN(resolvedSize ?? NaN) ? resolvedSize : undefined,
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

  const handleOpen = () => setOpen(true);

  return (
    <>
      {trigger && isValidElement(trigger)
        ? cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, { onClick: handleOpen })
        : (
          <button
            onClick={handleOpen}
            className="px-4 py-2 bg-[#c9a050] text-black text-sm font-bold rounded-xl hover:bg-[#b8903f] transition-colors"
          >
            + List an Item
          </button>
        )
      }

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
                <p className="text-gray-600 text-xs mt-1">Public username shown to buyers — your email is never shared</p>
                {cleanDisplayName.includes("@") && <p className="text-red-400 text-xs mt-0.5">Cannot use an email address as your display name</p>}
              </div>

              {/* Listing Type */}
              <div>
                <label className={labelCls}>Listing Type <span className="text-[#c9a050]">*</span></label>
                <div className="flex gap-2 flex-wrap">
                  {([ { value: "for_sale", label: "For Sale" }, { value: "wtb", label: "WTB" }, { value: "for_trade", label: "For Trade" }, { value: "pif", label: "PIF" } ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setListingType(opt.value); setPrice(""); setCondition(""); }}
                      className={`px-4 py-2 rounded-xl text-base font-medium border transition-colors ${
                        listingType === opt.value
                          ? "bg-[#c9a050]/10 border-[#c9a050] text-[#c9a050]"
                          : "border-white/10 text-gray-400 hover:border-white/20"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {listingType === "wtb" && (
                  <p className="text-gray-600 text-xs mt-1.5">WTB = Willing to Buy. Post what you&apos;re looking for.</p>
                )}
                {listingType === "for_trade" && (
                  <p className="text-gray-600 text-xs mt-1.5">Post what you&apos;re offering to trade.</p>
                )}
                {listingType === "pif" && (
                  <div className="mt-2">
                    <p className="text-gray-600 text-xs mb-2">PIF = Pay it Forward. Give an item away for free.</p>
                    <p className="text-gray-500 text-xs font-medium mb-1.5">Shipping paid by</p>
                    <div className="flex gap-2">
                      {(["giver", "receiver"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setShippingPaidBy(opt)}
                          className={`flex-1 px-4 py-2 rounded-xl text-base font-medium border transition-colors capitalize ${
                            shippingPaidBy === opt
                              ? "bg-[#c9a050]/10 border-[#c9a050] text-[#c9a050]"
                              : "border-white/10 text-gray-400 hover:border-white/20"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                      {razorBrandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
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
                      <>
                        <select
                          value={model}
                          onChange={(e) => { setModel(e.target.value); if (e.target.value !== CUSTOM_MODEL_KEY) setCustomModelInput(""); }}
                          disabled={!brand}
                          className={`${selectCls} disabled:opacity-40`}
                        >
                          <option value="">Any model</option>
                          {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                          {brand && <option value={CUSTOM_MODEL_KEY}>Other / Enter my own</option>}
                        </select>
                        {model === CUSTOM_MODEL_KEY && (
                          <input
                            type="text"
                            value={customModelInput}
                            onChange={(e) => setCustomModelInput(e.target.value)}
                            placeholder="Model name (optional)"
                            autoFocus
                            className={`mt-2 w-full bg-[#161616] border border-[#c9a050]/40 rounded-lg px-3 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/70`}
                          />
                        )}
                      </>
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
                      {allMaterials.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Soap / Aftershave: brand + scent dropdowns */}
              {isItemCategory && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Brand</label>
                    <select
                      value={brand}
                      onChange={(e) => { setBrand(e.target.value); setModel(""); setCustomBrandInput(""); setCustomModelInput(""); }}
                      className={selectCls}
                    >
                      <option value="">Select brand…</option>
                      {currentCategoryBrands.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
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
                    <label className={labelCls}>Scent / Product</label>
                    {isCustomBrand || isCustomModel ? (
                      <input
                        type="text"
                        value={customModelInput}
                        onChange={(e) => setCustomModelInput(e.target.value)}
                        placeholder="Scent name…"
                        className={inputCls}
                      />
                    ) : (
                      <select
                        value={model}
                        onChange={(e) => { setModel(e.target.value); setCustomModelInput(""); }}
                        disabled={!brand}
                        className={`${selectCls} disabled:opacity-40`}
                      >
                        <option value="">Select scent…</option>
                        {currentItemOptions.map((i) => <option key={i} value={i}>{i}</option>)}
                        {brand && <option value={CUSTOM_MODEL_KEY}>Other / Enter my own</option>}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* Brush: brand dropdown only */}
              {isBrushCategory && (
                <div className="max-w-xs">
                  <label className={labelCls}>Brand</label>
                  <select
                    value={brand}
                    onChange={(e) => { setBrand(e.target.value); setCustomBrandInput(""); }}
                    className={selectCls}
                  >
                    <option value="">Select brand…</option>
                    {categoryBrands.brush.map((b) => <option key={b} value={b}>{b}</option>)}
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
              )}

              {/* Item Name — hidden for razors (title auto-generated from brand + model) */}
              {!isRazor && (
                <div>
                  <label className={labelCls}>Item Name <span className="text-[#c9a050]">*</span></label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      isItemCategory ? "e.g. Declaration Grooming Sellout" :
                      isBrushCategory ? "e.g. Simpson Chubby 2 Best Badger" :
                      "Item name"
                    }
                    maxLength={120}
                    className={inputCls}
                  />
                </div>
              )}

              {/* Percent Remaining + Age + Size — soap, aftershave, edp only */}
              {["soap", "aftershave", "edp"].includes(category) && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Percent Remaining</label>
                      <select
                        value={percentRemaining}
                        onChange={(e) => setPercentRemaining(e.target.value)}
                        className={selectCls}
                      >
                        <option value="">Not specified</option>
                        {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => (
                          <option key={p} value={String(p)}>{p}%</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Approx. Age (months)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={ageMonths}
                        onChange={(e) => setAgeMonths(e.target.value)}
                        placeholder="e.g. 12"
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Size ({category === "soap" ? "oz" : "mL"}) — optional</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      placeholder={category === "soap" ? "e.g. 4" : "e.g. 100"}
                      className={inputCls}
                    />
                  </div>
                </>
              )}

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
              {listingType !== "for_trade" && listingType !== "pif" && (
                <div className="max-w-[220px]">
                  <label className={labelCls}>
                    {listingType === "for_sale" ? "Price (USD)" : "Willing to Pay (USD)"}
                    {listingType === "for_sale" && <span className="text-[#c9a050]"> *</span>}
                    {listingType === "wtb" && <span className="text-gray-600 normal-case font-normal ml-2.5">· optional</span>}
                  </label>
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
              )}

              {/* Condition */}
              <div>
                <label className={labelCls}>
                  Condition
                  {conditionRequired && <span className="text-[#c9a050]"> *</span>}
                  {!conditionRequired && <span className="text-gray-600 normal-case font-normal ml-2.5">· optional</span>}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCondition(condition === c ? "" : c)}
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
