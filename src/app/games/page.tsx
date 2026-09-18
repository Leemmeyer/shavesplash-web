"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
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

type GearOption = { id: string; brand: string; name: string; hasScore?: boolean };
type SetupItem = { categoryId: string; gearId: string; brand: string; name: string; hasPhoto?: boolean };

type ScoreData = { rawScore: number | null; bonusPct: number; finalScore: number | null };

type WinnerData = {
  displayName: string;
  items: SetupItem[];
} & ScoreData;

type LeaderboardEntry = {
  displayName: string;
  monthWins: number;
  allTimeWins: number;
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
  leaderboard: LeaderboardEntry[];
  allSetups: SubmittedSetup[];
};

type CategoriesState = {
  categories: { id: string; items: GearOption[] }[];
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function monthLabel(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const RESULT_LABELS = ["DFS", "DFS+/DFS", "DFS+", "BBS-/DFS+", "BBS-", "BBS/BBS-", "BBS", "BBS+/BBS", "BBS+"];

function scoreLabel(rawScore: number) {
  const idx = Math.max(0, Math.min(8, Math.round(rawScore * 8)));
  const label = RESULT_LABELS[idx]!;
  const color = idx >= 7 ? "#c9a050" : idx >= 5 ? "#a0c950" : idx >= 3 ? "#50a0c9" : "#9ca3af";
  return { label, color, idx };
}

// Full winner card display — labeled columns with explanation
function ScoreDisplay({ rawScore, bonusPct, finalScore }: ScoreData) {
  if (rawScore === null) return <span className="text-gray-500 text-sm">No data</span>;
  const { label, color } = scoreLabel(rawScore);
  const rawNumerical = Math.round(rawScore * 100);
  const finalNumerical = finalScore !== null ? Math.round(finalScore * 100) : null;
  return (
    <div>
      <div className="flex items-end gap-5">
        <div className="text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Avg of Items</p>
          <p className="text-sm font-semibold" style={{ color }}>
            {label} <span className="text-gray-500 text-xs font-normal">({rawNumerical})</span>
          </p>
        </div>
        {bonusPct > 0 && (
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Bonus</p>
            <p className="text-sm font-semibold text-gray-400">+{bonusPct}%</p>
          </div>
        )}
        {finalNumerical !== null && (
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Final Score</p>
            <p className="text-sm font-bold text-[#c9a050]">{finalNumerical}</p>
          </div>
        )}
      </div>
      {bonusPct > 0 && (
        <p className="text-[10px] text-gray-600 mt-2">
          A bonus of 2.5% is applied for every item chosen above the required 4.
        </p>
      )}
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

function GearThumb({ gearId, categoryId, hasPhoto, visible }: { gearId: string; categoryId: string; hasPhoto?: boolean; visible: boolean }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPhoto || !visible) return;
    api.get<{ photoUrl: string | null }>(`/api/gear/${gearId}/photo`)
      .then((d) => { if (d.photoUrl) setSrc(d.photoUrl); })
      .catch(() => {});
  }, [gearId, hasPhoto, visible]);

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

function PlayerEntry({ setup }: { setup: SubmittedSetup }) {
  const [expanded, setExpanded] = useState(false);
  const summary = setup.items.map((i) => `${i.brand} ${i.name}`).join(", ");

  return (
    <div className={`rounded-xl border overflow-hidden ${setup.isWinner ? "border-[#c9a050]/40 bg-[#c9a050]/[0.04]" : "border-white/5 bg-[#1e1e1e]"}`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {setup.isWinner && <span className="text-xs leading-none">🏆</span>}
            <span className={`font-semibold text-sm ${setup.isWinner ? "text-[#c9a050]" : "text-[#f5f2eb]"}`}>
              {setup.displayName}
            </span>
          </div>
          <p className="text-[#c9a050] text-xs italic leading-snug truncate">{summary}</p>
        </div>
        <span className="text-gray-600 text-xs mt-1 shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-white/5">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {setup.items.map((item) => (
                <tr key={item.categoryId} className="border-t border-white/[0.04] first:border-0">
                  <td className="px-4 py-2 whitespace-nowrap w-28">
                    <span className="text-gray-400 text-xs">
                      {CATEGORY_ICONS[item.categoryId]}{" "}{CATEGORY_LABELS[item.categoryId] ?? item.categoryId}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <GearThumb gearId={item.gearId} categoryId={item.categoryId} hasPhoto={item.hasPhoto} visible={expanded} />
                      <span className="leading-tight">
                        <span className="text-[#c9a050] font-medium">{item.brand}</span>{" "}
                        <span className="text-[#f5f2eb]">{item.name}</span>
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
      <div className="space-y-2">
        {setups.map((setup) => (
          <PlayerEntry key={setup.userId} setup={setup} />
        ))}
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

function GamesPageContent({
  state, categories, loading, onRefresh,
}: {
  state: GameState | null;
  categories: CategoriesState["categories"];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (submitting) return;
    const catIds = categories.map((c) => c.id);
    const selectedCatIds = catIds.filter((id) => selections[id]);

    const required = ["razors", "blades", "soaps", "brushes"];
    const missingRequired = required.filter((id) => !selections[id]);
    if (missingRequired.length > 0) {
      const labels = missingRequired.map((id) => CATEGORY_LABELS[id] ?? id).join(", ");
      setError(`Please choose a ${labels} before submitting.`);
      return;
    }

    // Warn if none of the selected items have any log score data
    const gearById = new Map(
      categories.flatMap((c) => c.items.map((i) => [i.id, i]))
    );
    const anyScored = selectedCatIds.some((catId) => {
      const gearId = selections[catId];
      return gearId && gearById.get(gearId)?.hasScore;
    });
    if (!anyScored) {
      setError("No Scores are Available for These Items. Please choose again.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/games/submit", { items: selections });
      onRefresh();
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
        <div className="relative w-full max-w-[225px] mx-auto mb-4 rounded-2xl overflow-hidden">
          <Image
            src="/den-master-hero.png"
            alt="Den Master"
            width={600}
            height={600}
            className="w-full h-auto object-cover"
            priority
          />
        </div>
        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] mb-1">Den Master</h1>
        <p className="text-gray-500 text-sm">{formatDate(state.date)}</p>
        <p className="text-gray-400 text-sm mt-2 leading-relaxed">
          Pick the Optimal Shave Setup. You must choose at least a Razor, Blade, Soap, and Brush — the more categories you fill, the higher your potential score. Scores are based on results entered from SOTDs. If you don&apos;t see your item in the selector, add it to the{" "}
          <a href="/database" className="text-[#c9a050] underline underline-offset-2 hover:text-[#d4aa60]">Gear Database</a>.
          {" "}The winner will be chosen at 8:45pm ET.
        </p>
      </div>

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
              <ScoreDisplay {...state.winner} />
            </div>
          </div>
          <SetupCard items={state.winner.items} />
        </div>
      )}

      {/* Submission area */}
      {!state.hasSubmitted && !state.revealed ? (
        <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 mb-8">
          <p className="text-[#f5f2eb] font-semibold mb-4">Setup Builder</p>
          {categories.length === 0 ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
            </div>
          ) : (
          <div className="space-y-4">
            {categories.map((cat) => (
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
          )}
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full mt-5 py-3 bg-[#c9a050] text-black font-semibold rounded-xl hover:bg-[#d4aa60] transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Enter Today's Setup"}
          </button>
          <Countdown />
        </div>
      ) : state.hasSubmitted && state.mySetup ? (
        <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 mb-8">
          <p className="text-[#f5f2eb] font-semibold mb-1">Your Setup</p>
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

      {/* All today's entries */}
      <SubmissionsTable setups={state.allSetups ?? []} />

      {/* Leaderboard */}
      {state.leaderboard.length > 0 && (
        <div className="mb-8">
          <h2 className="font-[family-name:var(--font-fredericka)] text-xl text-[#f5f2eb] mb-1">Leaderboard</h2>
          <p className="text-gray-600 text-xs mb-4">
            The player with the most wins in {monthLabel(state.date)} will be crowned Den Master Champion.
          </p>
          <div className="bg-[#1e1e1e] border border-white/5 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] px-4 py-2 border-b border-white/5">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">Player</span>
              <span className="text-[10px] text-gray-600 uppercase tracking-wider text-right w-24">{monthLabel(state.date)}</span>
              <span className="text-[10px] text-gray-600 uppercase tracking-wider text-right w-20">All Time</span>
            </div>
            {state.leaderboard.map((entry, i) => (
              <div
                key={entry.displayName}
                className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 border-t border-white/5 first:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-600 text-xs w-4 shrink-0">{i + 1}</span>
                  <span className={`text-sm font-medium truncate ${i === 0 && entry.monthWins > 0 ? "text-[#c9a050]" : "text-[#f5f2eb]"}`}>
                    {entry.displayName}
                  </span>
                  {i === 0 && entry.monthWins > 0 && <span className="text-xs shrink-0">👑</span>}
                </div>
                <span className={`text-sm font-semibold text-right w-24 ${entry.monthWins > 0 ? "text-[#c9a050]" : "text-gray-600"}`}>
                  {entry.monthWins}
                </span>
                <span className="text-sm text-gray-400 text-right w-20">{entry.allTimeWins}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default function GamesPage() {
  const [state, setState] = useState<GameState | null>(null);
  const [categories, setCategories] = useState<CategoriesState["categories"]>([]);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(() => {
    api.get<GameState>("/api/games/today")
      .then((d) => setState(d))
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get<CategoriesState>("/api/games/categories")
      .then((d) => setCategories(d.categories))
      .catch(() => {});
  }, []);

  // Fire immediately on mount — runs in parallel with AuthGuard's session check
  useEffect(() => { fetchState(); }, [fetchState]);

  return (
    <AuthGuard>
      <GamesPageContent
        state={state}
        categories={categories}
        loading={loading}
        onRefresh={fetchState}
      />
    </AuthGuard>
  );
}
