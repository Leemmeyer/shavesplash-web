"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import AppNav from "@/components/AppNav";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

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
  razors:"🪒", blades:"⚡", brushes:"🖌️", soaps:"🫧",
  aftershaves:"💧", balms:"🧴", preshaves:"✨", edpedt:"🌸",
};
const CATEGORY_ORDER = ["razors","blades","brushes","soaps","aftershaves","balms","preshaves","edpedt"];

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
      <AppNav />
      <AuthGuard><AnalyticsContent /></AuthGuard>
    </div>
  );
}

function AnalyticsContent() {
  const [logs, setLogs] = useState<ShaveLog[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [resultOptions, setResultOptions] = useState<string[]>(DEFAULT_RESULT_OPTIONS);
  const [scoreParameters, setScoreParameters] = useState<ScoreParameter[]>(DEFAULT_SCORE_PARAMETERS);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 w-full">
      <div className="mb-10">
        <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#c9a050] mb-1">Analytics</h1>
        <p className="text-gray-500 text-sm">{logs.length} shave{logs.length !== 1 ? "s" : ""} analyzed</p>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-5xl mb-4">📊</p>
          <p className="text-lg mb-2">No data yet</p>
          <p className="text-sm">Log some shaves first — analytics will appear here.</p>
        </div>
      ) : (
        <div className="space-y-14">
          <HeatmapSection logs={logs} resultOptions={resultOptions} />
          <GearComparisonSection
            logs={logs} inventory={inventory}
            resultOptions={resultOptions} scoreParameters={scoreParameters}
          />
          <CorrelationSection
            logs={logs} resultOptions={resultOptions} scoreParameters={scoreParameters}
          />
          <PersonalRecordsSection
            logs={logs} inventory={inventory}
            resultOptions={resultOptions} scoreParameters={scoreParameters}
          />
        </div>
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

// ── Section 3: Result Correlation ──────────────────────────────────────────
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

// ── Section 4: Personal Records ────────────────────────────────────────────
function PersonalRecordsSection({ logs, inventory, resultOptions, scoreParameters }: {
  logs: ShaveLog[]; inventory: InventoryItem[];
  resultOptions: string[]; scoreParameters: ScoreParameter[];
}) {
  // Shave with the highest result (tiebreak: highest avg score)
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

  // Shave with the highest avg score (tiebreak: highest result)
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

  // Top 5 most-used items per category + "Other"
  const categoryUsage = useMemo(() => {
    return CATEGORY_ORDER.map(catId => {
      const itemMap: Record<string, { name: string; count: number }> = {};
      let total = 0;
      for (const log of logs) {
        const sel = log.selectedItems[catId];
        if (!sel?.itemId) continue;
        const item = inventory.find(i => i.id === sel.itemId);
        const name = item ? `${item.brand} ${item.name}` : (sel.itemName ?? "Unknown");
        if (!itemMap[sel.itemId]) itemMap[sel.itemId] = { name, count: 0 };
        itemMap[sel.itemId].count++;
        total++;
      }
      if (total === 0) return null;
      const sorted = Object.values(itemMap).sort((a, b) => b.count - a.count);
      const top = sorted.slice(0, 5).map(e => ({ name: e.name, count: e.count, pct: (e.count / total) * 100 }));
      const otherCount = sorted.slice(5).reduce((s, e) => s + e.count, 0);
      return { catId, total, top, otherCount, otherPct: (otherCount / total) * 100 };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  }, [logs, inventory]);

  const renderGear = (log: ShaveLog) => {
    const gear = CATEGORY_ORDER.map(catId => {
      const sel = log.selectedItems[catId];
      if (!sel?.itemId) return null;
      const item = inventory.find(i => i.id === sel.itemId);
      const name = item ? `${item.brand} ${item.name}` : sel.itemName;
      if (!name) return null;
      return { catId, name };
    }).filter((g): g is { catId: string; name: string } => g !== null);

    if (!gear.length) return <p className="text-gray-600 text-sm italic">No gear recorded</p>;

    return (
      <div className="flex flex-wrap gap-2">
        {gear.map(({ catId, name }) => (
          <div key={catId} className="flex items-center gap-2 bg-[#242424] rounded-lg px-3 py-2 border border-white/5">
            <span className="text-sm">{CATEGORY_ICONS[catId] ?? "📦"}</span>
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
        <p className="text-gray-500 text-xs">Your best setups and most-used gear</p>
      </div>

      {/* Best result + best score side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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

      {/* Most used per category */}
      <h3 className="text-[#f5f2eb] font-semibold text-base mb-4">Most Used Gear</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryUsage.map(({ catId, total, top, otherCount, otherPct }) => (
          <div key={catId} className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span>{CATEGORY_ICONS[catId] ?? "📦"}</span>
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
    </section>
  );
}
