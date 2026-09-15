"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

type GearItem = { brand: string; name: string; category: string };
type SotdRow = { displayName: string; snippet: string; result: string };
type SotwWinner = { id: string; displayName: string; result: string; gear: string; reactions: number };

type MagazineContent = {
  headline: string;
  teaser: string;
  intro: string;
  sections: { heading: string; body: string }[];
  quoteOfDay: { author: string; quote: string; context: string } | null;
  sotdTable: SotdRow[] | null;
  sotwWinner: SotwWinner | null;
  gearTable: GearItem[] | null;
};

type MagazineEdition = {
  id: string;
  edition: "morning" | "evening";
  publishedAt: string;
  teaser: string;
  headline: string | null;
  isFree: boolean;
  content: string | null;
};

type MagazineResponse = {
  editions: MagazineEdition[];
  isExpert: boolean;
  isAdmin: boolean;
  hasFreeView: boolean;
};

const GEAR_CATEGORY_LABELS: Record<string, string> = {
  razors: "Razor",
  blades: "Blade",
  brushes: "Brush",
  soaps: "Soap",
  aftershaves: "Aftershave",
  balms: "Balm",
  edpedt: "Fragrance",
  preshaves: "Pre-Shave",
};

function formatEditionTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  );
}

function SectionDivider({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-[#2a2a2a]" />
      <span style={{ color }} className="text-[10px] font-bold tracking-widest uppercase">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#2a2a2a]" />
    </div>
  );
}

function EditionModal({ edition, onClose }: { edition: MagazineEdition; onClose: () => void }) {
  const content: MagazineContent | null = edition.content ? JSON.parse(edition.content) : null;
  const isMorning = edition.edition === "morning";
  const accentColor = isMorning ? "#c9a050" : "#9b8cc8";
  const title = isMorning ? "Morning Lather" : "Evening Edge";
  const [sotwPhotoUrl, setSotwPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!content?.sotwWinner?.id) return;
    api.get<{ photoUrl: string | null }>(`/api/logs/${content.sotwWinner.id}/photo`)
      .then((res) => setSotwPhotoUrl(res.photoUrl))
      .catch(() => {});
  }, [content?.sotwWinner?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center pt-2 px-3 pb-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-[#111] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[97dvh] sm:max-h-[90dvh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal header */}
        <div
          style={{
            background: isMorning
              ? "linear-gradient(to bottom, #2a1a00, #1a1208)"
              : "linear-gradient(to bottom, #0d0d1a, #111118)",
          }}
          className="p-6 border-b border-white/5 flex-shrink-0"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: accentColor }} className="text-xs font-bold tracking-widest uppercase">
                  {isMorning ? "☕ Morning Edition" : "🌙 Evening Edition"}
                </span>
              </div>
              <h2 className="text-[#f5f2eb] text-2xl font-bold mb-1">{title}</h2>
              <p className="text-gray-500 text-xs">{formatEditionTime(edition.publishedAt)}</p>
            </div>
            <div className="flex items-start gap-3 flex-shrink-0">
              <img
                src={`https://shavesplash.app/${isMorning ? "morning-lather" : "evening-edge"}.jpg`}
                alt={title}
                className="w-16 h-16 rounded-xl object-cover opacity-90"
              />
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-300 transition-colors p-1 -mt-1 -mr-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Modal content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {content ? (
            <>
              {/* Intro */}
              <p className="text-[#e5e0d5] text-base leading-relaxed italic">{content.intro}</p>

              {/* Sections */}
              {content.sections.map((s, i) => (
                <div key={i}>
                  <SectionDivider label={s.heading} color={accentColor} />
                  <p className="text-gray-400 text-sm leading-relaxed mt-3">{s.body}</p>
                </div>
              ))}

              {/* Gear table */}
              {content.gearTable && content.gearTable.length > 0 && (
                <div>
                  <SectionDivider label="New in the Gear Database" color={accentColor} />
                  <div className="mt-3 overflow-hidden rounded-lg border border-white/5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5 bg-[#0e0e0e]">
                          <th className="text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider px-3 py-2 w-24">Category</th>
                          <th className="text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider px-3 py-2">Brand</th>
                          <th className="text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider px-3 py-2">Item</th>
                        </tr>
                      </thead>
                      <tbody>
                        {content.gearTable.map((item, i) => (
                          <tr key={i} className="border-b border-white/5 last:border-0">
                            <td style={{ color: accentColor }} className="px-3 py-2 text-xs font-semibold">
                              {GEAR_CATEGORY_LABELS[item.category] ?? item.category}
                            </td>
                            <td className="px-3 py-2 text-[#f5f2eb] text-xs font-medium">{item.brand}</td>
                            <td className="px-3 py-2 text-gray-400 text-xs">{item.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Quote of the Day */}
              {content.quoteOfDay && (
                <div
                  style={{ borderLeftColor: accentColor }}
                  className="bg-[#1a1810] rounded-xl p-5 border-l-[3px]"
                >
                  <p style={{ color: accentColor }} className="text-[10px] font-bold tracking-widest uppercase mb-3">
                    Quote of the Day
                  </p>
                  <p className="text-[#f5f2eb] text-sm leading-relaxed italic mb-2">
                    &ldquo;{content.quoteOfDay.quote}&rdquo;
                  </p>
                  <p className="text-gray-500 text-xs">
                    — {content.quoteOfDay.author} · {content.quoteOfDay.context}
                  </p>
                </div>
              )}

              {/* SOTD table */}
              {content.sotdTable && content.sotdTable.length > 0 && (
                <div>
                  <SectionDivider label="Recent Shavers" color={accentColor} />
                  <div className="mt-3 overflow-hidden rounded-lg border border-white/5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5 bg-[#0e0e0e]">
                          <th className="text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider px-3 py-2 w-28">Shaver</th>
                          <th className="text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider px-3 py-2">Highlight</th>
                          <th className="text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider px-3 py-2 w-20">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {content.sotdTable.map((row, i) => (
                          <tr key={i} className="border-b border-white/5 last:border-0">
                            <td style={{ color: accentColor }} className="px-3 py-2.5 text-xs font-semibold">{row.displayName}</td>
                            <td className="px-3 py-2.5 text-gray-400 text-xs leading-relaxed">{row.snippet}</td>
                            <td className="px-3 py-2.5 text-gray-300 text-xs font-medium">{row.result}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SOTW Winner */}
              {content.sotwWinner && (
                <div className="border-t border-white/5 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span>🏆</span>
                    <span style={{ color: accentColor }} className="text-[10px] font-bold tracking-widest uppercase">
                      Shave of the Week
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-[#2a2a2a] flex items-center justify-center flex-shrink-0 text-2xl overflow-hidden">
                      {sotwPhotoUrl ? (
                        <img src={sotwPhotoUrl} alt="Shave of the Week" className="w-full h-full object-cover" />
                      ) : (
                        "🪒"
                      )}
                    </div>
                    <div>
                      <p className="text-[#f5f2eb] font-bold text-lg">{content.sotwWinner.displayName}</p>
                      {content.sotwWinner.gear && (
                        <p className="text-gray-500 text-xs mt-0.5">{content.sotwWinner.gear}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span style={{ color: accentColor }} className="text-sm font-bold">
                          {content.sotwWinner.result}
                        </span>
                        <span className="text-gray-600 text-xs">
                          · {content.sotwWinner.reactions} reaction{content.sotwWinner.reactions !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-center py-10">Content unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MagazinePage() {
  const { session, loading } = useSession();
  const router = useRouter();
  const [data, setData] = useState<MagazineResponse | null>(null);
  const [fetching, setFetching] = useState(true);
  const [selectedEdition, setSelectedEdition] = useState<MagazineEdition | null>(null);
  const pendingInvalidate = useRef(false);

  const fetchEditions = useCallback(async () => {
    setFetching(true);
    try {
      const result = await api.get<MagazineResponse>("/api/magazine");
      setData(result);
    } catch {
      // stay with existing data if refetch fails
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.push("/sign-in");
      return;
    }
    fetchEditions();
  }, [session, loading, fetchEditions, router]);

  const handleOpen = useCallback(async (edition: MagazineEdition) => {
    setSelectedEdition(edition);
    if (edition.isFree) {
      pendingInvalidate.current = true;
      api.post("/api/magazine/claim-free-view", {}).catch(() => {});
    } else {
      api.post("/api/magazine/read", { editionId: edition.id, edition: edition.edition }).catch(() => {});
    }
  }, []);

  const handleClose = useCallback(() => {
    setSelectedEdition(null);
    if (pendingInvalidate.current) {
      pendingInvalidate.current = false;
      fetchEditions();
    }
  }, [fetchEditions]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c9a050] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { editions, isExpert, isAdmin, hasFreeView } = data;
  const canReadAll = isExpert || isAdmin;
  const visibleEditions = canReadAll ? editions : editions.slice(0, 1);

  return (
    <div className="min-h-screen">
      {selectedEdition && <EditionModal edition={selectedEdition} onClose={handleClose} />}

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-0.5 bg-[#c9a050]" />
            <span className="text-[#c9a050] text-xs font-bold tracking-widest uppercase">ShaveSplash</span>
          </div>
          <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#f5f2eb] mb-3">
            The Magazine
          </h1>
          <p className="text-gray-500 text-sm">
            Twice daily digest of community activity, gear trends, and shave commentary.
          </p>
        </div>

        {/* Non-expert upgrade banner */}
        {!canReadAll && (
          <div className="bg-[#1a1810] border border-[#3a3020] rounded-2xl p-5 mb-8">
            <div className="flex items-start gap-4">
              <span className="text-xl mt-0.5 flex-shrink-0">★</span>
              <div className="flex-1">
                <p className="text-[#c9a050] text-sm font-bold mb-1">Expert Feature</p>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  Subscribe to Expert to read all Morning Lather and Evening Edge editions — twice daily, every day.
                </p>
                <Link
                  href="/subscribe"
                  className="inline-block bg-[#c9a050] text-black text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#b8903f] transition-colors"
                >
                  Upgrade to Expert
                </Link>
              </div>
            </div>
            {hasFreeView && editions.length > 0 && (
              <p className="text-gray-600 text-xs text-center mt-4 pt-4 border-t border-white/5">
                Or check out today&apos;s edition below — on us.
              </p>
            )}
          </div>
        )}

        {/* Edition cards */}
        {editions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📰</p>
            <p className="text-gray-500 text-lg font-semibold mb-2">First edition coming soon</p>
            <p className="text-gray-600 text-sm">Morning Lather drops at 9am ET · Evening Edge drops at 8pm ET</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleEditions.map((edition) => {
              const isMorning = edition.edition === "morning";
              const accentColor = isMorning ? "#c9a050" : "#9b8cc8";
              const title = isMorning ? "Morning Lather" : "Evening Edge";
              const canRead = canReadAll || edition.isFree;

              const dotIdx = edition.teaser.indexOf(". ");
              const lede = dotIdx > -1 ? edition.teaser.slice(0, dotIdx + 1) : edition.teaser;
              const rest = dotIdx > -1 ? edition.teaser.slice(dotIdx + 1) : "";

              return (
                <button
                  key={edition.id}
                  onClick={() => (canRead ? handleOpen(edition) : router.push("/subscribe"))}
                  className="bg-[#161616] border border-[#262626] rounded-2xl overflow-hidden text-left hover:border-white/10 transition-colors cursor-pointer w-full"
                >
                  <div style={{ height: 3, background: accentColor }} />
                  <div className="p-6 flex flex-col h-full">
                    {/* Label + date */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span style={{ color: accentColor }} className="text-lg">{isMorning ? "☕" : "🌙"}</span>
                        <span style={{ color: accentColor }} className="text-[11px] font-bold tracking-widest uppercase">
                          {title}
                        </span>
                      </div>
                      <span className="text-gray-300 text-xs font-medium">
                        {new Date(edition.publishedAt).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Headline */}
                    {edition.headline && (
                      <p className="text-[#f5f2eb] text-xl font-bold mb-3 leading-tight">{edition.headline}</p>
                    )}

                    {/* Teaser */}
                    <p className="text-gray-400 text-sm leading-relaxed flex-1">
                      <span className="text-[#f5f2eb] font-semibold">{lede}</span>
                      {rest && " " + rest}
                    </p>

                    {/* Footer CTA */}
                    <div className="flex items-center gap-2 pt-4 mt-4 border-t border-white/5">
                      {canRead ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                          </svg>
                          <span style={{ color: accentColor }} className="text-sm font-bold">Read Edition</span>
                          {edition.isFree && !canReadAll && (
                            <span className="text-gray-600 text-xs ml-1">· Free preview</span>
                          )}
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span className="text-gray-500 text-sm">Expert Only</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
