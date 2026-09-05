"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";

type InventoryItem = { id: string; categoryId: string; name: string; brand: string };
type CheckResult = { id: string; isDuplicate: boolean; matchType: "approved" | "pending" | null; matchedName: string | null };

const CATEGORIES = [
  { id: "razors", label: "Razors" },
  { id: "blades", label: "Blades" },
  { id: "brushes", label: "Brushes" },
  { id: "soaps", label: "Shave Soaps" },
  { id: "aftershaves", label: "Aftershaves" },
  { id: "balms", label: "Balms" },
  { id: "preshaves", label: "Preshaves" },
  { id: "edpedt", label: "EDP/EDT" },
];

function catLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function BatchGearSubmitModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checkResults, setCheckResults] = useState<CheckResult[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get<{ items: InventoryItem[] }>("/api/inventory")
      .then((d) => setItems(d.items.filter((i) => i.name?.trim())))
      .catch(() => {})
      .finally(() => setLoadingItems(false));
  }, []);

  const duplicateIds = useMemo(() => new Set((checkResults ?? []).filter((r) => r.isDuplicate).map((r) => r.id)), [checkResults]);
  const resultMap = useMemo(() => Object.fromEntries((checkResults ?? []).map((r) => [r.id, r])), [checkResults]);
  const allSelected = selected.size === items.length && items.length > 0;

  const grouped = useMemo(() => {
    const map: Record<string, InventoryItem[]> = {};
    for (const item of items) (map[item.categoryId] ??= []).push(item);
    return map;
  }, [items]);

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function toggleCat(id: string) {
    setCollapsedCats((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function handleCheck() {
    const toCheck = items.filter((i) => selected.has(i.id));
    if (!toCheck.length) return;
    setChecking(true);
    setError(null);
    try {
      const { results } = await api.post<{ results: CheckResult[] }>("/api/gear/batch-check", {
        items: toCheck.map((i) => ({ id: i.id, categoryId: i.categoryId, brand: i.brand ?? "", name: i.name })),
      });
      setCheckResults(results);
      setSelected((prev) => {
        const next = new Set(prev);
        results.filter((r) => r.isDuplicate).forEach((r) => next.delete(r.id));
        return next;
      });
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setChecking(false);
  }

  async function handleSubmit() {
    const toSubmit = items.filter((i) => selected.has(i.id));
    if (!toSubmit.length) return;
    setSubmitting(true);
    setError(null);
    try {
      const { submitted: count } = await api.post<{ submitted: number }>("/api/gear/batch-submit", {
        items: toSubmit.map((i) => ({ categoryId: i.categoryId, brand: i.brand ?? "", name: i.name })),
      });
      setSubmitted(count);
    } catch {
      setError("Submission failed. Please try again.");
    }
    setSubmitting(false);
  }

  if (submitted !== null) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">✓</div>
          <h3 className="text-white font-semibold text-lg mb-2">Submitted for Review</h3>
          <p className="text-gray-400 text-sm mb-6">{submitted} item{submitted !== 1 ? "s" : ""} added to the Gear Database review queue. Thank you!</p>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-[#c9a050] text-black font-semibold text-sm hover:bg-[#b8903f] transition-colors">Done</button>
        </div>
      </div>
    );
  }

  const duplicateCount = (checkResults ?? []).filter((r) => r.isDuplicate).length;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg flex flex-col" style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div>
            <h2 className="text-white font-semibold text-base">Submit to Gear Database</h2>
            <p className="text-gray-500 text-xs mt-0.5">Select items from your den to submit for review</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Instructional note */}
        <div className="px-5 py-3 border-b border-white/5 shrink-0">
          <p className="text-[#c9a050] text-xs font-medium">Before submitting please add item data and photo.</p>
        </div>

        {/* Banners */}
        {checkResults && duplicateCount > 0 && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
            <p className="text-amber-400 text-xs font-semibold mb-1">{duplicateCount} possible duplicate{duplicateCount !== 1 ? "s" : ""} found</p>
            <p className="text-amber-400/70 text-xs">These have been deselected. You can re-check them to submit anyway.</p>
          </div>
        )}
        {checkResults && duplicateCount === 0 && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 shrink-0">
            <p className="text-green-400 text-xs font-semibold">No duplicates found — all selected items are ready to submit.</p>
          </div>
        )}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 shrink-0">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        {/* Select all */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
          <span className="text-gray-500 text-xs">{selected.size} of {items.length} selected</span>
          <button onClick={toggleAll} className="text-xs text-[#c9a050] hover:text-[#b8903f] transition-colors font-medium">
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        </div>

        {/* Item list */}
        <div className="overflow-y-auto flex-1 px-2 py-2">
          {loadingItems ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-12">No items in your den.</p>
          ) : (
            Object.entries(grouped).map(([catId, catItems]) => (
              <div key={catId} className="mb-1">
                <button
                  onClick={() => toggleCat(catId)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <span className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">{catLabel(catId)}</span>
                  <span className="text-gray-600 text-[10px]">{collapsedCats.has(catId) ? "▶" : "▼"}</span>
                </button>
                {!collapsedCats.has(catId) && catItems.map((item) => {
                  const isSelected = selected.has(item.id);
                  const result = resultMap[item.id];
                  const isDupe = result?.isDuplicate;
                  return (
                    <label key={item.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(item.id)}
                        className="mt-0.5 accent-[#c9a050] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${isSelected ? "text-[#f5f2eb]" : "text-gray-300"}`}>
                          {item.brand ? `${item.brand} ${item.name}` : item.name}
                        </p>
                        {isDupe && (
                          <p className="text-amber-500/70 text-[11px] mt-0.5">
                            {result.matchType === "approved" ? "Already in Gear DB" : "Already pending review"}: {result.matchedName}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/8 shrink-0">
          {!checkResults ? (
            <button
              onClick={handleCheck}
              disabled={checking || selected.size === 0}
              className="w-full py-2.5 rounded-xl bg-[#c9a050] text-black font-semibold text-sm hover:bg-[#b8903f] transition-colors disabled:opacity-40"
            >
              {checking ? "Checking for duplicates…" : `Check ${selected.size} item${selected.size !== 1 ? "s" : ""} for duplicates →`}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || selected.size === 0}
              className="w-full py-2.5 rounded-xl bg-[#c9a050] text-black font-semibold text-sm hover:bg-[#b8903f] transition-colors disabled:opacity-40"
            >
              {submitting ? "Submitting…" : `Submit ${selected.size} item${selected.size !== 1 ? "s" : ""} for review`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
