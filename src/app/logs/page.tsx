"use client";

import { useEffect, useState, useMemo } from "react";
import AppNav from "@/components/AppNav";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

// Fallback defaults (used if preferences haven't been saved yet)
const DEFAULT_RESULT_OPTIONS = [
  "DFS", "DFS+/DFS", "DFS+", "BBS-/DFS+", "BBS-", "BBS/BBS-", "BBS", "BBS+/BBS", "BBS+",
];

const DEFAULT_SCORE_PARAMETERS = [
  { id: "efficiency",  name: "Efficiency",  shortName: "Eff"  },
  { id: "comfort",     name: "Comfort",     shortName: "Comf" },
  { id: "easeOfUse",  name: "Ease of Use", shortName: "Ease" },
  { id: "consistency", name: "Consistency", shortName: "Cons" },
];

const SORT_OPTIONS = [
  { value: "newest",         label: "Newest First" },
  { value: "oldest",         label: "Oldest First" },
  { value: "highest_score",  label: "Highest Score" },
  { value: "lowest_score",   label: "Lowest Score" },
  { value: "highest_result", label: "Best Result" },
  { value: "lowest_result",  label: "Lowest Result" },
];

const CATEGORY_ORDER = ["razors","blades","brushes","soaps","aftershaves","balms","preshaves","edpedt"];
const CATEGORY_LABELS: Record<string, string> = {
  razors:"Razor", blades:"Blade", brushes:"Brush", soaps:"Soap",
  aftershaves:"Aftershave", balms:"Balm", preshaves:"Preshave", edpedt:"EDP/EDT",
};
const CATEGORY_ICONS: Record<string, string> = {
  razors:"🪒", blades:"⚡", brushes:"🖌️", soaps:"🫧",
  aftershaves:"💧", balms:"🧴", preshaves:"✨", edpedt:"🌸",
};

type ScoreEntry = { value: number; shortName: string } | number;
type SelectedItem = { itemId?: string; itemName?: string; plate?: string; bladeUses?: number };
type RazorPlate = { name: string; type: string; bladeGap?: number; exposure?: number };
type InventoryItem = { id: string; categoryId: string; name: string; brand: string; plates?: RazorPlate[] };

type ShaveLog = {
  id: string; date: number; result: string;
  resultRank?: number; resultOptionsCount?: number;
  scores: Record<string, ScoreEntry>;
  selectedItems: Record<string, SelectedItem>;
  notes?: string; photoUrl?: string;
};

