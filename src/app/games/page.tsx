"use client";

import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  razors: "Razor",
  blades: "Blade",
  brushes: "Brush",
  soaps: "Soap",
  aftershaves: "Aftershave",
  balms: "Balm",
  preshaves: "Pre-Shave",
  edpedt: "EDP / EDT",
};

const CATEGORY_ICONS: Record<string, string> = {
  razors: "🪒", blades: "⚡", brushes: "🖌️", soaps: "🫧",
  aftershaves: "💧", balms: "🧴", preshaves: "✨", edpedt: "🌸",
};

type GearOption = { id: string; brand: string; name: string };
type SetupItem = { categoryId: string; gearId: string; brand: string; name: string; hasPhoto?: boolean };

type WinnerData = {
  displayName: string;
  score: number | null;
  items: SetupItem[];
};

type HallOfFameEntry = {
  date: string;
  displayName: string;
  score: number | null;
  items: SetupItem[];
};

type SubmittedSetup = {
  userId: string;
  displayName: string;
  isWinner: boolean;
  items: SetupItem[];
};

type GameState = {
  date: string;
  revealed: boolean;
  hasSubmitted: boolean;
  mySetup: { items: SetupItem[] } | null;
  winner: WinnerData | null;
  hallOfFame: HallOfFameEntry[];
  categories: { id: string; items: GearOption[] }[];
  allSetups: SubmittedSetup[];
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function ScoreDisplay({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-500 text-sm">No data</span>;
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? "#c9a050" : score >= 0.6 ? "#a0c950" : score >= 0.4 ? "#50a0c9" : "#c95050";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden w-20">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{pct}%</span>
    </div>
  );
}

function SetupCard({ items }: { items: SetupItem[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.categoryId} className="flex items-center gap-2">
          <span className="text-base w-6 text-center shrink-0">{CATEGORY_ICONS[item.categoryId] ?? "📦"}</span>
          <div className="min-w-0">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">{CATEGORY_LABELS[item.categoryId] ?? item.categoryId}</span>
            <p className="text-[#f5f2eb] text-sm leading-tight">
              <span className="text-[#c9a050]">{item.brand}</span> {item.name}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryPicker({
  categoryId, items, selected, onSelect,
}: {
  categoryId: string; items: GearOption[]; selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return item.brand.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
  });

  const selectedItem = selected ? items.find((i) => i.id === selected) : null;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg">{CATEGORY_ICONS[categoryId] ?? "📦"}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
          {CATEGORY_LABELS[categoryId] ?? categoryId}
        </span>
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
          selectedItem
            ? "bg-[#1e1e1e] border-[#c9a050]/40 text-[#f5f2eb]"
            : "bg-[#1e1e1e] border-white/10 text-gray-500 hover:border-white/20"
        }`}
      >
        {selectedItem ? (
          <span className="text-sm">
            <span className="text-[#c9a050] font-medium">{selectedItem.brand}</span> {selectedItem.name}
          </span>
        ) : (
          <span className="text-sm">Choose a {CATEGORY_LABELS[categoryId] ?? categoryId}…</span>
        )}
        <span className="text-gray-600 text-xs ml-2">{open ? "▲" : "▼"}</span>
      </button>

      {selectedItem && (
        <button
          onClick={() => onSelect(null)}
          className="absolute right-8 top-9 text-gray-600 hover:text-gray-400 text-xs px-1"
        >✕</button>
      )}

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#242424] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-white/5">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full bg-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-4">No items found</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onSelect(item.id); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${
                    item.id === selected ? "text-[#c9a050]" : "text-[#f5f2eb]"
                  }`}
                >
                  <span className="font-medium">{item.brand}</span>{" "}
                  <span className="text-gray-400">{item.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GearThumb({ gearId, categoryId, hasPhoto }: { gearId: string; categoryId: string; hasPhoto?: boolean }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPhoto) return;
    api.get<{ photoUrl: string | null }>(`/api/gear/${gearId}/photo`)
      .then((d) => { if (d.photoUrl) setSrc(d.photoUrl); })
      .catch(() => {});
  }, [gearId, hasPhoto]);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="w-8 h-8 object-cover rounded-md border border-white/10 shrink-0" />
    );
  }
  return (
    <div className="w-8 h-8 rounded-md border border-white/10 bg-[#2a2a2a] flex items-center justify-center text-sm shrink-0">
      {CATEGORY_ICONS[categoryId] ?? "📦"}
    </div>
  );
}

