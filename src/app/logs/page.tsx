"use client";

import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

const RESULT_COLORS: Record<string, string> = {
  "BBS+": "#22c55e", "BBS+/BBS": "#22c55e", "BBS": "#4ade80",
  "BBS/BBS-": "#86efac", "BBS-": "#bbf7d0", "BBS-/DFS+": "#fbbf24",
  "DFS+": "#f59e0b", "DFS+/DFS": "#d97706", "DFS": "#b45309",
};

type ScoreEntry = { value?: number } | number;
type SelectedItem = { itemId?: string; itemName?: string };

type ShaveLog = {
  id: string;
  date: number;
  result: string;
  scores: Record<string, ScoreEntry>;
  selectedItems: Record<string, SelectedItem>;
  notes?: string;
  photoUrl?: string;
};

function getScoreValue(score: ScoreEntry): number {
  if (typeof score === "number") return score;
  if (typeof score === "object" && score !== null && "value" in score) {
    return typeof score.value === "number" ? score.value : 0;
  }
  return 0;
}

function avgScore(scores: Record<string, ScoreEntry>): number | null {
  const vals = Object.values(scores).map(getScoreValue).filter((v) => v > 0);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function groupByMonth(logs: ShaveLog[]): [string, ShaveLog[]][] {
  const groups = new Map<string, ShaveLog[]>();
  for (const log of logs) {
    const key = new Date(log.date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(log);
  }
  return Array.from(groups.entries());
}

export default function LogsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppNav />
      <AuthGuard>
        <LogsContent />
      </AuthGuard>
    </div>
  );
}

function LogsContent() {
  const [logs, setLogs] = useState<ShaveLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ logs: ShaveLog[] }>("/api/logs")
      .then((d) => setLogs(d.logs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  const grouped = groupByMonth(logs);
  const totalAvg = logs.length
    ? logs.reduce((sum, l) => sum + (avgScore(l.scores) ?? 0), 0) / logs.length
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 w-full">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#c9a050] mb-1">
            Shave Journal
          </h1>
          <p className="text-gray-500 text-sm">{logs.length} shaves logged</p>
        </div>
        {totalAvg !== null && (
          <div className="text-right">
            <p className="text-gray-500 text-xs">Avg Score</p>
            <p className="text-[#c9a050] text-2xl font-bold">{totalAvg.toFixed(1)}</p>
          </div>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-5xl mb-4">📔</p>
          <p className="text-lg mb-2">No shaves logged yet</p>
          <p className="text-sm">Log your shaves in the ShaveSplash mobile app — they&apos;ll appear here automatically.</p>
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
                  const resultColor = RESULT_COLORS[log.result] ?? "#9ca3af";
                  const usedItems = Object.values(log.selectedItems)
                    .filter((s) => s.itemName)
                    .map((s) => s.itemName!);

                  return (
                    <div
                      key={log.id}
                      className="bg-[#242424] rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors"
                    >
                      <button
                        onClick={() => setExpanded(isExpanded ? null : log.id)}
                        className="w-full text-left px-4 py-3.5 flex items-center gap-4"
                      >
                        {/* Result badge */}
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: resultColor }}
                        />

                        {/* Date */}
                        <span className="text-[#f5f2eb] text-sm font-medium w-40 flex-shrink-0">
                          {formatDate(log.date)}
                        </span>

                        {/* Result */}
                        <span
                          className="text-sm font-bold w-20 flex-shrink-0"
                          style={{ color: resultColor }}
                        >
                          {log.result}
                        </span>

                        {/* Items preview */}
                        <span className="text-gray-500 text-sm truncate flex-1 hidden sm:block">
                          {usedItems.slice(0, 3).join(" · ")}
                        </span>

                        {/* Score */}
                        {avg !== null && (
                          <span className="text-[#c9a050] text-sm font-semibold w-10 text-right flex-shrink-0">
                            {avg.toFixed(1)}
                          </span>
                        )}

                        <span className="text-gray-600 ml-1">{isExpanded ? "▲" : "▼"}</span>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                          {/* Items used */}
                          {usedItems.length > 0 && (
                            <div>
                              <p className="text-gray-600 text-xs uppercase tracking-wider mb-1.5">Gear Used</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(log.selectedItems)
                                  .filter(([, s]) => s.itemName)
                                  .map(([catId, s]) => (
                                    <span key={catId} className="bg-[#1e1e1e] rounded-lg px-2.5 py-1 text-xs text-gray-300 border border-white/5">
                                      {s.itemName}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Scores */}
                          {Object.keys(log.scores).length > 0 && (
                            <div>
                              <p className="text-gray-600 text-xs uppercase tracking-wider mb-1.5">Scores</p>
                              <div className="flex flex-wrap gap-3">
                                {Object.entries(log.scores).map(([key, score]) => {
                                  const val = getScoreValue(score);
                                  if (!val) return null;
                                  return (
                                    <div key={key} className="text-center">
                                      <p className="text-[#c9a050] text-base font-bold">{val}</p>
                                      <p className="text-gray-600 text-xs capitalize">{key}</p>
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
