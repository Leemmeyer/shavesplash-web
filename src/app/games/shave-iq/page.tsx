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
type Slot = { categoryId: string; correctId?: string; options: GearOption[] };

type LeaderboardEntry = { displayName: string; monthWins: number; allTimeWins: number };

type GameState = {
  date: string;
  revealed: boolean;
  photoUrl: string;
  totalSlots: number;
  slots: Slot[];
  hasSubmitted: boolean;
  myAnswers: Record<string, string> | null;
  myScore: number | null;
  winner: { displayName: string; score: number; totalSlots: number } | null;
  leaderboard: LeaderboardEntry[];
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function monthLabel(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
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
      const totalSeconds = (20 * 3600 + 45 * 60) - (h * 3600 + m * 60 + s);
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
      Winner revealed in <span className="text-[#50a0c9] font-mono">{timeLeft}</span>
    </p>
  );
}

function SlotPicker({
  slot, selected, onSelect, disabled,
}: {
  slot: Slot; selected: string | null;
  onSelect: (id: string) => void; disabled: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{CATEGORY_ICONS[slot.categoryId] ?? "📦"}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
          {CATEGORY_LABELS[slot.categoryId] ?? slot.categoryId}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {slot.options.map((opt) => {
          const isSelected = selected === opt.id;
          const isCorrect = slot.correctId === opt.id;
          const isWrong = slot.correctId && isSelected && !isCorrect;

          let border = "border-white/10 hover:border-white/20";
          let bg = "bg-[#1e1e1e]";
          let textColor = "text-[#f5f2eb]";
          if (isSelected && !slot.correctId) { border = "border-[#50a0c9]/60"; bg = "bg-[#50a0c9]/10"; }
          if (isCorrect && slot.correctId) { border = "border-green-500/60"; bg = "bg-green-500/10"; textColor = "text-green-400"; }
          if (isWrong) { border = "border-red-500/40"; bg = "bg-red-500/5"; textColor = "text-red-400/70"; }

          return (
            <button
              key={opt.id}
              onClick={() => !disabled && onSelect(opt.id)}
              disabled={disabled}
              className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${bg} ${border} ${disabled ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className={`font-medium ${textColor}`}>{opt.brand}</span>{" "}
              <span className="text-gray-400 text-xs">{opt.name}</span>
              {isCorrect && slot.correctId && <span className="ml-1 text-green-400">✓</span>}
              {isWrong && <span className="ml-1 text-red-400">✗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ShaveIQContent({
  state, loading, onRefresh,
}: {
  state: GameState | null; loading: boolean; onRefresh: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (state) setRevealed(state.revealed);
  }, [state]);

  // Pre-fill selections from myAnswers after submit/reveal
  useEffect(() => {
    if (state?.myAnswers) setAnswers(state.myAnswers);
  }, [state?.myAnswers]);

  const handleSubmit = async () => {
    if (!state || submitting) return;
    const missing = state.slots.filter((s) => !answers[s.categoryId]);
    if (missing.length > 0) {
      setError(`Please answer all ${state.totalSlots} slots before submitting.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/games/sotd-guesser/submit", { answers });
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
        <div className="w-6 h-6 border-2 border-[#50a0c9]/30 border-t-[#50a0c9] rounded-full animate-spin" />
      </div>
    );
  }

  if (!state) {
    return <p className="text-center text-gray-500 py-20">Failed to load game. Please refresh.</p>;
  }

  const effectiveAnswers = state.hasSubmitted && state.myAnswers ? state.myAnswers : answers;
  const photoRevealed = revealed;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#50a0c9] mb-1">Shave IQ</h1>
        <p className="text-gray-500 text-sm">{formatDate(state.date)}</p>
        <p className="text-gray-400 text-sm mt-2 leading-relaxed">
          Identify every item in today&apos;s SOTD photo. Pick one option per gear slot —
          the photo clears after the winner is revealed at 8:45pm ET.
        </p>
      </div>

      {/* Photo */}
      <div className="relative mb-6 rounded-2xl overflow-hidden bg-[#161616]" style={{ aspectRatio: "4/3" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={state.photoUrl}
          alt="Today's SOTD"
          className="w-full h-full object-cover transition-all duration-1000"
          style={{ filter: photoRevealed ? "blur(0px)" : "blur(22px) brightness(0.75)", transform: "scale(1.06)" }}
        />
        {!photoRevealed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-5 py-3 text-center">
              <p className="text-white font-semibold text-sm">Identify the gear</p>
              <p className="text-gray-400 text-xs mt-0.5">Photo reveals after 8:45pm ET</p>
            </div>
          </div>
        )}
      </div>

      {/* Winner card */}
      {state.winner && (
        <div className="mb-6 bg-[#1e1e1e] border border-[#50a0c9]/40 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-[#50a0c9] text-xs font-semibold uppercase tracking-wider mb-0.5">Today&apos;s Winner</p>
              <p className="text-[#f5f2eb] font-bold text-lg">{state.winner.displayName}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[#50a0c9] font-bold text-2xl">{state.winner.score}<span className="text-gray-500 text-base font-normal">/{state.winner.totalSlots}</span></p>
              <p className="text-gray-600 text-xs">correct</p>
            </div>
          </div>
        </div>
      )}

      {/* My score (after submit + reveal) */}
      {state.hasSubmitted && state.myScore !== null && (
        <div className="mb-6 bg-[#1e1e1e] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Your Score</p>
            <p className="text-[#f5f2eb] font-bold text-2xl">
              {state.myScore}<span className="text-gray-500 text-base font-normal">/{state.totalSlots}</span>
            </p>
          </div>
          <p className="text-gray-500 text-sm ml-2">
            {state.myScore === state.totalSlots
              ? "Perfect score! 🎉"
              : state.myScore > state.totalSlots / 2
              ? "Nice work — sharp eye."
              : "Keep training that Shave IQ."}
          </p>
        </div>
      )}

      {/* Gear slots */}
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 mb-6">
        <p className="text-[#f5f2eb] font-semibold mb-4">
          {state.hasSubmitted ? "Your Guesses" : "Make Your Guesses"}
          {state.hasSubmitted && !revealed && (
            <span className="text-gray-600 text-xs font-normal ml-2">Check back at 9pm ET for results</span>
          )}
        </p>

        <div className="space-y-5">
          {state.slots.map((slot) => (
            <SlotPicker
              key={slot.categoryId}
              slot={slot}
              selected={effectiveAnswers[slot.categoryId] ?? null}
              onSelect={(id) => setAnswers((prev) => ({ ...prev, [slot.categoryId]: id }))}
              disabled={state.hasSubmitted || revealed}
            />
          ))}
        </div>

        {!state.hasSubmitted && !revealed && (
          <>
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-5 py-3 bg-[#50a0c9] text-black font-semibold rounded-xl hover:bg-[#5caed4] transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Guesses"}
            </button>
            <Countdown />
          </>
        )}

        {state.hasSubmitted && !revealed && (
          <div className="mt-4 text-center">
            <p className="text-gray-600 text-xs">Guesses locked in. Results at 8:45pm ET.</p>
            <Countdown />
          </div>
        )}

        {revealed && !state.hasSubmitted && (
          <p className="text-gray-500 text-sm text-center mt-4">Submissions for today have closed. Come back tomorrow!</p>
        )}
      </div>

      {/* Leaderboard */}
      {state.leaderboard.length > 0 && (
        <div>
          <h2 className="font-[family-name:var(--font-fredericka)] text-xl text-[#f5f2eb] mb-1">Leaderboard</h2>
          <p className="text-gray-600 text-xs mb-4">
            Most wins in {monthLabel(state.date)} earns the Shave IQ Champion title.
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
                  <span className={`text-sm font-medium truncate ${i === 0 && entry.monthWins > 0 ? "text-[#50a0c9]" : "text-[#f5f2eb]"}`}>
                    {entry.displayName}
                  </span>
                  {i === 0 && entry.monthWins > 0 && <span className="text-xs shrink-0">👑</span>}
                </div>
                <span className={`text-sm font-semibold text-right w-24 ${entry.monthWins > 0 ? "text-[#50a0c9]" : "text-gray-600"}`}>
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

export default function ShaveIQPage() {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(() => {
    api.get<GameState>("/api/games/sotd-guesser/today")
      .then((d) => setState(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchState(); }, [fetchState]);

  return (
    <AuthGuard>
      <ShaveIQContent state={state} loading={loading} onRefresh={fetchState} />
    </AuthGuard>
  );
}