function getScoreValue(score: ScoreEntry): number {
  return typeof score === "number" ? score : score.value;
}
function getScoreShortName(score: ScoreEntry, fallback: string): string {
  return typeof score === "number" ? fallback : score.shortName;
}
function avgScore(scores: Record<string, ScoreEntry>): number | null {
  const vals = Object.values(scores).map(getScoreValue).filter((v) => v > 0);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", year:"numeric" });
}
function sortLogs(logs: ShaveLog[], sort: string, resultOptions: string[]): ShaveLog[] {
  return [...logs].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.date - b.date;
      case "highest_score": {
        const as = avgScore(a.scores) ?? -1;
        const bs = avgScore(b.scores) ?? -1;
        return bs - as;
      }
      case "lowest_score": {
        const as = avgScore(a.scores) ?? Infinity;
        const bs = avgScore(b.scores) ?? Infinity;
        return as - bs;
      }
      case "highest_result": {
        const ar = a.resultRank ?? (resultOptions.indexOf(a.result) + 1);
        const br = b.resultRank ?? (resultOptions.indexOf(b.result) + 1);
        return br - ar;
      }
      case "lowest_result": {
        const ar = a.resultRank ?? (resultOptions.indexOf(a.result) + 1);
        const br = b.resultRank ?? (resultOptions.indexOf(b.result) + 1);
        return ar - br;
      }
      default: // "newest"
        return b.date - a.date;
    }
  });
}
function groupByMonth(logs: ShaveLog[]): [string, ShaveLog[]][] {
  const groups = new Map<string, ShaveLog[]>();
  for (const log of logs) {
    const key = new Date(log.date).toLocaleDateString("en-US", { month:"long", year:"numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(log);
  }
  return Array.from(groups.entries());
}
function resultColor(result: string, options: string[]): string {
  const idx = options.indexOf(result);
  if (idx < 0) return "#6b7280";
  // Interpolate from red-ish (worst) to green (best) across however many options exist
  const colors = ["#b45309","#d97706","#f59e0b","#fbbf24","#a3e635","#86efac","#4ade80","#22c55e","#16a34a"];
  const step = (colors.length - 1) / Math.max(options.length - 1, 1);
  return colors[Math.round(idx * step)] ?? "#6b7280";
}
function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dateInputToTs(val: string): number {
  const [y, m, d] = val.split("-").map(Number);
  return new Date(y, m-1, d, 12, 0, 0).getTime();
}

// ── Score rating widget ──────────────────────────────────────────────────────
function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 text-sm w-24 flex-shrink-0">{label}</span>
      <div className="flex gap-1 flex-1">
        {Array.from({length:10},(_,i)=>i+1).map((n) => (
          <button key={n} type="button" onClick={() => onChange(value===n ? 0 : n)}
            className={`flex-1 h-7 rounded text-xs font-medium transition-colors ${
              n <= value ? "bg-[#c9a050] text-[#1a1a1a]" : "bg-[#242424] border border-white/10 text-gray-600 hover:border-white/20"
            }`}>{n}</button>
        ))}
      </div>
      <span className="text-[#c9a050] text-sm font-semibold w-6 text-right">{value||"–"}</span>
    </div>
  );
}

type ScoreParameter = { id: string; name: string; shortName: string };

