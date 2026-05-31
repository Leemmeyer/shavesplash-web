"use client";

import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

type ScoreParameter = { id: string; name: string; shortName: string };

const DEFAULT_RESULT_OPTIONS = [
  "DFS","DFS+/DFS","DFS+","BBS-/DFS+","BBS-","BBS/BBS-","BBS","BBS+/BBS","BBS+",
];
const DEFAULT_SCORE_PARAMETERS: ScoreParameter[] = [
  { id: "efficiency",  name: "Efficiency",  shortName: "Eff"  },
  { id: "comfort",     name: "Comfort",     shortName: "Comf" },
  { id: "easeOfUse",  name: "Ease of Use", shortName: "Ease" },
  { id: "consistency", name: "Consistency", shortName: "Cons" },
];

export default function PreferencesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppNav />
      <AuthGuard><PreferencesContent /></AuthGuard>
    </div>
  );
}

function PreferencesContent() {
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [results, setResults]   = useState<string[]>([]);
  const [scores, setScores]     = useState<ScoreParameter[]>([]);

  // new-result input
  const [newResult, setNewResult] = useState("");
  // new-score inputs
  const [newScoreName, setNewScoreName]      = useState("");
  const [newScoreShort, setNewScoreShort]    = useState("");
  // editing score
  const [editingScoreId, setEditingScoreId]  = useState<string | null>(null);
  const [editScoreName, setEditScoreName]    = useState("");
  const [editScoreShort, setEditScoreShort]  = useState("");

  useEffect(() => {
    api.get<{ resultOptions: string[]; scoreParameters: ScoreParameter[] }>("/api/preferences")
      .then((d) => { setResults(d.resultOptions); setScores(d.scoreParameters); })
      .catch(() => { setResults(DEFAULT_RESULT_OPTIONS); setScores(DEFAULT_SCORE_PARAMETERS); })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (results.length === 0) { setError("At least one result option is required"); return; }
    if (scores.length === 0)  { setError("At least one score parameter is required"); return; }
    setError(null); setSaving(true); setSaved(false);
    try {
      await api.put("/api/preferences", { resultOptions: results, scoreParameters: scores });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  // ── Result option helpers ──────────────────────────────────────────────────
  const addResult = () => {
    const v = newResult.trim();
    if (!v || results.includes(v)) return;
    setResults((r) => [...r, v]);
    setNewResult("");
  };
  const removeResult = (i: number) => setResults((r) => r.filter((_, j) => j !== i));
  const moveResult = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= results.length) return;
    setResults((r) => { const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  };

  // ── Score parameter helpers ────────────────────────────────────────────────
  const addScore = () => {
    const name  = newScoreName.trim();
    const short = newScoreShort.trim();
    if (!name || !short) return;
    const id = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (scores.find((s) => s.id === id)) { setError(`Score ID "${id}" already exists`); return; }
    setScores((s) => [...s, { id, name, shortName: short }]);
    setNewScoreName(""); setNewScoreShort("");
  };
  const removeScore = (id: string) => setScores((s) => s.filter((p) => p.id !== id));
  const startEditScore = (p: ScoreParameter) => {
    setEditingScoreId(p.id); setEditScoreName(p.name); setEditScoreShort(p.shortName);
  };
  const saveEditScore = () => {
    if (!editScoreName.trim() || !editScoreShort.trim()) return;
    setScores((s) => s.map((p) =>
      p.id === editingScoreId ? { ...p, name: editScoreName.trim(), shortName: editScoreShort.trim() } : p
    ));
    setEditingScoreId(null);
  };
  const moveScore = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= scores.length) return;
    setScores((s) => { const n = [...s]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  };

  const resetToDefaults = () => {
    setResults([...DEFAULT_RESULT_OPTIONS]);
    setScores([...DEFAULT_SCORE_PARAMETERS]);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 w-full">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#c9a050] mb-1">Log Preferences</h1>
          <p className="text-gray-500 text-sm">Match these to your phone app to keep everything in sync</p>
        </div>
        <button onClick={resetToDefaults} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          Reset to defaults
        </button>
      </div>

      <div className="space-y-8">
        {/* ── Result Options ────────────────────────────────────────────── */}
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6">
          <div className="mb-4">
            <h2 className="text-[#f5f2eb] font-semibold text-base mb-1">Result Options</h2>
            <p className="text-gray-500 text-xs">
              Order matters — position 1 (top) = worst, last = best. Must match your phone exactly for correct color coding.
            </p>
          </div>

          <div className="space-y-1.5 mb-4">
            {results.map((r, i) => (
              <div key={r} className="flex items-center gap-2 bg-[#242424] rounded-lg px-3 py-2 border border-white/5">
                <span className="text-gray-600 text-xs w-5 text-center">{i + 1}</span>
                <span className="text-[#f5f2eb] text-sm flex-1">{r}</span>
                <button onClick={() => moveResult(i, -1)} disabled={i === 0}
                  className="text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors text-sm px-1">▲</button>
                <button onClick={() => moveResult(i, 1)} disabled={i === results.length - 1}
                  className="text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors text-sm px-1">▼</button>
                <button onClick={() => removeResult(i)}
                  className="text-gray-600 hover:text-red-400 transition-colors text-sm px-1">✕</button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={newResult} onChange={(e) => setNewResult(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addResult()}
              placeholder='e.g. "CCS" or "ATG Pass"'
              className="flex-1 bg-[#242424] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50"
            />
            <button onClick={addResult}
              className="px-4 py-2.5 bg-[#c9a050]/20 border border-[#c9a050]/30 rounded-xl text-[#c9a050] text-sm font-medium hover:bg-[#c9a050]/30 transition-colors">
              Add
            </button>
          </div>
        </div>

        {/* ── Score Parameters ──────────────────────────────────────────── */}
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6">
          <div className="mb-4">
            <h2 className="text-[#f5f2eb] font-semibold text-base mb-1">Score Parameters</h2>
            <p className="text-gray-500 text-xs">
              The ID is auto-generated from the name and must match your phone app's parameter IDs exactly.
            </p>
          </div>

          <div className="space-y-2 mb-4">
            {scores.map((p, i) => (
              <div key={p.id}>
                {editingScoreId === p.id ? (
                  <div className="bg-[#2a2a2a] rounded-xl p-3 border border-[#c9a050]/30 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Name</label>
                        <input value={editScoreName} onChange={(e) => setEditScoreName(e.target.value)}
                          className="w-full bg-[#242424] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Short Name</label>
                        <input value={editScoreShort} onChange={(e) => setEditScoreShort(e.target.value)}
                          className="w-full bg-[#242424] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/50" />
                      </div>
                    </div>
                    <p className="text-gray-600 text-xs">ID: <span className="text-gray-400 font-mono">{p.id}</span> (cannot change)</p>
                    <div className="flex gap-2">
                      <button onClick={saveEditScore}
                        className="flex-1 py-1.5 bg-[#c9a050] text-[#1a1a1a] rounded-lg text-sm font-semibold">Save</button>
                      <button onClick={() => setEditingScoreId(null)}
                        className="px-4 py-1.5 border border-white/10 rounded-lg text-sm text-gray-400">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-[#242424] rounded-lg px-3 py-2 border border-white/5">
                    <div className="flex-1 min-w-0">
                      <span className="text-[#f5f2eb] text-sm">{p.name}</span>
                      <span className="text-gray-600 text-xs ml-2">({p.shortName})</span>
                      <span className="text-gray-700 text-xs ml-2 font-mono">id: {p.id}</span>
                    </div>
                    <button onClick={() => moveScore(i, -1)} disabled={i === 0}
                      className="text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors text-sm px-1">▲</button>
                    <button onClick={() => moveScore(i, 1)} disabled={i === scores.length - 1}
                      className="text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors text-sm px-1">▼</button>
                    <button onClick={() => startEditScore(p)}
                      className="text-gray-600 hover:text-[#c9a050] transition-colors text-sm px-1">✎</button>
                    <button onClick={() => removeScore(p.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-sm px-1">✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-[#242424] rounded-xl p-3 border border-white/5 space-y-2">
            <p className="text-gray-500 text-xs mb-2">Add new score parameter</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name</label>
                <input value={newScoreName} onChange={(e) => setNewScoreName(e.target.value)}
                  placeholder="e.g. Lubricity"
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Short Name</label>
                <input value={newScoreShort} onChange={(e) => setNewScoreShort(e.target.value)}
                  placeholder="e.g. Lub"
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50" />
              </div>
            </div>
            {newScoreName && (
              <p className="text-gray-600 text-xs">
                ID will be: <span className="font-mono text-gray-400">
                  {newScoreName.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}
                </span>
              </p>
            )}
            <button onClick={addScore}
              className="w-full py-2 bg-[#c9a050]/20 border border-[#c9a050]/30 rounded-lg text-[#c9a050] text-sm font-medium hover:bg-[#c9a050]/30 transition-colors">
              Add Score Parameter
            </button>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex items-center gap-4">
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#c9a050] text-[#1a1a1a] font-semibold text-sm hover:bg-[#d4aa60] transition-colors disabled:opacity-50">
            {saving ? "Saving…" : "Save Preferences"}
          </button>
          {saved && <span className="text-green-400 text-sm">Saved ✓</span>}
        </div>

        <div className="bg-[#1a1a1a] rounded-xl border border-white/5 p-4">
          <p className="text-gray-500 text-xs leading-relaxed">
            <strong className="text-gray-400">How to align with your phone:</strong> Open the ShaveSplash app → Settings → Score Parameters / Result Options. Match the names, short names, order, and IDs exactly. Entries created on the web will then display with correct colors and factor into analytics on the phone.
          </p>
        </div>
      </div>
    </div>
  );
}