function SubmissionsTable({ setups }: { setups: SubmittedSetup[] }) {
  if (setups.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="font-[family-name:var(--font-fredericka)] text-xl text-[#f5f2eb] mb-4">
        Today&apos;s Entries <span className="text-gray-600 text-sm font-sans ml-1">{setups.length}</span>
      </h2>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#1a1a1a] border-b border-white/10 text-left">
              <th className="px-3 py-2.5 text-gray-500 text-xs uppercase tracking-wider font-medium whitespace-nowrap">Player</th>
              <th className="px-3 py-2.5 text-gray-500 text-xs uppercase tracking-wider font-medium whitespace-nowrap">Category</th>
              <th className="px-3 py-2.5 text-gray-500 text-xs uppercase tracking-wider font-medium">Item</th>
            </tr>
          </thead>
          <tbody>
            {setups.flatMap((setup, si) =>
              setup.items.map((item, ii) => (
                <tr
                  key={`${setup.userId}-${item.categoryId}`}
                  className={`${
                    ii === 0 && si > 0 ? "border-t border-white/10" : ii > 0 ? "border-t border-white/[0.04]" : ""
                  } ${setup.isWinner ? "bg-[#c9a050]/[0.04]" : "bg-[#1e1e1e]"}`}
                >
                  {ii === 0 && (
                    <td
                      rowSpan={setup.items.length}
                      className="px-3 py-2 align-top"
                    >
                      <div className="flex items-start gap-1.5 pt-1">
                        {setup.isWinner && <span className="text-xs leading-none mt-0.5">🏆</span>}
                        <span className={`font-semibold leading-snug ${setup.isWinner ? "text-[#c9a050]" : "text-[#f5f2eb]"}`}>
                          {setup.displayName}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-gray-400 text-xs">
                      {CATEGORY_ICONS[item.categoryId]}{" "}
                      {CATEGORY_LABELS[item.categoryId] ?? item.categoryId}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <GearThumb gearId={item.gearId} categoryId={item.categoryId} hasPhoto={item.hasPhoto} />
                      <span className="leading-tight">
                        <span className="text-[#c9a050] font-medium">{item.brand}</span>{" "}
                        <span className="text-[#f5f2eb]">{item.name}</span>
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Countdown() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const et = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      }).formatToParts(now);
      const get = (t: string) => parseInt(et.find((p) => p.type === t)?.value ?? "0");
      const h = get("hour"), m = get("minute"), s = get("second");
      const totalSeconds = (21 - h) * 3600 - m * 60 - s;
      if (totalSeconds <= 0) { setTimeLeft(""); return; }
      const rh = Math.floor(totalSeconds / 3600);
      const rm = Math.floor((totalSeconds % 3600) / 60);
      const rs = totalSeconds % 60;
      setTimeLeft(`${rh}h ${rm.toString().padStart(2, "0")}m ${rs.toString().padStart(2, "0")}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (!timeLeft) return null;
  return (
    <p className="text-gray-500 text-xs text-center mt-1">
      Winner revealed in <span className="text-[#c9a050] font-mono">{timeLeft}</span>
    </p>
  );
}

function GamesPageContent() {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedHof, setExpandedHof] = useState<string | null>(null);

  const fetchState = useCallback(() => {
    api.get<GameState>("/api/games/today")
      .then((d) => setState(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchState(); }, [fetchState]);

  const handleSubmit = async () => {
    if (submitting) return;
    const catIds = state?.categories.map((c) => c.id) ?? [];
    const missing = catIds.filter((id) => !selections[id]);
    if (missing.length > 0) {
      setError(`Please choose a ${CATEGORY_LABELS[missing[0]] ?? missing[0]} before submitting.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/games/submit", { items: selections });
      fetchState();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  if (!state) {
    return <p className="text-center text-gray-500 py-20">Failed to load game. Please refresh.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] mb-1">Den Master</h1>
        <p className="text-gray-500 text-sm">{formatDate(state.date)}</p>
        <p className="text-gray-600 text-xs mt-1.5">
          Build today&apos;s perfect shave den. One entry per day — winner revealed at 9pm ET.
        </p>
      </div>

      {/* All today's entries — shown at top */}
      <SubmissionsTable setups={state.allSetups ?? []} />

      {/* Today's winner */}
      {state.winner && (
        <div className="mb-8 bg-[#1e1e1e] border border-[#c9a050]/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🏆</span>
            <div>
              <p className="text-[#c9a050] font-semibold text-sm">Today&apos;s Winner</p>
              <p className="text-[#f5f2eb] font-bold">{state.winner.displayName}</p>
            </div>
            <div className="ml-auto">
              <ScoreDisplay score={state.winner.score} />
            </div>
          </div>
          <SetupCard items={state.winner.items} />
        </div>
      )}

      {/* Submission area */}
      {!state.hasSubmitted && !state.revealed ? (
        <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 mb-8">
          <p className="text-[#f5f2eb] font-semibold mb-4">Build Your Den</p>
          <div className="space-y-4">
            {state.categories.map((cat) => (
              <CategoryPicker
                key={cat.id}
                categoryId={cat.id}
                items={cat.items}
                selected={selections[cat.id] ?? null}
                onSelect={(id) => setSelections((prev) => {
                  if (id === null) { const n = { ...prev }; delete n[cat.id]; return n; }
                  return { ...prev, [cat.id]: id };
                })}
              />
            ))}
          </div>
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full mt-5 py-3 bg-[#c9a050] text-black font-semibold rounded-xl hover:bg-[#d4aa60] transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Enter Today's Den"}
          </button>
          <Countdown />
        </div>
      ) : state.hasSubmitted && state.mySetup ? (
        <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 mb-8">
          <p className="text-[#f5f2eb] font-semibold mb-1">Your Den</p>
          {!state.revealed && (
            <p className="text-gray-500 text-xs mb-4">Entered for today — check back at 9pm ET for the winner.</p>
          )}
          <SetupCard items={state.mySetup.items} />
          {!state.revealed && <Countdown />}
        </div>
      ) : state.revealed && !state.hasSubmitted ? (
        <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 mb-8 text-center">
          <p className="text-gray-500 text-sm">Submissions for today have closed. Come back tomorrow!</p>
        </div>
      ) : null}

      {/* Hall of Fame */}
      {state.hallOfFame.length > 0 && (
        <div>
          <h2 className="font-[family-name:var(--font-fredericka)] text-xl text-[#f5f2eb] mb-4">Hall of Fame</h2>
          <div className="space-y-2">
            {state.hallOfFame.map((entry) => (
              <div key={entry.date} className="bg-[#1e1e1e] border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedHof((prev) => prev === entry.date ? null : entry.date)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#c9a050] text-xs font-mono">{entry.date}</span>
                    <span className="text-[#f5f2eb] text-sm font-medium">{entry.displayName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ScoreDisplay score={entry.score} />
                    <span className="text-gray-600 text-xs">{expandedHof === entry.date ? "▲" : "▼"}</span>
                  </div>
                </button>
                {expandedHof === entry.date && (
                  <div className="px-4 pb-4 pt-1 border-t border-white/5">
                    <SetupCard items={entry.items} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamesPage() {
  return (
    <AuthGuard>
      <GamesPageContent />
    </AuthGuard>
  );
}