// ── Add/Edit form modal ──────────────────────────────────────────────────────
function LogForm({
  initial, inventory, resultOptions, scoreParameters, onSave, onClose,
}: {
  initial: ShaveLog | null;
  inventory: InventoryItem[];
  resultOptions: string[];
  scoreParameters: ScoreParameter[];
  onSave: (log: ShaveLog) => void;
  onClose: () => void;
}) {
  const isEdit = !!initial;

  const [dateVal, setDateVal] = useState(initial ? toDateInputValue(initial.date) : toDateInputValue(Date.now()));
  const [result, setResult] = useState(initial?.result ?? "BBS");
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const s: Record<string, number> = {};
    for (const p of scoreParameters) {
      const raw = initial?.scores[p.id];
      s[p.id] = raw !== undefined ? getScoreValue(raw) : 0;
    }
    return s;
  });
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>(() => initial?.selectedItems ?? {});
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsByCat = useMemo(() => {
    const map: Record<string, InventoryItem[]> = {};
    for (const item of inventory) {
      if (!map[item.categoryId]) map[item.categoryId] = [];
      map[item.categoryId].push(item);
    }
    return map;
  }, [inventory]);

  const selectedRazor = useMemo(() => {
    const sel = selectedItems["razors"];
    if (!sel?.itemId) return null;
    return inventory.find((i) => i.id === sel.itemId) ?? null;
  }, [selectedItems, inventory]);

  const setItemSelection = (catId: string, itemId: string, itemName: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [catId]: itemId ? { itemId, itemName, ...(prev[catId]?.bladeUses ? { bladeUses: prev[catId].bladeUses } : {}) } : {},
    }));
  };
  const clearItem = (catId: string) => {
    setSelectedItems((prev) => { const n = { ...prev }; delete n[catId]; return n; });
  };

  const handleSave = async () => {
    if (!dateVal) { setError("Date is required"); return; }
    if (!result) { setError("Result is required"); return; }
    setError(null); setSaving(true);

    const resultRank = resultOptions.indexOf(result) + 1;
    const builtScores: Record<string, ScoreEntry> = {};
    for (const p of scoreParameters) {
      const v = scores[p.id] ?? 0;
      if (v > 0) builtScores[p.id] = { value: v, shortName: p.shortName };
    }

    const body: Omit<ShaveLog,"id"> & { id?: string } = {
      id: initial?.id ?? crypto.randomUUID(),
      date: dateInputToTs(dateVal),
      result,
      resultRank: resultRank > 0 ? resultRank : undefined,
      resultOptionsCount: resultOptions.length,
      scores: builtScores,
      selectedItems,
      notes: notes.trim() || undefined,
    };

    try {
      if (isEdit && initial) {
        await api.patch(`/api/logs/${initial.id}`, body);
      } else {
        await api.post("/api/logs", body);
      }
      onSave(body as ShaveLog);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  };

  const categories = CATEGORY_ORDER.filter((id) => itemsByCat[id]?.length);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 w-full max-w-lg my-8">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-[#f5f2eb] font-semibold text-lg">{isEdit ? "Edit Entry" : "New Log Entry"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-[#f5f2eb] transition-colors text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-6">
          {/* Date */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
            <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)}
              className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50 [color-scheme:dark]" />
          </div>

          {/* Result */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Result</label>
            <div className="flex flex-wrap gap-1.5">
              {[...resultOptions].reverse().map((r) => (
                <button key={r} type="button" onClick={() => setResult(r)}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors"
                  style={{
                    backgroundColor: result === r ? resultColor(r, resultOptions) + "33" : "transparent",
                    borderColor: result === r ? resultColor(r, resultOptions) : "rgba(255,255,255,0.1)",
                    color: result === r ? resultColor(r, resultOptions) : "#9ca3af",
                  }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Scores */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-3">Scores</label>
            <div className="space-y-2.5">
              {scoreParameters.map((p) => (
                <RatingRow key={p.id} label={p.name} value={scores[p.id] ?? 0}
                  onChange={(v) => setScores((prev) => ({ ...prev, [p.id]: v }))} />
              ))}
            </div>
          </div>

          {/* Gear */}
          {categories.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Gear Used</label>
              <div className="space-y-2">
                {categories.map((catId) => {
                  const items = itemsByCat[catId] ?? [];
                  const sel = selectedItems[catId];
                  const icon = CATEGORY_ICONS[catId] ?? "📦";
                  const label = CATEGORY_LABELS[catId] ?? catId;
                  return (
                    <div key={catId}>
                      <div className="flex items-center gap-2">
                        <span className="text-base w-6 text-center">{icon}</span>
                        <select
                          value={sel?.itemId ?? ""}
                          onChange={(e) => {
                            const item = items.find((i) => i.id === e.target.value);
                            if (item) setItemSelection(catId, item.id, `${item.brand} ${item.name}`);
                            else clearItem(catId);
                          }}
                          className="flex-1 bg-[#242424] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50"
                        >
                          <option value="">{label}…</option>
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>{item.brand} {item.name}</option>
                          ))}
                        </select>
                        {sel?.itemId && (
                          <button type="button" onClick={() => clearItem(catId)}
                            className="text-gray-600 hover:text-red-400 transition-colors text-sm">✕</button>
                        )}
                      </div>

                      {/* Razor plate selector */}
                      {catId === "razors" && selectedRazor?.plates && selectedRazor.plates.length > 0 && (
                        <div className="ml-8 mt-1.5">
                          <select
                            value={sel?.plate ?? ""}
                            onChange={(e) => setSelectedItems((prev) => ({
                              ...prev,
                              razors: { ...prev.razors, plate: e.target.value || undefined },
                            }))}
                            className="w-full bg-[#242424] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50"
                          >
                            <option value="">Plate (optional)</option>
                            {selectedRazor.plates.map((p) => (
                              <option key={p.name} value={p.name}>{p.type} – {p.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Blade uses */}
                      {catId === "blades" && sel?.itemId && (
                        <div className="ml-8 mt-1.5 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Uses:</span>
                          <input
                            type="number" min={0} placeholder="0"
                            value={sel.bladeUses ?? ""}
                            onChange={(e) => setSelectedItems((prev) => ({
                              ...prev,
                              blades: { ...prev.blades, bladeUses: e.target.value ? parseInt(e.target.value, 10) : undefined },
                            }))}
                            className="w-20 bg-[#242424] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="How did the shave go?"
              className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 resize-none" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-[#f5f2eb] transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex-1 py-3 rounded-xl bg-[#c9a050] text-[#1a1a1a] font-semibold text-sm hover:bg-[#d4aa60] transition-colors disabled:opacity-50">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Entry"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function LogsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppNav />
      <AuthGuard><LogsContent /></AuthGuard>
    </div>
  );
}

function LogsContent() {
  const [logs, setLogs] = useState<ShaveLog[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [resultOptions, setResultOptions]     = useState<string[]>(DEFAULT_RESULT_OPTIONS);
  const [scoreParameters, setScoreParameters] = useState<ScoreParameter[]>(DEFAULT_SCORE_PARAMETERS);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editLog, setEditLog] = useState<ShaveLog | null>(null);
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    Promise.all([
      api.get<{ logs: ShaveLog[] }>("/api/logs").then((d) => d.logs).catch(() => [] as ShaveLog[]),
      api.get<{ items: InventoryItem[] }>("/api/inventory").then((d) => d.items).catch(() => [] as InventoryItem[]),
      api.get<{ resultOptions: string[]; scoreParameters: ScoreParameter[] }>("/api/preferences")
        .catch(() => ({ resultOptions: DEFAULT_RESULT_OPTIONS, scoreParameters: DEFAULT_SCORE_PARAMETERS })),
    ]).then(([l, inv, prefs]) => {
      setLogs(l.sort((a, b) => b.date - a.date));
      setInventory(inv);
      setResultOptions(prefs.resultOptions);
      setScoreParameters(prefs.scoreParameters);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/api/logs/${id}`);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setConfirmDelete(null);
    } catch { /* ignore */ } finally { setDeleting(false); }
  };

  const handleSaved = (log: ShaveLog) => {
    setLogs((prev) => {
      const exists = prev.find((l) => l.id === log.id);
      const updated = exists
        ? prev.map((l) => l.id === log.id ? log : l)
        : [log, ...prev];
      return updated.sort((a, b) => b.date - a.date);
    });
    setShowForm(false);
    setEditLog(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  const grouped = groupByMonth(sortLogs(logs, sort, resultOptions));
  const totalAvg = logs.length
    ? logs.reduce((sum, l) => sum + (avgScore(l.scores) ?? 0), 0) / logs.length
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 w-full">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#c9a050] mb-1">Shave History</h1>
          <p className="text-gray-500 text-sm">{logs.length} shave{logs.length !== 1 ? "s" : ""} logged</p>
        </div>
        <div className="flex items-center gap-3">
          {totalAvg !== null && (
            <div className="text-right">
              <p className="text-gray-500 text-xs">Avg Score</p>
              <p className="text-[#c9a050] text-2xl font-bold">{totalAvg.toFixed(1)}</p>
            </div>
          )}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-[#242424] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50 cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditLog(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#c9a050] text-[#1a1a1a] font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-[#d4aa60] transition-colors"
          >
            + New Entry
          </button>
        </div>
      </div>

      {/* Modals */}
      {(showForm || editLog) && (
        <LogForm
          initial={editLog}
          inventory={inventory}
          resultOptions={resultOptions}
          scoreParameters={scoreParameters}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditLog(null); }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#242424] rounded-2xl border border-white/10 p-6 max-w-sm w-full">
            <h2 className="text-[#f5f2eb] font-bold text-lg mb-2">Delete this shave?</h2>
            <p className="text-gray-400 text-sm mb-6">This entry will be removed from your history.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-[#f5f2eb] transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-60">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {logs.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-5xl mb-4">📔</p>
          <p className="text-lg mb-2">No shaves logged yet</p>
          <p className="text-sm">Add an entry above or log shaves in the mobile app — they sync automatically.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(([month, monthLogs]) => (
            <section key={month}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">{month}</h2>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-gray-600 text-xs">{monthLogs.length} shave{monthLogs.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-2">
                {monthLogs.map((log) => {
                  const avg = avgScore(log.scores);
                  const isExpanded = expanded === log.id;
                  const color = resultColor(log.result, resultOptions);
                  const usedItems = Object.entries(log.selectedItems)
                    .filter(([, s]) => s.itemName)
                    .sort(([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));

                  return (
                    <div key={log.id} className="bg-[#1e1e1e] rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors">
                      <button
                        onClick={() => setExpanded(isExpanded ? null : log.id)}
                        className="w-full text-left px-4 py-3.5 flex items-center gap-3"
                      >
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[#f5f2eb] text-sm font-medium w-40 flex-shrink-0">{formatDate(log.date)}</span>
                        <span className="text-sm font-bold w-20 flex-shrink-0" style={{ color }}>{log.result}</span>
                        <span className="text-gray-500 text-sm truncate flex-1 hidden sm:block">
                          {usedItems.slice(0,3).map(([,s])=>s.itemName).join(" · ")}
                        </span>
                        {avg !== null && (
                          <span className="text-[#c9a050] text-sm font-semibold w-10 text-right flex-shrink-0">{avg.toFixed(1)}</span>
                        )}
                        <span className="text-gray-600 ml-1 text-xs">{isExpanded ? "▲" : "▼"}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditLog(log); setShowForm(false); }}
                          className="ml-1 text-gray-600 hover:text-[#c9a050] transition-colors text-xs px-1.5 py-0.5 rounded"
                        >✎</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(log.id); }}
                          className="text-gray-600 hover:text-red-400 transition-colors text-xs px-1.5 py-0.5 rounded"
                        >✕</button>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-4">
                          {/* Gear */}
                          {usedItems.length > 0 && (
                            <div>
                              <p className="text-gray-600 text-xs uppercase tracking-wider mb-2">Gear Used</p>
                              <div className="flex flex-wrap gap-2">
                                {usedItems.map(([catId, s]) => (
                                  <div key={catId} className="bg-[#242424] rounded-lg px-2.5 py-1.5 border border-white/5">
                                    <span className="text-gray-600 text-[10px] mr-1">{CATEGORY_ICONS[catId]}</span>
                                    <span className="text-gray-300 text-xs">{s.itemName}</span>
                                    {s.plate && <span className="text-gray-500 text-xs ml-1">· {s.plate}</span>}
                                    {s.bladeUses != null && <span className="text-gray-500 text-xs ml-1">· {s.bladeUses} uses</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Scores */}
                          {Object.keys(log.scores).length > 0 && (
                            <div>
                              <p className="text-gray-600 text-xs uppercase tracking-wider mb-2">Scores</p>
                              <div className="flex flex-wrap gap-4">
                                {scoreParameters.map((p) => {
                                  const raw = log.scores[p.id];
                                  if (raw === undefined) return null;
                                  const val = getScoreValue(raw);
                                  if (!val) return null;
                                  const label = getScoreShortName(raw, p.shortName);
                                  return (
                                    <div key={p.id} className="text-center min-w-[40px]">
                                      <p className="text-[#c9a050] text-lg font-bold">{val}</p>
                                      <p className="text-gray-600 text-xs">{label}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {log.notes && (
                            <div>
                              <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">Notes</p>
                              <p className="text-[#f5f2eb] text-sm leading-relaxed">{log.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
