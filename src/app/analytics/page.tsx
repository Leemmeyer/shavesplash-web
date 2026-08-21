"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";
import SyncNote from "@/components/SyncNote";

// ── Types ──────────────────────────────────────────────────────────────────
type ScoreEntry = { value: number; shortName: string } | number;
type SelectedItem = { itemId?: string; itemName?: string };
type ScoreParameter = { id: string; name: string; shortName: string };
type ShaveLog = {
  id: string; date: number; result: string;
  resultRank?: number; resultOptionsCount?: number;
  scores: Record<string, ScoreEntry>;
  selectedItems: Record<string, SelectedItem>;
  notes?: string;
};
type InventoryItem = { id: string; categoryId: string; name: string; brand: string };

// ── Defaults ───────────────────────────────────────────────────────────────
const DEFAULT_RESULT_OPTIONS = [
  "DFS","DFS+/DFS","DFS+","BBS-/DFS+","BBS-","BBS/BBS-","BBS","BBS+/BBS","BBS+",
];
const DEFAULT_SCORE_PARAMETERS: ScoreParameter[] = [
  { id:"efficiency", name:"Efficiency", shortName:"Eff" },
  { id:"comfort",    name:"Comfort",    shortName:"Comf" },
  { id:"easeOfUse",  name:"Ease of Use",shortName:"Ease" },
  { id:"consistency",name:"Consistency",shortName:"Cons" },
];
const CATEGORY_LABELS: Record<string,string> = {
  razors:"Razors", blades:"Blades", brushes:"Brushes", soaps:"Shave Soaps",
  aftershaves:"Aftershaves", balms:"Balms", preshaves:"Preshaves", edpedt:"EDP/EDT",
};
const CATEGORY_ICONS: Record<string,string> = {
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
const CATEGORY_ORDER = ["razors","blades","brushes","soaps","aftershaves","balms","preshaves","edpedt"];
const LINE_COLORS = ["#c9a050","#60a5fa","#f472b6","#34d399","#a78bfa"];

// ── Helpers ────────────────────────────────────────────────────────────────
function getScoreValue(s: ScoreEntry): number {
  return typeof s === "number" ? s : s.value;
}
function avgScoreOf(scores: Record<string,ScoreEntry>): number | null {
  const vals = Object.values(scores).map(getScoreValue).filter(v => v > 0);
  return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : null;
}
// 0 = worst, 1 = best
function resultNorm(log: ShaveLog, opts: string[]): number | null {
  if (log.resultRank != null && log.resultOptionsCount != null && log.resultOptionsCount > 1) {
    return (log.resultRank - 1) / (log.resultOptionsCount - 1);
  }
  const idx = opts.indexOf(log.result);
  if (idx < 0) return null;
  return opts.length > 1 ? idx / (opts.length - 1) : 1;
}
// 1-based position in resultOptions (for scatter Y-axis)
function resultPos(log: ShaveLog, opts: string[]): number | null {
  const n = resultNorm(log, opts);
  return n !== null ? n * (opts.length - 1) + 1 : null;
}
function normColor(n: number): string {
  const stops = ["#b45309","#d97706","#f59e0b","#fbbf24","#a3e635","#86efac","#4ade80","#22c55e","#16a34a"];
  const raw = Math.max(0, Math.min(1, n)) * (stops.length - 1);
  const lo = Math.floor(raw);
  return raw - lo < 0.5 ? stops[lo] : stops[Math.min(lo + 1, stops.length - 1)];
}
function scoreColor(v: number): string {
  if (v >= 9) return "#22c55e";
  if (v >= 7) return "#c9a050";
  if (v >= 5) return "#f97316";
  return "#ef4444";
}
function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length < 3) return null;
  const n = xs.length;
  const mx = xs.reduce((a,b) => a+b,0)/n, my = ys.reduce((a,b) => a+b,0)/n;
  const num = xs.reduce((s,x,i) => s+(x-mx)*(ys[i]-my), 0);
  const dx = Math.sqrt(xs.reduce((s,x) => s+(x-mx)**2, 0));
  const dy = Math.sqrt(ys.reduce((s,y) => s+(y-my)**2, 0));
  return (dx && dy) ? num/(dx*dy) : null;
}
function linReg(xs: number[], ys: number[]): { a: number; b: number } | null {
  if (xs.length < 2) return null;
  const n = xs.length;
  const mx = xs.reduce((a,b) => a+b,0)/n, my = ys.reduce((a,b) => a+b,0)/n;
  const denom = xs.reduce((s,x) => s+(x-mx)**2, 0) || 0.0001;
  const b = xs.reduce((s,x,i) => s+(x-mx)*(ys[i]-my), 0) / denom;
  return { a: my - b*mx, b };
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function nearestResult(norm: number, opts: string[]): string {
  if (!opts.length) return "—";
  return opts[Math.round(Math.max(0, Math.min(1, norm)) * (opts.length - 1))];
}
function corrLabel(r: number): string {
  const a = Math.abs(r), d = r >= 0 ? "positive" : "negative";
  if (a >= 0.7) return `Strong ${d} correlation`;
  if (a >= 0.4) return `Moderate ${d} correlation`;
  if (a >= 0.1) return `Weak ${d} correlation`;
  return "No significant correlation";
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AuthGuard><AnalyticsContent /></AuthGuard>
    </div>
  );
}

const RANGE_OPTIONS = [
  { key: "week", label: "This Week" },
  { key: "30d",  label: "30 Days" },
  { key: "90d",  label: "90 Days" },
  { key: "1yr",  label: "1 Year" },
  { key: "all",  label: "All Time" },
] as const;
type Range = typeof RANGE_OPTIONS[number]["key"];

