"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

type CategoryBrands = {
  category: string;
  label: string;
  brands: { name: string; models: string[]; materials: string[] }[];
};

type WatchlistAlert = {
  id: string;
  category: string;
  brand: string | null;
  model: string | null;
  material: string | null;
  keyword: string | null;
  maxPrice: number | null;
  createdAt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  razor: "Razors",
  brush: "Brushes",
  soap: "Soaps",
  aftershave: "Aftershaves",
  edp: "Fragrance",
  misc: "Misc",
};

export default function WatchlistSection() {
  const { session, loading: sessionLoading } = useSession();
  const [isExpert, setIsExpert] = useState(false);
  const [expertLoading, setExpertLoading] = useState(true);
  const [brandsData, setBrandsData] = useState<CategoryBrands[]>([]);
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New alert form state
  const [formCategory, setFormCategory] = useState("razor");
  const [formBrand, setFormBrand] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formMaterial, setFormMaterial] = useState("");
  const [formKeyword, setFormKeyword] = useState("");
  const [formMaxPrice, setFormMaxPrice] = useState("");

  useEffect(() => {
    if (!session) {
      setExpertLoading(false);
      return;
    }
    api.get<{ isExpert: boolean }>("/api/subscriptions/status")
      .then((d) => setIsExpert(d.isExpert))
      .catch(() => {})
      .finally(() => setExpertLoading(false));
  }, [session]);

  useEffect(() => {
    api.get<{ brands: CategoryBrands[] }>("/api/bst/brands")
      .then((d) => setBrandsData(d.brands))
      .catch(() => {});
  }, []);

  const loadAlerts = useCallback(() => {
    if (!session || !isExpert) return;
    setAlertsLoading(true);
    api.get<{ alerts: WatchlistAlert[] }>("/api/bst/alerts")
      .then((d) => setAlerts(d.alerts))
      .catch(() => {})
      .finally(() => setAlertsLoading(false));
  }, [session, isExpert]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Derived brand/model/material options from selected category
  const categoryData = brandsData.find((c) => c.category === formCategory);
  const brandOptions = categoryData?.brands.map((b) => b.name) ?? [];
  const selectedBrandData = categoryData?.brands.find((b) => b.name === formBrand);
  const modelOptions = selectedBrandData?.models ?? [];
  const materialOptions = selectedBrandData?.materials ?? [];

  const resetForm = () => {
    setFormCategory("razor");
    setFormBrand("");
    setFormModel("");
    setFormMaterial("");
    setFormKeyword("");
    setFormMaxPrice("");
    setError(null);
    setShowForm(false);
  };

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/bst/alerts", {
        category: formCategory,
        brand: formBrand || undefined,
        model: formModel || undefined,
        material: formMaterial || undefined,
        keyword: formKeyword || undefined,
        maxPrice: formMaxPrice ? parseFloat(formMaxPrice) : undefined,
      });
      await loadAlerts();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save alert");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/bst/alerts/${id}`);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silent
    }
  };

  if (sessionLoading || expertLoading) return null;

  if (!session) {
    return (
      <div className="mb-8 bg-[#242424] rounded-2xl border border-white/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#c9a050] text-sm font-semibold mb-1">Watchlist Alerts</p>
            <p className="text-gray-500 text-xs">Get notified when items you want hit the marketplace.</p>
          </div>
          <Link href="/sign-in" className="text-sm bg-[#c9a050] text-black font-semibold px-4 py-1.5 rounded-lg hover:bg-[#b8903f] transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!isExpert) {
    return (
      <div className="mb-8 bg-[#242424] rounded-2xl border border-white/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[#f5f2eb] text-sm font-semibold mb-1">Watchlist Alerts <span className="text-xs text-gray-500 font-normal ml-1">Expert only</span></p>
            <p className="text-gray-500 text-xs leading-relaxed">Set alerts for specific razors, brushes, or soaps. Get an email the moment they're listed.</p>
          </div>
          <Link href="/subscribe" className="shrink-0 text-sm bg-[#c9a050] text-black font-semibold px-4 py-1.5 rounded-lg hover:bg-[#b8903f] transition-colors whitespace-nowrap">
            ★ Upgrade
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 bg-[#242424] rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <p className="text-[#f5f2eb] text-sm font-semibold">Watchlist Alerts</p>
          <p className="text-gray-500 text-xs mt-0.5">{alerts.length} active alert{alerts.length !== 1 ? "s" : ""}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm bg-[#c9a050]/10 text-[#c9a050] font-semibold px-4 py-1.5 rounded-lg hover:bg-[#c9a050]/20 transition-colors"
          >
            + Add alert
          </button>
        )}
      </div>

      {/* Add alert form */}
      {showForm && (
        <form onSubmit={handleAddAlert} className="px-5 py-4 border-b border-white/5 space-y-3">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">New Alert</p>

          {/* Category */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Category</label>
            <select
              value={formCategory}
              onChange={(e) => { setFormCategory(e.target.value); setFormBrand(""); setFormModel(""); setFormMaterial(""); }}

              className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50"
            >
              {brandsData.map((c) => (
                <option key={c.category} value={c.category}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Razor: structured brand / model / metal dropdowns */}
          {formCategory === "razor" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Brand <span className="text-gray-600">(optional)</span></label>
                <select
                  value={formBrand}
                  onChange={(e) => { setFormBrand(e.target.value); setFormModel(""); setFormMaterial(""); }}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50"
                >
                  <option value="">Any brand</option>
                  {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Model <span className="text-gray-600">(optional)</span></label>
                <select
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  disabled={!formBrand}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50 disabled:opacity-40"
                >
                  <option value="">Any model</option>
                  {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Metal <span className="text-gray-600">(optional)</span></label>
                <select
                  value={formMaterial}
                  onChange={(e) => setFormMaterial(e.target.value)}
                  disabled={!formBrand}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50 disabled:opacity-40"
                >
                  <option value="">Any metal</option>
                  {materialOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          ) : (
            /* Non-razor: keyword required */
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Keyword <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formKeyword}
                onChange={(e) => setFormKeyword(e.target.value)}
                placeholder={`e.g. "Ghost Town Barber", "Declaration B3", "Aventus"`}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
              />
              <p className="text-gray-600 text-xs mt-1">Matched against listing title and description</p>
            </div>
          )}

          {/* Max price */}
          <div className="max-w-[160px]">
            <label className="text-xs text-gray-500 block mb-1">Max price <span className="text-gray-600">(optional)</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={formMaxPrice}
                onChange={(e) => setFormMaxPrice(e.target.value)}
                placeholder="No limit"
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg pl-6 pr-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#c9a050] text-black font-semibold text-sm px-5 py-2 rounded-lg hover:bg-[#b8903f] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save alert"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-gray-500 hover:text-gray-300 px-3 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Alert list */}
      {alertsLoading ? (
        <div className="px-5 py-4 text-xs text-gray-600">Loading alerts…</div>
      ) : alerts.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-gray-600 text-sm">No alerts yet.</p>
          <p className="text-gray-600 text-xs mt-1">Add one above to get emailed when a match is listed.</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex items-center justify-between px-5 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-[#f5f2eb] text-sm font-medium truncate">
                  {CATEGORY_LABELS[alert.category] ?? alert.category}
                  {alert.category === "razor" ? (
                    <>
                      {alert.brand && <span className="text-gray-400 font-normal"> · {alert.brand}</span>}
                      {alert.model && <span className="text-gray-400 font-normal"> · {alert.model}</span>}
                    </>
                  ) : (
                    alert.keyword && <span className="text-gray-400 font-normal"> · &ldquo;{alert.keyword}&rdquo;</span>
                  )}
                </p>
                <p className="text-gray-600 text-xs mt-0.5">
                  {[
                    alert.category === "razor" ? alert.material : null,
                    alert.maxPrice != null ? `up to $${alert.maxPrice.toFixed(0)}` : null,
                  ].filter(Boolean).join(" · ") || "No price limit"}
                </p>
              </div>
              <button
                onClick={() => handleDelete(alert.id)}
                className="shrink-0 text-gray-600 hover:text-red-400 transition-colors text-xs px-2 py-1"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
