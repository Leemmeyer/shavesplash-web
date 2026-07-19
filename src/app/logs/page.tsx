"use client";

import { useEffect, useState, useMemo } from "react";
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
  razors:"🪒", soaps:"🫧", aftershaves:"💧", balms:"🧴", preshaves:"✨", edpedt:"🌸",
};
function BladeSvg() {
  return (
    <svg width="18" height="11" viewBox="0 0 20 12" fill="none" shapeRendering="crispEdges" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <rect x="1" y="1" width="18" height="10" rx="1.5" stroke="#8898a8" strokeWidth="1.5" fill="#c0c8cc" />
      <ellipse cx="10" cy="6" rx="2.5" ry="2" fill="#111827" stroke="#7888a0" strokeWidth="1" />
      <line x1="2" y1="3.5" x2="6.5" y2="3.5" stroke="#dce8ec" strokeWidth="0.75" />
      <line x1="13.5" y1="3.5" x2="18" y2="3.5" stroke="#dce8ec" strokeWidth="0.75" />
      <line x1="2" y1="8.5" x2="6.5" y2="8.5" stroke="#dce8ec" strokeWidth="0.75" />
      <line x1="13.5" y1="8.5" x2="18" y2="8.5" stroke="#dce8ec" strokeWidth="0.75" />
    </svg>
  );
}
function BrushSvg() {
  return (
    <svg width="12" height="18" viewBox="0 0 14 20" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <ellipse cx="7" cy="6" rx="5.5" ry="5" fill="#d4bc7a" />
      <line x1="7" y1="2" x2="7" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <line x1="4.5" y1="2.5" x2="5.5" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <line x1="9.5" y1="2.5" x2="8.5" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <line x1="2.5" y1="5" x2="4" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <line x1="11.5" y1="5" x2="10" y2="9" stroke="#a08030" strokeWidth="0.8" opacity="0.45" />
      <rect x="4.5" y="10" width="5" height="2" rx="0.3" fill="#9ca3af" />
      <path d="M 5.2 12 C 3 13 2.5 16 4 19 Q 5.5 19.5 7 19.5 Q 8.5 19.5 10 19 C 11.5 16 11 13 8.8 12 Z" fill="#dc2626" />
    </svg>
  );
}
function CategoryIcon({ catId }: { catId: string }) {
  if (catId === 'blades') return <BladeSvg />;
  if (catId === 'brushes') return <BrushSvg />;
  return <span>{CATEGORY_ICONS[catId] ?? '📦'}</span>;
}

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
  isPublic?: boolean; isAnonymous?: boolean;
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
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  initial, inventory, resultOptions, scoreParameters, autoShareSotd, onSave, onClose,
}: {
  initial: ShaveLog | null;
  inventory: InventoryItem[];
  resultOptions: string[];
  scoreParameters: ScoreParameter[];
  autoShareSotd: boolean;
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
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(initial?.photoUrl ?? null);
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

    const logId = initial?.id ?? crypto.randomUUID();
    const resultRank = resultOptions.indexOf(result) + 1;
    const builtScores: Record<string, ScoreEntry> = {};
    for (const p of scoreParameters) {
      const v = scores[p.id] ?? 0;
      if (v > 0) builtScores[p.id] = { value: v, shortName: p.shortName };
    }

    const body = {
      id: logId,
      date: dateInputToTs(dateVal),
      result,
      resultRank: resultRank > 0 ? resultRank : undefined,
      resultOptionsCount: resultOptions.length,
      scores: builtScores,
      selectedItems,
      notes: notes.trim() || undefined,
      ...(!isEdit && { isPublic: autoShareSotd }),
    };

    try {
      if (isEdit && initial) {
        await api.patch(`/api/logs/${initial.id}`, body);
      } else {
        await api.post("/api/logs", body);
      }
      if (photoDataUrl && photoDataUrl !== initial?.photoUrl) {
        await api.post(`/api/logs/${logId}/photo`, { data: photoDataUrl });
      }
      onSave({
        ...body,
        photoUrl: photoDataUrl ?? initial?.photoUrl ?? undefined,
        isPublic: isEdit ? (initial?.isPublic ?? false) : autoShareSotd,
        isAnonymous: initial?.isAnonymous ?? false,
      } as ShaveLog);
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
                  const items = (itemsByCat[catId] ?? []).slice().sort((a, b) =>
                    `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`)
                  );
                  const sel = selectedItems[catId];
                  const label = CATEGORY_LABELS[catId] ?? catId;
                  return (
                    <div key={catId}>
                      <div className="flex items-center gap-2">
                        <span className="w-6 flex items-center justify-center"><CategoryIcon catId={catId} /></span>
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

          {/* Photo */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Photo</label>
            {photoDataUrl ? (
              <div className="relative rounded-xl overflow-hidden bg-[#242424]">
                <img src={photoDataUrl} alt="Shave photo" className="w-full object-cover max-h-48" />
                <button
                  type="button"
                  onClick={() => setPhotoDataUrl(null)}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm transition-colors"
                >✕</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-[#c9a050]/40 transition-colors bg-[#242424]/50">
                <span className="text-gray-500 text-sm">Click to upload photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) setPhotoDataUrl(await fileToDataUrl(file));
                }} />
              </label>
            )}
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
  const [autoShareSotd, setAutoShareSotd] = useState(true);
  const [autoShareLoading, setAutoShareLoading] = useState(false);
  const [sotdUpdating, setSotdUpdating] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ logs: ShaveLog[] }>("/api/logs").then((d) => d.logs).catch(() => [] as ShaveLog[]),
      api.get<{ items: InventoryItem[] }>("/api/inventory").then((d) => d.items).catch(() => [] as InventoryItem[]),
      api.get<{ resultOptions: string[]; scoreParameters: ScoreParameter[] }>("/api/preferences")
        .catch(() => ({ resultOptions: DEFAULT_RESULT_OPTIONS, scoreParameters: DEFAULT_SCORE_PARAMETERS })),
      api.get<{ autoShareSotd?: boolean }>("/api/bst/profile").catch(() => ({ autoShareSotd: false })),
    ]).then(([l, inv, prefs, profile]) => {
      setLogs(l.sort((a, b) => b.date - a.date));
      setInventory(inv);
      setResultOptions(prefs.resultOptions);
      setScoreParameters(prefs.scoreParameters);
      setAutoShareSotd(profile.autoShareSotd ?? true);
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

  const handleAutoShareToggle = async (val: boolean) => {
    setAutoShareLoading(true);
    try {
      await api.patch("/api/bst/profile", { autoShareSotd: val });
      setAutoShareSotd(val);
    } catch { /* ignore */ } finally { setAutoShareLoading(false); }
  };

  const handleSotdToggle = async (log: ShaveLog, isPublic: boolean) => {
    setSotdUpdating(log.id);
    try {
      await api.patch(`/api/logs/${log.id}/sotd`, { isPublic, isAnonymous: log.isAnonymous ?? false });
      setLogs((prev) => prev.map((l) => l.id === log.id ? { ...l, isPublic } : l));
    } catch { /* ignore */ } finally { setSotdUpdating(null); }
  };

  const handleAnonToggle = async (log: ShaveLog, isAnonymous: boolean) => {
    setSotdUpdating(log.id);
    try {
      await api.patch(`/api/logs/${log.id}/sotd`, { isPublic: log.isPublic ?? false, isAnonymous });
      setLogs((prev) => prev.map((l) => l.id === log.id ? { ...l, isAnonymous } : l));
    } catch { /* ignore */ } finally { setSotdUpdating(null); }
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

      {/* Auto-share SOTD toggle */}
      <div className="mb-6 bg-[#1e1e1e] rounded-xl border border-white/5 px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[#f5f2eb] font-medium">Auto-share new shaves to SOTD</p>
          <p className="text-xs text-gray-500 mt-0.5">All future shave entries will appear in the public community feed</p>
        </div>
        <button
          onClick={() => handleAutoShareToggle(!autoShareSotd)}
          disabled={autoShareLoading}
          aria-label="Toggle auto-share"
          className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${autoShareSotd ? "bg-[#c9a050]" : "bg-white/10"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${autoShareSotd ? "left-5" : "left-0.5"}`} />
        </button>
      </div>

      {/* Modals */}
      {(showForm || editLog) && (
        <LogForm
          initial={editLog}
          inventory={inventory}
          resultOptions={resultOptions}
          scoreParameters={scoreParameters}
          autoShareSotd={autoShareSotd}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditLog(null); }}
        />
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl leading-none">✕</button>
          <img src={lightboxUrl} alt="Shave photo" className="max-w-full max-h-full object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
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
                        {log.photoUrl && (
                          <img src={log.photoUrl} alt="" className="w-9 h-9 rounded-md object-cover flex-shrink-0 opacity-90" />
                        )}
                        {avg !== null && (
                          <span className="text-[#c9a050] text-sm font-semibold w-10 text-right flex-shrink-0">{avg.toFixed(1)}</span>
                        )}
                        <span className="text-gray-400 ml-1 text-xs">{isExpanded ? "▲" : "▼"}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditLog(log); setShowForm(false); }}
                          className="ml-1 text-gray-400 hover:text-[#c9a050] transition-colors text-xs px-1.5 py-0.5 rounded"
                        >✎</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(log.id); }}
                          className="text-gray-400 hover:text-red-400 transition-colors text-xs px-1.5 py-0.5 rounded"
                        >✕</button>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-4">
                          {/* Photo + Gear side by side */}
                          {(log.photoUrl || usedItems.length > 0) && (
                            <div className="flex gap-3 items-start">
                              {log.photoUrl && (
                                <button onClick={() => setLightboxUrl(log.photoUrl!)} className="flex-shrink-0 w-1/2 rounded-xl overflow-hidden bg-[#242424] block cursor-zoom-in">
                                  <img src={log.photoUrl} alt="Shave photo" className="w-full object-cover max-h-36" />
                                </button>
                              )}
                              {usedItems.length > 0 && (
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-600 text-xs uppercase tracking-wider mb-2">Gear Used</p>
                                  <div className="space-y-1.5">
                                    {usedItems.map(([catId, s]) => (
                                      <div key={catId} className="flex items-start gap-1.5">
                                        <span className="mt-0.5 flex-shrink-0"><CategoryIcon catId={catId} /></span>
                                        <span className="text-gray-300 text-xs leading-snug">
                                          {s.itemName}
                                          {s.plate && <span className="text-gray-500"> · {s.plate}</span>}
                                          {s.bladeUses != null && <span className="text-gray-500"> · {s.bladeUses} uses</span>}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
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

                          {/* SOTD sharing */}
                          <div className="pt-1 border-t border-white/5 flex items-center justify-between gap-3">
                            <p className="text-gray-600 text-xs uppercase tracking-wider">Share to SOTD feed</p>
                            <div className="flex items-center gap-3">
                              {log.isPublic && (
                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={log.isAnonymous ?? false}
                                    onChange={(e) => handleAnonToggle(log, e.target.checked)}
                                    disabled={sotdUpdating === log.id}
                                    className="accent-[#c9a050] w-3.5 h-3.5"
                                  />
                                  <span className="text-xs text-gray-500">Anonymous</span>
                                </label>
                              )}
                              <button
                                onClick={() => handleSotdToggle(log, !log.isPublic)}
                                disabled={sotdUpdating === log.id}
                                aria-label="Toggle SOTD sharing"
                                className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${log.isPublic ? "bg-[#c9a050]" : "bg-white/10"}`}
                              >
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${log.isPublic ? "left-5" : "left-0.5"}`} />
                              </button>
                            </div>
                          </div>
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