function AnalyticsContent() {
  const [logs, setLogs] = useState<ShaveLog[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [resultOptions, setResultOptions] = useState<string[]>(DEFAULT_RESULT_OPTIONS);
  const [scoreParameters, setScoreParameters] = useState<ScoreParameter[]>(DEFAULT_SCORE_PARAMETERS);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("all");

  useEffect(() => {
    Promise.all([
      api.get<{ logs: ShaveLog[] }>("/api/logs").then(d => d.logs).catch(() => [] as ShaveLog[]),
      api.get<{ items: InventoryItem[] }>("/api/inventory").then(d => d.items).catch(() => [] as InventoryItem[]),
      api.get<{ resultOptions: string[]; scoreParameters: ScoreParameter[] }>("/api/preferences")
        .catch(() => ({ resultOptions: DEFAULT_RESULT_OPTIONS, scoreParameters: DEFAULT_SCORE_PARAMETERS })),
    ]).then(([l, inv, prefs]) => {
      setLogs(l);
      setInventory(inv);
      setResultOptions(prefs.resultOptions);
      setScoreParameters(prefs.scoreParameters);
    }).finally(() => setLoading(false));
  }, []);

  const filteredLogs = useMemo(() => {
    if (range === "all") return logs;
    const days = range === "week" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return logs.filter(l => l.date >= cutoff);
  }, [logs, range]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 w-full">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#c9a050] mb-1">Analytics</h1>
        <p className="text-gray-500 text-sm">{logs.length} shave{logs.length !== 1 ? "s" : ""} analyzed</p>
        <SyncNote />
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-5xl mb-4">📊</p>
          <p className="text-lg mb-2">No data yet</p>
          <p className="text-sm">Log some shaves first — analytics will appear here.</p>
        </div>
      ) : (
        <>
          {/* Global time range toggle */}
          <div className="flex gap-1 mb-12 bg-[#1e1e1e] border border-white/5 rounded-xl p-1 w-fit">
            {RANGE_OPTIONS.map(r => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  range === r.key ? "bg-[#c9a050] text-black" : "text-gray-500 hover:text-gray-300"
                }`}>
                {r.label}
              </button>
            ))}
          </div>

          <div className="space-y-14">
            <PersonalRecordsSection
              logs={filteredLogs} inventory={inventory}
              resultOptions={resultOptions} scoreParameters={scoreParameters}
              range={range}
            />
            <SetupsTableSection filteredLogs={filteredLogs} inventory={inventory} scoreParameters={scoreParameters} />
            <ResultTrendSection logs={filteredLogs} resultOptions={resultOptions} />
            <HeatmapSection logs={logs} resultOptions={resultOptions} />
            <MostUsedGearSection logs={filteredLogs} inventory={inventory} />
            <BladeWearSection logs={logs} inventory={inventory} resultOptions={resultOptions} />
            <GearComparisonSection
              logs={filteredLogs} inventory={inventory}
              resultOptions={resultOptions} scoreParameters={scoreParameters}
            />
            <CorrelationSection
              logs={filteredLogs} resultOptions={resultOptions} scoreParameters={scoreParameters}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ── Section 1: Shave Heat Map ──────────────────────────────────────────────
function HeatmapSection({ logs, resultOptions }: { logs: ShaveLog[]; resultOptions: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ key: string; x: number; y: number } | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const dayData = useMemo(() => {
    const raw: Record<string, ShaveLog[]> = {};
    for (const log of logs) {
      const k = dayKey(new Date(log.date));
      if (!raw[k]) raw[k] = [];
      raw[k].push(log);
    }
    const map: Record<string, { count: number; avgResult: number | null; avgScore: number | null; results: string[] }> = {};
    for (const [k, dl] of Object.entries(raw)) {
      const norms = dl.map(l => resultNorm(l, resultOptions)).filter((r): r is number => r !== null);
      const scores = dl.map(l => avgScoreOf(l.scores)).filter((s): s is number => s !== null);
      map[k] = {
        count: dl.length,
        results: dl.map(l => l.result),
        avgResult: norms.length ? norms.reduce((a,b) => a+b,0)/norms.length : null,
        avgScore: scores.length ? scores.reduce((a,b) => a+b,0)/scores.length : null,
      };
    }
    return map;
  }, [logs, resultOptions]);

  const { weeks, monthLabels } = useMemo(() => {
    const start = new Date(today);
    start.setDate(today.getDate() - 364);
    start.setDate(start.getDate() - start.getDay()); // snap to Sunday
    const weeks: Date[][] = [];
    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = -1, col = 0;
    const cur = new Date(start);
    while (cur <= today) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(cur);
        d.setDate(cur.getDate() + i);
        week.push(d);
        if (d.getDate() === 1 && d.getMonth() !== lastMonth && d <= today) {
          monthLabels.push({ col, label: d.toLocaleDateString("en-US", { month: "short" }) });
          lastMonth = d.getMonth();
        }
      }
      weeks.push(week);
      cur.setDate(cur.getDate() + 7);
      col++;
    }
    return { weeks, monthLabels };
  }, [today]);

  const CELL = 13, GAP = 3, STEP = 16;

  const getCellBg = (k: string, day: Date) => {
    if (day > today) return "transparent";
    const d = dayData[k];
    if (!d) return "#1a1a1a";
    return d.avgResult !== null ? normColor(d.avgResult) : "#c9a050";
  };

  const ttData = tooltip ? dayData[tooltip.key] : null;
  const ttDate = tooltip ? new Date(tooltip.key + "T12:00:00") : null;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-[#f5f2eb] font-semibold text-xl mb-1">Shave Heat Map</h2>
        <p className="text-gray-500 text-xs">Past 52 weeks · each cell = one day · color = result quality</p>
      </div>

      <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-5 overflow-x-auto">
        <div ref={containerRef} className="relative inline-flex gap-2">
          {/* Day-of-week labels */}
          <div className="flex flex-col shrink-0" style={{ gap: GAP, paddingTop: 22 }}>
            {["","Mon","","Wed","","Fri",""].map((l, i) => (
              <div key={i} className="text-gray-600 text-[9px] flex items-center justify-end pr-1"
                style={{ width: 24, height: CELL }}>{l}</div>
            ))}
          </div>

          <div className="flex flex-col">
            {/* Month labels */}
            <div className="relative h-5" style={{ minWidth: weeks.length * STEP }}>
              {monthLabels.map(({ col, label }) => (
                <span key={`${col}-${label}`} className="absolute text-[10px] text-gray-500"
                  style={{ left: col * STEP }}>{label}</span>
              ))}
            </div>

            {/* Cell grid */}
            <div className="flex" style={{ gap: GAP }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((day, di) => {
                    const k = dayKey(day);
                    const has = !!dayData[k];
                    return (
                      <div key={di}
                        style={{
                          width: CELL, height: CELL, borderRadius: 2,
                          backgroundColor: getCellBg(k, day),
                          cursor: has ? "pointer" : "default",
                          border: has ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.03)",
                        }}
                        onMouseEnter={(e) => {
                          if (!has) return;
                          const cr = containerRef.current?.getBoundingClientRect();
                          const er = e.currentTarget.getBoundingClientRect();
                          if (cr) setTooltip({ key: k, x: er.left - cr.left + CELL/2, y: er.top - cr.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Tooltip */}
          {tooltip && ttData && ttDate && (
            <div className="absolute z-20 bg-[#2a2a2a] border border-white/15 rounded-xl p-3 pointer-events-none shadow-xl text-xs"
              style={{
                left: Math.max(0, Math.min(tooltip.x - 75, weeks.length * STEP - 160)),
                top: Math.max(0, tooltip.y - 95),
                width: 160,
              }}>
              <p className="text-[#f5f2eb] font-semibold mb-1">
                {ttDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-gray-400">{ttData.count} shave{ttData.count !== 1 ? "s" : ""}</p>
              {ttData.results.length > 0 && (
                <p className="mt-0.5 font-medium"
                  style={{ color: ttData.avgResult !== null ? normColor(ttData.avgResult) : "#c9a050" }}>
                  {ttData.results.join(", ")}
                </p>
              )}
              {ttData.avgScore !== null && (
                <p className="text-gray-500 mt-0.5">Avg score: {ttData.avgScore.toFixed(1)}</p>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-5 flex-wrap">
          <span className="text-gray-600 text-[10px]">Worst</span>
          {["#b45309","#d97706","#f59e0b","#fbbf24","#a3e635","#4ade80","#22c55e"].map(c => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: c }} />
          ))}
          <span className="text-gray-600 text-[10px]">Best</span>
          <div className="ml-3 flex items-center gap-1.5">
            <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)" }} />
            <span className="text-gray-600 text-[10px]">No shave</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section 2: Gear Comparison ─────────────────────────────────────────────
type ItemStat = {
  id: string; item: InventoryItem; count: number;
  avgResult: number | null; resultLabel: string | null;
  scoreStats: Record<string, number | null>;
};

function GearComparisonSection({ logs, inventory, resultOptions, scoreParameters }: {
  logs: ShaveLog[]; inventory: InventoryItem[];
  resultOptions: string[]; scoreParameters: ScoreParameter[];
}) {
  const [category, setCategory] = useState("razors");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const categories = useMemo(
    () => CATEGORY_ORDER.filter(c => inventory.some(i => i.categoryId === c)),
    [inventory]
  );

  const categoryItems = useMemo(
    () => inventory
      .filter(i => i.categoryId === category)
      .sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name)),
    [inventory, category]
  );

  const itemLogCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
      const id = log.selectedItems[category]?.itemId;
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [logs, category]);

  const stats = useMemo((): ItemStat[] => {
    return Array.from(selectedIds).map(id => {
      const item = inventory.find(i => i.id === id);
      if (!item) return null;
      const itemLogs = logs.filter(l => l.selectedItems[category]?.itemId === id);
      const norms = itemLogs.map(l => resultNorm(l, resultOptions)).filter((r): r is number => r !== null);
      const avgResult = norms.length ? norms.reduce((a,b) => a+b,0)/norms.length : null;
      const scoreStats: Record<string, number | null> = {};
      for (const p of scoreParameters) {
        const vals = itemLogs
          .map(l => { const s = l.scores[p.id]; return s !== undefined ? getScoreValue(s) : 0; })
          .filter(v => v > 0);
        scoreStats[p.id] = vals.length ? vals.reduce((a,b) => a+b,0)/vals.length : null;
      }
      return {
        id, item, count: itemLogs.length, avgResult,
        resultLabel: avgResult !== null ? nearestResult(avgResult, resultOptions) : null,
        scoreStats,
      };
    }).filter((s): s is ItemStat => s !== null);
  }, [selectedIds, logs, category, resultOptions, scoreParameters, inventory]);

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });
  };

  const maxPerParam = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of scoreParameters) {
      m[p.id] = Math.max(...stats.map(s => s.scoreStats[p.id] ?? 0), 0.1);
    }
    return m;
  }, [stats, scoreParameters]);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-[#f5f2eb] font-semibold text-xl mb-1">Gear Comparison</h2>
        <p className="text-gray-500 text-xs">Select up to 5 items from any category to compare performance</p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {categories.map(cat => (
          <button key={cat} onClick={() => { setCategory(cat); setSelectedIds(new Set()); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              category === cat
                ? "bg-[#c9a050]/15 border-[#c9a050]/30 text-[#c9a050]"
                : "bg-[#1e1e1e] border-white/10 text-gray-400 hover:text-[#f5f2eb] hover:border-white/20"
            }`}>
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6 min-h-[2.5rem]">
        {categoryItems.map(item => {
          const sel = selectedIds.has(item.id);
          const cnt = itemLogCounts[item.id] ?? 0;
          return (
            <button key={item.id} onClick={() => toggle(item.id)}
              disabled={!sel && selectedIds.size >= 5}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                sel
                  ? "bg-[#c9a050]/15 border-[#c9a050]/50 text-[#c9a050]"
                  : "bg-[#1e1e1e] border-white/5 text-gray-400 hover:border-white/20 hover:text-[#f5f2eb] disabled:opacity-30 disabled:cursor-not-allowed"
              }`}>
              {item.brand} {item.name}
              {cnt > 0 && <span className="ml-1.5 opacity-50">({cnt})</span>}
            </button>
          );
        })}
        {categoryItems.length === 0 && <p className="text-gray-600 text-sm">No items in this category</p>}
      </div>

      {stats.length > 0 ? (
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-gray-500 text-xs font-medium">Item</th>
                <th className="text-center px-3 py-3 text-gray-500 text-xs font-medium w-16">Uses</th>
                <th className="text-center px-3 py-3 text-gray-500 text-xs font-medium w-28">Avg Result</th>
                {scoreParameters.map(p => (
                  <th key={p.id} className="text-center px-3 py-3 text-gray-500 text-xs font-medium w-20">{p.shortName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.id} className={i < stats.length - 1 ? "border-b border-white/5" : ""}>
                  <td className="px-5 py-4">
                    <p className="text-[#c9a050] text-[11px] font-medium">{s.item.brand}</p>
                    <p className="text-[#f5f2eb] text-sm font-semibold">{s.item.name}</p>
                    {s.count === 0 && <p className="text-gray-600 text-[10px]">Never logged</p>}
                  </td>
                  <td className="text-center px-3 py-4 text-[#f5f2eb] text-sm font-semibold">{s.count}</td>
                  <td className="text-center px-3 py-4">
                    {s.resultLabel !== null
                      ? <span className="text-sm font-bold" style={{ color: normColor(s.avgResult!) }}>{s.resultLabel}</span>
                      : <span className="text-gray-600 text-sm">—</span>}
                  </td>
                  {scoreParameters.map(p => {
                    const v = s.scoreStats[p.id];
                    return (
                      <td key={p.id} className="px-3 py-4">
                        {v !== null ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-semibold" style={{ color: scoreColor(v) }}>{v.toFixed(1)}</span>
                            <div className="w-14 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-300"
                                style={{ width: `${((v / maxPerParam[p.id]) * 100).toFixed(0)}%`, backgroundColor: scoreColor(v) }} />
                            </div>
                          </div>
                        ) : <span className="text-gray-600 text-sm block text-center">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 py-10 text-center">
          <p className="text-gray-600 text-sm">Select items above to compare</p>
        </div>
      )}
    </section>
  );
}

// ── Section 3: Result Trend ────────────────────────────────────────────────
function ResultTrendSection({ logs, resultOptions }: { logs: ShaveLog[]; resultOptions: string[] }) {
  const [hoveredPt, setHoveredPt] = useState<number | null>(null);

  const points = useMemo(() =>
    [...logs].sort((a, b) => a.date - b.date)
      .map(log => ({ log, norm: resultNorm(log, resultOptions) }))
      .filter((p): p is { log: ShaveLog; norm: number } => p.norm !== null),
    [logs, resultOptions]
  );

  const N = points.length;

  const rollingAvg = useMemo(() => {
    const WINDOW = 10;
    return points.map((_, i) => {
      const slice = points.slice(Math.max(0, i - WINDOW + 1), i + 1);
      return slice.reduce((s, x) => s + x.norm, 0) / slice.length;
    });
  }, [points]);

  const trend = useMemo(() => {
    const xs = points.map((_, i) => i);
    const ys = points.map(p => p.norm);
    return linReg(xs, ys);
  }, [points]);

  const yLabels = useMemo(() => {
    const count = Math.min(5, resultOptions.length);
    const step = (resultOptions.length - 1) / Math.max(1, count - 1);
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round(i * step);
      return { label: resultOptions[idx], norm: idx / (resultOptions.length - 1) };
    });
  }, [resultOptions]);

  const xTicks = useMemo(() => {
    if (N < 2) return [];
    const count = Math.min(6, N);
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round((i / (count - 1)) * (N - 1));
      return { idx, label: new Date(points[idx].log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
    });
  }, [points, N]);

  if (N < 3) return null;

  const W = 680, PL = 62, PR = 20, PT = 15, PH = 220, LABEL_SPACE = 50;
  const H = PT + PH + LABEL_SPACE, PW = W - PL - PR;
  const sx = (i: number) => PL + (i / (N - 1)) * PW;
  const sy = (norm: number) => PT + PH - norm * PH;
  const TICK_Y = PT + PH + 18, TITLE_Y = PT + PH + 40;

  const avgPath = rollingAvg
    .map((avg, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(avg).toFixed(1)}`)
    .join(" ");

  const trendLine = trend && N >= 5 ? (() => {
    const y0 = Math.max(0, Math.min(1, trend.a));
    const y1 = Math.max(0, Math.min(1, trend.a + trend.b * (N - 1)));
    const improving = trend.b > 0.003, declining = trend.b < -0.003;
    return {
      x1: sx(0), y1: sy(y0), x2: sx(N - 1), y2: sy(y1),
      label: improving ? "↗ Improving" : declining ? "↘ Declining" : "→ Stable",
      color: improving ? "#22c55e" : declining ? "#ef4444" : "#6b7280",
    };
  })() : null;

  const hovPt = hoveredPt !== null ? points[hoveredPt] : null;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-[#f5f2eb] font-semibold text-xl mb-1">Result Trend</h2>
        <p className="text-gray-500 text-xs">Shave quality over time · gold line = 10-shave rolling average</p>
      </div>

      <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-5">
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {trendLine && (
            <span className="text-sm font-semibold" style={{ color: trendLine.color }}>{trendLine.label}</span>
          )}
          <span className="text-gray-600 text-xs">{N} shaves</span>
          <div className="flex items-center gap-2 ml-auto">
            <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#c9a050" strokeWidth="2" strokeOpacity="0.7" /></svg>
            <span className="text-gray-500 text-xs">10-shave avg</span>
          </div>
        </div>

        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 360 }}>
            {yLabels.map(({ norm }) => (
              <line key={norm} x1={PL} y1={sy(norm)} x2={PL + PW} y2={sy(norm)} stroke="#252525" strokeWidth={1} />
            ))}
            {xTicks.map(({ idx }) => (
              <line key={idx} x1={sx(idx)} y1={PT} x2={sx(idx)} y2={PT + PH} stroke="#252525" strokeWidth={1} />
            ))}
            {trendLine && (
              <line x1={trendLine.x1} y1={trendLine.y1} x2={trendLine.x2} y2={trendLine.y2}
                stroke={trendLine.color} strokeWidth={1} strokeOpacity={0.25} strokeDasharray="4 3" />
            )}
            <path d={avgPath} fill="none" stroke="#c9a050" strokeWidth={2} strokeOpacity={0.75} strokeLinejoin="round" />
            {points.map((pt, i) => (
              <circle key={i} cx={sx(i)} cy={sy(pt.norm)}
                r={hoveredPt === i ? 6 : 3.5}
                fill={normColor(pt.norm)}
                fillOpacity={hoveredPt !== null && hoveredPt !== i ? 0.2 : 0.85}
                stroke={hoveredPt === i ? "#fff" : "none"} strokeWidth={1.5}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredPt(i)}
                onMouseLeave={() => setHoveredPt(null)}
              />
            ))}
            {xTicks.map(({ idx, label }) => (
              <text key={idx} x={sx(idx)} y={TICK_Y} textAnchor="middle" fontSize={10} fill="#6b7280">{label}</text>
            ))}
            {yLabels.map(({ label, norm }) => (
              <text key={norm} x={PL - 6} y={sy(norm)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#6b7280">{label}</text>
            ))}
            <text x={10} y={PT + PH / 2} textAnchor="middle" dominantBaseline="middle"
              fontSize={11} fill="#9ca3af" transform={`rotate(-90, 10, ${PT + PH / 2})`}>Result →</text>
          </svg>

          {hovPt && (
            <div className="absolute top-2 right-2 bg-[#2a2a2a] border border-white/15 rounded-xl p-3 text-xs pointer-events-none shadow-lg min-w-[150px]">
              <p className="text-[#f5f2eb] font-semibold mb-1">
                {new Date(hovPt.log.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className="font-medium" style={{ color: normColor(hovPt.norm) }}>{hovPt.log.result}</p>
              {avgScoreOf(hovPt.log.scores) !== null && (
                <p className="text-gray-500">Avg score: {avgScoreOf(hovPt.log.scores)!.toFixed(1)}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Section 4: Blade Wear Curve ────────────────────────────────────────────
function BladeWearSection({ logs, inventory, resultOptions }: {
  logs: ShaveLog[]; inventory: InventoryItem[]; resultOptions: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredPt, setHoveredPt] = useState<{ si: number; use: number } | null>(null);

  const bladeRuns = useMemo(() => {
    const sorted = [...logs].sort((a, b) => a.date - b.date);
    const runs: Array<{ itemId: string; useNum: number; log: ShaveLog }> = [];
    let currentId: string | null = null;
    let useCount = 0;
    for (const log of sorted) {
      const blade = log.selectedItems["blades"];
      if (!blade?.itemId) continue;
      if (blade.itemId === currentId) {
        useCount++;
      } else {
        currentId = blade.itemId;
        useCount = 1;
      }
      runs.push({ itemId: blade.itemId, useNum: useCount, log });
    }
    return runs;
  }, [logs]);

  const bladeItems = useMemo(() => {
    const ids = new Set(bladeRuns.map(r => r.itemId));
    return inventory
      .filter(i => i.categoryId === "blades" && ids.has(i.id))
      .sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
  }, [bladeRuns, inventory]);

  const toggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const seriesData = useMemo(() => {
    return selectedIds.map(id => {
      const item = inventory.find(i => i.id === id);
      if (!item) return null;
      const runsForBlade = bladeRuns.filter(r => r.itemId === id);
      const byUse: Record<number, number[]> = {};
      for (const run of runsForBlade) {
        const norm = resultNorm(run.log, resultOptions);
        if (norm === null) continue;
        if (!byUse[run.useNum]) byUse[run.useNum] = [];
        byUse[run.useNum].push(norm);
      }
      const maxUse = Object.keys(byUse).length ? Math.max(...Object.keys(byUse).map(Number)) : 0;
      const points = Array.from({ length: maxUse }, (_, i) => {
        const nums = byUse[i + 1];
        return nums ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      });
      return { id, item, points, totalRuns: runsForBlade.length };
    }).filter((s): s is NonNullable<typeof s> => s !== null);
  }, [selectedIds, bladeRuns, resultOptions, inventory]);

  const maxUse = Math.max(...seriesData.map(s => s.points.length), 2);

  const yLabels = useMemo(() => {
    const count = Math.min(5, resultOptions.length);
    const step = (resultOptions.length - 1) / Math.max(1, count - 1);
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round(i * step);
      return { label: resultOptions[idx], norm: idx / (resultOptions.length - 1) };
    });
  }, [resultOptions]);

  const W = 680, PL = 62, PR = 20, PT = 15, PH = 220, LABEL_SPACE = 50;
  const H = PT + PH + LABEL_SPACE, PW = W - PL - PR;
  const sx = (use: number) => maxUse <= 1 ? PL + PW / 2 : PL + ((use - 1) / (maxUse - 1)) * PW;
  const sy = (norm: number) => PT + PH - norm * PH;
  const TICK_Y = PT + PH + 18, TITLE_Y = PT + PH + 40;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-[#f5f2eb] font-semibold text-xl mb-1">Blade Wear Curve</h2>
        <p className="text-gray-500 text-xs">How shave quality changes with each consecutive blade use · select up to 5 blades</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {bladeItems.map(item => {
          const selIdx = selectedIds.indexOf(item.id);
          const sel = selIdx >= 0;
          const color = sel ? LINE_COLORS[selIdx] : undefined;
          return (
            <button key={item.id} onClick={() => toggle(item.id)}
              disabled={!sel && selectedIds.length >= 5}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                sel ? "" : "bg-[#1e1e1e] border-white/5 text-gray-400 hover:border-white/20 hover:text-[#f5f2eb] disabled:opacity-30 disabled:cursor-not-allowed"
              }`}
              style={sel ? { color, borderColor: color + "80", background: color + "18" } : {}}>
              {item.brand} {item.name}
            </button>
          );
        })}
        {bladeItems.length === 0 && <p className="text-gray-600 text-sm">No blade data found in your logs</p>}
      </div>

      <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-5">
        {seriesData.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-600 text-sm">Select blades above to see their wear curves</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 mb-4">
              {seriesData.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <div style={{ width: 20, height: 2, backgroundColor: LINE_COLORS[i], borderRadius: 1 }} />
                  <span className="text-xs text-gray-400">{s.item.brand} {s.item.name}</span>
                  <span className="text-gray-600 text-xs">({s.totalRuns} uses logged)</span>
                </div>
              ))}
            </div>

            <div className="relative">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 360 }}>
                {yLabels.map(({ norm }) => (
                  <line key={norm} x1={PL} y1={sy(norm)} x2={PL + PW} y2={sy(norm)} stroke="#252525" strokeWidth={1} />
                ))}
                {Array.from({ length: maxUse }, (_, i) => (
                  <line key={i} x1={sx(i + 1)} y1={PT} x2={sx(i + 1)} y2={PT + PH} stroke="#252525" strokeWidth={1} />
                ))}

                {seriesData.map((s, si) => {
                  const color = LINE_COLORS[si];
                  const pts = s.points
                    .map((norm, i) => norm !== null ? { use: i + 1, norm } : null)
                    .filter((p): p is { use: number; norm: number } => p !== null);
                  const path = pts
                    .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.use).toFixed(1)} ${sy(p.norm).toFixed(1)}`)
                    .join(" ");
                  return (
                    <g key={s.id}>
                      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.85} strokeLinejoin="round" />
                      {pts.map(p => (
                        <circle key={p.use}
                          cx={sx(p.use)} cy={sy(p.norm)}
                          r={hoveredPt?.si === si && hoveredPt?.use === p.use ? 6 : 4}
                          fill={color} fillOpacity={0.85}
                          stroke={hoveredPt?.si === si && hoveredPt?.use === p.use ? "#fff" : "none"}
                          strokeWidth={1.5}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={() => setHoveredPt({ si, use: p.use })}
                          onMouseLeave={() => setHoveredPt(null)}
                        />
                      ))}
                    </g>
                  );
                })}

                {Array.from({ length: maxUse }, (_, i) => (
                  <text key={i} x={sx(i + 1)} y={TICK_Y} textAnchor="middle" fontSize={10} fill="#6b7280">{i + 1}</text>
                ))}
                {yLabels.map(({ label, norm }) => (
                  <text key={norm} x={PL - 6} y={sy(norm)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#6b7280">{label}</text>
                ))}
                <text x={PL + PW / 2} y={TITLE_Y} textAnchor="middle" fontSize={11} fill="#9ca3af">Use # →</text>
                <text x={10} y={PT + PH / 2} textAnchor="middle" dominantBaseline="middle"
                  fontSize={11} fill="#9ca3af" transform={`rotate(-90, 10, ${PT + PH / 2})`}>Result →</text>
              </svg>

              {hoveredPt && seriesData[hoveredPt.si] && (() => {
                const s = seriesData[hoveredPt.si];
                const norm = s.points[hoveredPt.use - 1];
                if (norm === null || norm === undefined) return null;
                return (
                  <div className="absolute top-2 right-2 bg-[#2a2a2a] border border-white/15 rounded-xl p-3 text-xs pointer-events-none shadow-lg">
                    <p className="text-[#f5f2eb] font-semibold mb-1">{s.item.brand} {s.item.name}</p>
                    <p className="text-gray-400">Use #{hoveredPt.use}</p>
                    <p className="font-medium mt-1" style={{ color: normColor(norm) }}>{nearestResult(norm, resultOptions)}</p>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ── Section 5: Result Correlation ──────────────────────────────────────────
function CorrelationSection({ logs, resultOptions, scoreParameters }: {
  logs: ShaveLog[]; resultOptions: string[]; scoreParameters: ScoreParameter[];
}) {
  const [xParam, setXParam] = useState(scoreParameters[0]?.id ?? "efficiency");
  const [hoveredPt, setHoveredPt] = useState<number | null>(null);

  useEffect(() => {
    if (scoreParameters.length && !scoreParameters.find(p => p.id === xParam)) {
      setXParam(scoreParameters[0].id);
    }
  }, [scoreParameters, xParam]);

  const { points, r, reg } = useMemo(() => {
    const pts: Array<{ x: number; y: number; norm: number; log: ShaveLog }> = [];
    for (const log of logs) {
      const entry = log.scores[xParam];
      if (!entry) continue;
      const x = getScoreValue(entry);
      if (x <= 0) continue;
      const y = resultPos(log, resultOptions);
      if (y === null) continue;
      const norm = resultNorm(log, resultOptions);
      pts.push({ x, y, norm: norm ?? 0.5, log });
    }
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    return { points: pts, r: pearson(xs, ys), reg: linReg(xs, ys) };
  }, [logs, xParam, resultOptions]);

  const xLabel = scoreParameters.find(p => p.id === xParam)?.name ?? xParam;
  const N = Math.max(resultOptions.length, 2);

  // SVG layout — explicit plot height + label space below
  const W = 680;
  const PL = 62, PR = 20, PT = 15;
  const PH = 240; // fixed plot area height
  const LABEL_SPACE = 58; // room for tick labels + axis title below plot
  const H = PT + PH + LABEL_SPACE;
  const PW = W - PL - PR;

  const sx = (v: number) => PL + ((v - 1) / 9) * PW;
  const sy = (pos: number) => PT + PH - ((Math.max(1, Math.min(N, pos)) - 1) / (N - 1)) * PH;

  const yLabels = useMemo(() => {
    if (N <= 6) return resultOptions.map((l, i) => ({ l, i }));
    const idxs = [0, Math.floor(N/4), Math.floor(N/2), Math.floor(3*N/4), N-1];
    return [...new Set(idxs)].map(i => ({ l: resultOptions[i], i }));
  }, [resultOptions, N]);

  const trendLine = reg && points.length >= 3 ? (() => {
    const clamp = (x: number) => Math.max(0.5, Math.min(N + 0.5, reg.a + reg.b * x));
    return { x1: sx(1), y1: sy(clamp(1)), x2: sx(10), y2: sy(clamp(10)) };
  })() : null;

  const hovLog = hoveredPt !== null ? points[hoveredPt] : null;

  if (!scoreParameters.length) return null;

  const TICK_Y = PT + PH + 18;   // tick labels 18px below plot bottom
  const TITLE_Y = PT + PH + 42;  // axis title 42px below plot bottom

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-[#f5f2eb] font-semibold text-xl mb-1">Result Correlation</h2>
          <p className="text-gray-500 text-xs">How individual score parameters relate to your shave result</p>
        </div>
        <select value={xParam} onChange={e => setXParam(e.target.value)}
          className="bg-[#242424] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50">
          {scoreParameters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-5">
        {points.length < 3 ? (
          <div className="py-12 text-center">
            <p className="text-gray-600 text-sm">Not enough data — log more shaves with {xLabel} scored.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              {r !== null && (
                <>
                  <div className="flex items-center gap-2 bg-[#242424] rounded-lg px-3 py-2 border border-white/10">
                    <span className="text-gray-500 text-xs">r =</span>
                    <span className="text-sm font-bold" style={{
                      color: Math.abs(r) >= 0.4 ? "#c9a050" : Math.abs(r) >= 0.1 ? "#f97316" : "#6b7280"
                    }}>{r.toFixed(2)}</span>
                  </div>
                  <span className="text-gray-400 text-sm">{corrLabel(r)}</span>
                </>
              )}
              <span className="text-gray-600 text-xs ml-auto">{points.length} shaves plotted</span>
            </div>

            <div className="relative">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 360 }}>
                {/* Grid */}
                {[1,2,3,4,5,6,7,8,9,10].map(x => (
                  <line key={x} x1={sx(x)} y1={PT} x2={sx(x)} y2={PT+PH} stroke="#252525" strokeWidth={1} />
                ))}
                {yLabels.map(({ i }) => (
                  <line key={i} x1={PL} y1={sy(i+1)} x2={PL+PW} y2={sy(i+1)} stroke="#252525" strokeWidth={1} />
                ))}

                {/* Trend line */}
                {trendLine && (
                  <line x1={trendLine.x1} y1={trendLine.y1} x2={trendLine.x2} y2={trendLine.y2}
                    stroke="#c9a050" strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="5 3" />
                )}

                {/* Data points */}
                {points.map((pt, i) => (
                  <circle key={i}
                    cx={sx(pt.x)} cy={sy(pt.y)}
                    r={hoveredPt === i ? 7 : 5}
                    fill={normColor(pt.norm)}
                    fillOpacity={hoveredPt !== null && hoveredPt !== i ? 0.18 : 0.78}
                    stroke={hoveredPt === i ? "#fff" : "none"}
                    strokeWidth={1.5}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredPt(i)}
                    onMouseLeave={() => setHoveredPt(null)}
                  />
                ))}

                {/* X-axis tick labels */}
                {[1,2,3,4,5,6,7,8,9,10].map(x => (
                  <text key={x} x={sx(x)} y={TICK_Y} textAnchor="middle" fontSize={10} fill="#6b7280">{x}</text>
                ))}

                {/* Y-axis labels */}
                {yLabels.map(({ l, i }) => (
                  <text key={i} x={PL-6} y={sy(i+1)} textAnchor="end" dominantBaseline="middle"
                    fontSize={9} fill="#6b7280">{l}</text>
                ))}

                {/* Axis names */}
                <text x={PL + PW/2} y={TITLE_Y} textAnchor="middle" fontSize={11} fill="#9ca3af">
                  {xLabel} Score →
                </text>
                <text x={10} y={PT + PH/2} textAnchor="middle" dominantBaseline="middle"
                  fontSize={11} fill="#9ca3af" transform={`rotate(-90, 10, ${PT + PH/2})`}>
                  Result →
                </text>
              </svg>

              {hovLog && (
                <div className="absolute top-2 right-2 bg-[#2a2a2a] border border-white/15 rounded-xl p-3 text-xs pointer-events-none shadow-lg min-w-[150px]">
                  <p className="text-[#f5f2eb] font-semibold mb-1">
                    {new Date(hovLog.log.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="font-medium" style={{ color: normColor(hovLog.norm) }}>{hovLog.log.result}</p>
                  <p className="text-gray-400">{xLabel}: {hovLog.x}/10</p>
                  {avgScoreOf(hovLog.log.scores) !== null && (
                    <p className="text-gray-500">Avg score: {avgScoreOf(hovLog.log.scores)!.toFixed(1)}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ── Section: Personal Records ──────────────────────────────────────────────
function PersonalRecordsSection({ logs, inventory, resultOptions, scoreParameters: _scoreParameters, range }: {
  logs: ShaveLog[]; inventory: InventoryItem[];
  resultOptions: string[]; scoreParameters: ScoreParameter[];
  range: Range;
}) {
  const bestResultShave = useMemo(() => {
    return logs.reduce<ShaveLog | null>((best, log) => {
      const n = resultNorm(log, resultOptions);
      if (n === null) return best;
      if (!best) return log;
      const bn = resultNorm(best, resultOptions);
      if (bn === null || n > bn) return log;
      if (n === bn && (avgScoreOf(log.scores) ?? 0) > (avgScoreOf(best.scores) ?? 0)) return log;
      return best;
    }, null);
  }, [logs, resultOptions]);

  const bestScoreShave = useMemo(() => {
    return logs.reduce<ShaveLog | null>((best, log) => {
      const s = avgScoreOf(log.scores);
      if (s === null) return best;
      if (!best) return log;
      const bs = avgScoreOf(best.scores);
      if (bs === null || s > bs) return log;
      if (s === bs && (resultNorm(log, resultOptions) ?? 0) > (resultNorm(best, resultOptions) ?? 0)) return log;
      return best;
    }, null);
  }, [logs, resultOptions]);

  const renderGear = (log: ShaveLog) => {
    const gear = CATEGORY_ORDER.map(catId => {
      const sel = log.selectedItems[catId];
      if (!sel?.itemId && !sel?.itemName) return null;
      const item = sel.itemId ? inventory.find(i => i.id === sel.itemId) : null;
      const name = item ? `${item.brand} ${item.name}` : sel.itemName;
      if (!name) return null;
      return { catId, name };
    }).filter((g): g is { catId: string; name: string } => g !== null);

    if (!gear.length) return <p className="text-gray-600 text-sm italic">No gear recorded</p>;

    return (
      <div className="flex flex-wrap gap-2">
        {gear.map(({ catId, name }) => (
          <div key={catId} className="flex items-center gap-2 bg-[#242424] rounded-lg px-3 py-2 border border-white/5">
            <span className="text-sm flex items-center"><CategoryIcon catId={catId} /></span>
            <div>
              <p className="text-gray-500 text-[10px] leading-none mb-0.5">{CATEGORY_LABELS[catId] ?? catId}</p>
              <p className="text-[#f5f2eb] text-xs font-medium leading-none">{name}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-[#f5f2eb] font-semibold text-xl mb-1">Personal Records</h2>
        <p className="text-gray-500 text-xs">Your best shaves · {RANGE_OPTIONS.find(r => r.key === range)?.label ?? "All Time"}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-5">
          <p className="text-gray-500 text-[11px] uppercase tracking-wider mb-3">Highest Result Setup</p>
          {bestResultShave ? (
            <>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-bold text-3xl leading-none"
                  style={{ color: normColor(resultNorm(bestResultShave, resultOptions) ?? 0) }}>
                  {bestResultShave.result}
                </span>
                <span className="text-gray-600 text-xs">
                  {new Date(bestResultShave.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              {renderGear(bestResultShave)}
            </>
          ) : <p className="text-gray-600 text-sm">No data</p>}
        </div>

        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-5">
          <p className="text-gray-500 text-[11px] uppercase tracking-wider mb-3">Highest Scoring Setup</p>
          {bestScoreShave ? (
            <>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-bold text-3xl leading-none"
                  style={{ color: scoreColor(avgScoreOf(bestScoreShave.scores) ?? 0) }}>
                  {(avgScoreOf(bestScoreShave.scores) ?? 0).toFixed(1)}
                </span>
                <span className="text-gray-500 text-sm">avg score</span>
                <span className="text-gray-600 text-xs ml-auto">
                  {new Date(bestScoreShave.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              {renderGear(bestScoreShave)}
            </>
          ) : <p className="text-gray-600 text-sm">No data</p>}
        </div>
      </div>
    </section>
  );
}

// ── Section: Setups Table ─────────────────────────────────────────────────
function SetupsTableSection({ filteredLogs, inventory, scoreParameters }: {
  filteredLogs: ShaveLog[];
  inventory: InventoryItem[];
  scoreParameters: ScoreParameter[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedScoreLog, setSelectedScoreLog] = useState<ShaveLog | null>(null);

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const tableLogs = useMemo(() =>
    [...filteredLogs]
      .filter(l => l.date >= thirtyDaysAgo)
      .sort((a, b) => b.date - a.date),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredLogs]
  );

  const activeCats = useMemo(
    () => CATEGORY_ORDER.filter(c => inventory.some(i => i.categoryId === c)),
    [inventory]
  );

  function cellValue(log: ShaveLog, catId: string): string {
    const sel = log.selectedItems[catId];
    if (!sel) return "—";
    if (sel.itemId) {
      const item = inventory.find(i => i.id === sel.itemId);
      if (item) return `${item.brand} ${item.name}`.trim();
    }
    return sel.itemName ?? "—";
  }

  function cellItemId(log: ShaveLog, catId: string): string | null {
    return log.selectedItems[catId]?.itemId ?? null;
  }

  function scoreSum(log: ShaveLog): number {
    return Object.values(log.scores ?? {}).reduce((acc: number, s) => acc + getScoreValue(s), 0);
  }

  const visibleLogs = open ? tableLogs : tableLogs.slice(0, 3);

  return (
    <section>
      <button
        onClick={() => tableLogs.length > 0 ? setOpen(o => !o) : undefined}
        className={`flex items-center gap-3 w-full text-left group mb-4 ${tableLogs.length === 0 ? "cursor-default" : ""}`}
      >
        <h2 className="text-[#f5f2eb] font-semibold text-lg">Shave Setups</h2>
        <span className="text-xs text-gray-600 font-normal">
          {tableLogs.length} shave{tableLogs.length !== 1 ? "s" : ""}
        </span>
        {tableLogs.length > 0 && (
          <span className={`ml-auto text-gray-500 group-hover:text-gray-300 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            ▼
          </span>
        )}
      </button>

      {tableLogs.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/5 pb-px">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#1a1a1a] border-b border-white/5">
                  <th className="text-left px-4 py-3 text-gray-500 text-xs font-medium uppercase tracking-wide whitespace-nowrap sticky left-0 bg-[#1a1a1a] z-10">
                    Date
                  </th>
                  {activeCats.map(catId => (
                    <th key={catId} className="text-left px-4 py-3 text-gray-500 text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                      {CATEGORY_LABELS[catId] ?? catId}
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 text-gray-500 text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {visibleLogs.map((log) => {
                  const hasScores = Object.keys(log.scores ?? {}).length > 0;
                  const sum = hasScores ? scoreSum(log) : null;
                  return (
                    <tr key={log.id} className="bg-[#1e1e1e] hover:bg-[#242424] transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap sticky left-0 bg-inherit z-10">
                        {new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      {activeCats.map(catId => {
                        const val = cellValue(log, catId);
                        const itemId = cellItemId(log, catId);
                        return (
                          <td key={catId} className={`px-4 py-3 text-xs whitespace-nowrap max-w-[180px] truncate ${val === "—" ? "text-gray-700" : "text-gray-300"}`}>
                            {itemId ? (
                              <a href={`/den/${itemId}`} className="hover:text-[#c9a050] hover:underline transition-colors">
                                {val}
                              </a>
                            ) : val}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {sum !== null ? (
                          <button
                            onClick={() => setSelectedScoreLog(log)}
                            className="text-[#f5f2eb] font-bold hover:text-[#c9a050] transition-colors"
                          >
                            {sum}
                          </button>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>

            {selectedScoreLog && (
              <div
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75"
                onClick={() => setSelectedScoreLog(null)}
              >
                <div
                  className="bg-[#1e1e1e] rounded-t-2xl sm:rounded-2xl border border-white/10 w-full max-w-sm mx-auto pb-8"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
                    <div>
                      <p className="text-[#f5f2eb] font-semibold text-base">Score Breakdown</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {new Date(selectedScoreLog.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <button onClick={() => setSelectedScoreLog(null)} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
                  </div>
                  <div className="px-6 pt-4 space-y-3">
                    {scoreParameters.map(p => {
                      const entry = selectedScoreLog.scores?.[p.id];
                      const val = entry !== undefined ? getScoreValue(entry) : null;
                      return (
                        <div key={p.id} className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">{p.name}</span>
                          <span className={`text-sm font-semibold ${val !== null ? "text-[#f5f2eb]" : "text-gray-700"}`}>
                            {val !== null ? val : "—"}
                          </span>
                        </div>
                      );
                    })}
                    <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                      <span className="text-[#f5f2eb] text-sm font-semibold">Composite</span>
                      <span className="text-[#c9a050] text-lg font-bold">{scoreSum(selectedScoreLog)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!open && tableLogs.length > 3 && (
          <p className="text-xs text-gray-600 text-center mt-2 cursor-pointer hover:text-gray-400 transition-colors" onClick={() => setOpen(true)}>
            +{tableLogs.length - 3} more
          </p>
        )}
      </section>
  );
}

// ── Section: Most Used Gear ────────────────────────────────────────────────
function MostUsedGearSection({ logs, inventory }: { logs: ShaveLog[]; inventory: InventoryItem[] }) {
  const categoryUsage = useMemo(() => {
    return CATEGORY_ORDER.map(catId => {
      const itemMap: Record<string, { name: string; count: number }> = {};
      let total = 0;
      for (const log of logs) {
        const sel = log.selectedItems[catId];
        if (!sel?.itemId && !sel?.itemName) continue;
        const itemKey = sel.itemId ?? sel.itemName!;
        const item = sel.itemId ? inventory.find(i => i.id === sel.itemId) : null;
        const name = item ? `${item.brand} ${item.name}` : (sel.itemName ?? "Unknown");
        if (!itemMap[itemKey]) itemMap[itemKey] = { name, count: 0 };
        itemMap[itemKey].count++;
        total++;
      }
      if (total === 0) return null;
      const sorted = Object.values(itemMap).sort((a, b) => b.count - a.count);
      const top = sorted.slice(0, 5).map(e => ({ name: e.name, count: e.count, pct: (e.count / total) * 100 }));
      const otherCount = sorted.slice(5).reduce((s, e) => s + e.count, 0);
      return { catId, total, top, otherCount, otherPct: (otherCount / total) * 100 };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  }, [logs, inventory]);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-[#f5f2eb] font-semibold text-xl mb-1">Most Used Gear</h2>
        <p className="text-gray-500 text-xs">Your most-reached-for items in the selected period</p>
      </div>
      {categoryUsage.length === 0 ? (
        <p className="text-gray-600 text-sm">No gear data for this period.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryUsage.map(({ catId, total, top, otherCount, otherPct }) => (
            <div key={catId} className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center"><CategoryIcon catId={catId} /></span>
                <p className="text-[#f5f2eb] text-sm font-semibold flex-1">{CATEGORY_LABELS[catId] ?? catId}</p>
                <span className="text-gray-600 text-xs">{total} uses</span>
              </div>
              <div className="space-y-2.5">
                {top.map((e, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#f5f2eb] text-xs truncate flex-1 pr-2" title={e.name}>{e.name}</span>
                      <span className="text-[#c9a050] text-xs font-semibold shrink-0">{e.pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div className="h-full bg-[#c9a050] rounded-full" style={{ width: `${e.pct}%` }} />
                    </div>
                  </div>
                ))}
                {otherCount > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-500 text-xs">Other</span>
                      <span className="text-gray-500 text-xs font-semibold">{otherPct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div className="h-full bg-[#4b5563] rounded-full" style={{ width: `${otherPct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
