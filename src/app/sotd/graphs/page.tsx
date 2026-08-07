"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const PIE_COLORS = [
  "#c9a050", "#60a5fa", "#34d399", "#f87171", "#a78bfa",
  "#fb923c", "#38bdf8", "#4ade80", "#94a3b8",
];

const CAT_LABELS: Record<string, string> = {
  razors: "Razors", blades: "Blades", brushes: "Brushes",
  soaps: "Soaps", aftershaves: "Aftershaves", balms: "Balms",
  preshaves: "Pre-Shaves", edpedt: "EDP / EDT",
};

const SCORE_ORDER = ["efficiency", "comfort", "consistency", "easeofuse", "ease of use", "composite", "overall"];

interface PieSlice { name: string; count: number; pct: number; }
interface RazorRow {
  name: string;
  uses: number;
  scores: Record<string, { avg: number; shortName: string }>;
}
interface GraphData {
  gearPie: Record<string, PieSlice[]>;
  razorScores: RazorRow[];
  totalShaves: number;
}

// ── SVG Pie Chart ─────────────────────────────────────────────────────────────

function PieChart({ data }: { data: PieSlice[] }) {
  if (!data.length) return <p className="text-gray-600 text-xs text-center py-4">No data yet</p>;

  const size = 150;
  const cx = 75;
  const cy = 75;
  const r = 58;
  let angle = -Math.PI / 2;

  const slices = data.map((item, i) => {
    const sweep = (item.count / data.reduce((s, d) => s + d.count, 0)) * 2 * Math.PI;
    const start = angle;
    angle += sweep;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const path = sweep >= 2 * Math.PI - 0.001
      ? `M ${cx} ${cy} m -${r} 0 a ${r} ${r} 0 1 1 ${r * 2} 0 a ${r} ${r} 0 1 1 -${r * 2} 0`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { path, color: PIE_COLORS[i % PIE_COLORS.length]!, item };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#141414" strokeWidth={1.5} />
        ))}
      </svg>
      <div className="w-full space-y-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-300 truncate flex-1">{s.item.name}</span>
            <span className="text-gray-500 shrink-0">{s.item.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SotdGraphsPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState("uses");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    api.get<GraphData>("/api/sotd/graphs")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allScoreKeys = data
    ? Array.from(
        new Set(data.razorScores.flatMap(r => Object.keys(r.scores)))
      ).sort((a, b) => {
        const ai = SCORE_ORDER.indexOf(a.toLowerCase());
        const bi = SCORE_ORDER.indexOf(b.toLowerCase());
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
    : [];

  const sortedRazors = data
    ? [...data.razorScores].sort((a, b) => {
        const aVal = sortKey === "uses" ? a.uses : (a.scores[sortKey]?.avg ?? 0);
        const bVal = sortKey === "uses" ? b.uses : (b.scores[sortKey]?.avg ?? 0);
        return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      })
    : [];

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const activeCats = data
    ? Object.entries(data.gearPie).filter(([, slices]) => slices.length > 0)
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/sotd" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← SOTD
        </Link>
        <div>
          <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050]">
            Community Graphs
          </h1>
          {data && (
            <p className="text-gray-600 text-sm mt-0.5">Based on {data.totalShaves} shared shaves</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <div className="w-8 h-8 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-gray-600 text-center py-20">Failed to load graph data.</p>
      ) : (
        <>
          {/* ── Pie Charts ── */}
          <section className="mb-14">
            <h2 className="text-[#f5f2eb] font-semibold text-lg mb-6">Gear Usage by Category</h2>
            {activeCats.length === 0 ? (
              <p className="text-gray-600 text-sm">No gear data yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {activeCats.map(([cat, slices]) => (
                  <div key={cat} className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-4">
                    <h3 className="text-[#c9a050] text-xs font-semibold uppercase tracking-wider mb-4">
                      {CAT_LABELS[cat] ?? cat}
                    </h3>
                    <PieChart data={slices} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Razor Scores Table ── */}
          <section>
            <h2 className="text-[#f5f2eb] font-semibold text-lg mb-4">Average Scores by Razor</h2>
            {sortedRazors.length === 0 ? (
              <p className="text-gray-600 text-sm">No razor score data yet.</p>
            ) : (
              <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Razor</th>
                        <SortTh label="Uses" colKey="uses" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                        {allScoreKeys.map(k => (
                          <SortTh
                            key={k}
                            label={data.razorScores.find(r => r.scores[k])?.scores[k]?.shortName ?? k}
                            colKey={k}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          />
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRazors.map((razor, i) => (
                        <tr
                          key={razor.name}
                          className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}
                        >
                          <td className="px-4 py-3 text-[#f5f2eb] font-medium max-w-[200px] truncate">{razor.name}</td>
                          <td className="px-4 py-3 text-gray-400 text-center">{razor.uses}</td>
                          {allScoreKeys.map(k => (
                            <td key={k} className="px-4 py-3 text-center">
                              {razor.scores[k] ? (
                                <span
                                  className="font-semibold"
                                  style={{ color: scoreColor(razor.scores[k]!.avg) }}
                                >
                                  {razor.scores[k]!.avg}
                                </span>
                              ) : (
                                <span className="text-gray-700">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SortTh({ label, colKey, sortKey, sortDir, onSort }: {
  label: string; colKey: string; sortKey: string; sortDir: "asc" | "desc";
  onSort: (k: string) => void;
}) {
  const active = colKey === sortKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className="px-4 py-3 text-gray-500 font-medium text-xs cursor-pointer hover:text-gray-300 transition-colors whitespace-nowrap select-none"
    >
      {label}{active ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
    </th>
  );
}

function scoreColor(avg: number): string {
  if (avg >= 9) return "#22c55e";
  if (avg >= 7.5) return "#86efac";
  if (avg >= 6) return "#c9a050";
  if (avg >= 4) return "#fb923c";
  return "#f87171";
}
