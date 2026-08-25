"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const CATEGORY_LABELS: Record<string, string> = {
  razors: "Razors", blades: "Blades", brushes: "Brushes", soaps: "Soaps",
  aftershaves: "Aftershaves", balms: "Balms", preshaves: "Pre-Shaves", edpedt: "Fragrances",
};

const CATEGORY_ICONS: Record<string, string> = {
  razors: "🪒", soaps: "🫧", aftershaves: "💧", balms: "🧴", preshaves: "✨", edpedt: "🌸",
  blades: "🔪", brushes: "🖌️",
};

type DenItem = {
  id: string; name: string; brand: string;
  data: {
    notes?: string;
    // Razor
    metal?: string; finish?: string; weight?: number; construction?: string;
    handleModel?: string; bladeGap?: number; exposure?: number; edgeType?: string;
    straightWidth?: string; straightPoint?: string; straightHollow?: string;
    // Blade
    bladeFormat?: string; sharpness?: number;
    bladeModel?: string; bladeCountryOfOrigin?: string; bladeCoating?: string;
    // Brush
    knot?: string; diameter?: string;
    // Soap scores
    soapDensity?: number; soapCushion?: number; soapSlickness?: number;
    soapStability?: number; soapScentStrength?: number;
    soapHasMenthol?: boolean; soapIsTallow?: boolean;
    soapCatalogUrlPath?: string;
    // Aftershave / EDP
    aftershaveScentStrength?: number; edpedtScentStrength?: number; size?: number;
    aftershaveCatalogUrlPath?: string;
    // Preshave
    preshaveType?: string;
    // Scent
    topNotes?: string; heartNotes?: string; baseNotes?: string;
    scentDescription?: string; scentFamily?: string; familySubtype?: string;
  };
};
type DenCategory = { id: string; items: DenItem[] };
type DenData = { ownerName: string; categories: DenCategory[]; totalItems: number };

function ScoreBar({ label, value }: { label: string; value: number }) {
  if (!value || value === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500 text-xs w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#c9a050]"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className="text-[#c9a050] text-xs w-6 text-right">{value}</span>
    </div>
  );
}

function ItemDetail({ item, categoryId }: { item: DenItem; categoryId: string }) {
  const d = item.data;
  const scentStrength = categoryId === "aftershaves" ? d.aftershaveScentStrength
    : categoryId === "edpedt" ? d.edpedtScentStrength
    : d.soapScentStrength;

  const hasSoapScores = categoryId === "soaps" && (d.soapDensity || d.soapCushion || d.soapSlickness || d.soapStability);
  const hasScentNotes = d.topNotes || d.heartNotes || d.baseNotes;
  const hasRazorSpecs = d.metal || d.finish || d.construction || d.handleModel || d.bladeGap || d.exposure;
  const hasBrushSpecs = d.knot || d.diameter;

  return (
    <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">

      {/* Notes */}
      {d.notes && (
        <p className="text-gray-400 text-sm italic leading-relaxed">&ldquo;{d.notes}&rdquo;</p>
      )}

      {/* Razor specs */}
      {hasRazorSpecs && (
        <div className="flex flex-wrap gap-2">
          {d.metal && <Chip label={d.metal} />}
          {d.finish && <Chip label={d.finish} />}
          {d.construction && <Chip label={d.construction} />}
          {d.edgeType && <Chip label={d.edgeType} />}
          {d.handleModel && <Chip label={`Handle: ${d.handleModel}`} />}
          {d.weight && <Chip label={`${d.weight}g`} />}
          {d.bladeGap && <Chip label={`Gap: ${d.bladeGap}mm`} />}
          {d.exposure !== undefined && d.exposure !== 0 && <Chip label={`Exp: ${d.exposure}mm`} />}
          {d.straightWidth && <Chip label={d.straightWidth} />}
          {d.straightPoint && <Chip label={d.straightPoint} />}
          {d.straightHollow && <Chip label={d.straightHollow} />}
        </div>
      )}

      {/* Blade specs */}
      {categoryId === "blades" && (d.bladeFormat || d.sharpness || d.bladeCountryOfOrigin || d.bladeCoating) && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {d.bladeFormat && <Chip label={d.bladeFormat} />}
            {d.bladeCountryOfOrigin && <Chip label={d.bladeCountryOfOrigin} />}
            {d.bladeCoating && <Chip label={d.bladeCoating} />}
          </div>
          {d.sharpness && d.sharpness > 0 && (
            <ScoreBar label="Sharpness" value={d.sharpness} />
          )}
        </div>
      )}

      {/* Brush specs */}
      {hasBrushSpecs && (
        <div className="flex flex-wrap gap-2">
          {d.knot && <Chip label={d.knot} />}
          {d.diameter && <Chip label={d.diameter} />}
        </div>
      )}

      {/* Preshave type */}
      {categoryId === "preshaves" && d.preshaveType && (
        <div className="flex flex-wrap gap-2">
          <Chip label={d.preshaveType} />
        </div>
      )}

      {/* Soap badges + scores */}
      {categoryId === "soaps" && (
        <div className="space-y-2">
          {(d.soapHasMenthol !== undefined || d.soapIsTallow !== undefined) && (
            <div className="flex flex-wrap gap-2">
              {d.soapHasMenthol && <Chip label="🧊 Menthol" accent />}
              {d.soapIsTallow === true && <Chip label="Tallow" />}
              {d.soapIsTallow === false && <Chip label="Vegan" />}
            </div>
          )}
          {hasSoapScores && (
            <div className="space-y-1.5">
              <ScoreBar label="Lather" value={d.soapDensity ?? 0} />
              <ScoreBar label="Cushion" value={d.soapCushion ?? 0} />
              <ScoreBar label="Slickness" value={d.soapSlickness ?? 0} />
              <ScoreBar label="Stability" value={d.soapStability ?? 0} />
            </div>
          )}
        </div>
      )}

      {/* Scent strength for aftershaves / edpedt / soaps */}
      {scentStrength && scentStrength > 0 && (
        <ScoreBar label="Scent" value={scentStrength} />
      )}

      {/* Size */}
      {d.size && (
        <div className="flex flex-wrap gap-2">
          <Chip label={`${d.size}${["aftershaves", "edpedt"].includes(categoryId) ? "mL" : "oz"}`} />
        </div>
      )}

      {/* Scent profile */}
      {(d.scentFamily || d.familySubtype) && (
        <div className="flex flex-wrap gap-2">
          {d.scentFamily && <Chip label={d.scentFamily} accent />}
          {d.familySubtype && <Chip label={d.familySubtype} />}
        </div>
      )}

      {hasScentNotes && (
        <div className="bg-white/3 rounded-xl p-3 space-y-1.5">
          {d.topNotes && (
            <div className="flex gap-2 text-xs">
              <span className="text-gray-600 w-12 flex-shrink-0">Top</span>
              <span className="text-gray-300">{d.topNotes}</span>
            </div>
          )}
          {d.heartNotes && (
            <div className="flex gap-2 text-xs">
              <span className="text-gray-600 w-12 flex-shrink-0">Heart</span>
              <span className="text-gray-300">{d.heartNotes}</span>
            </div>
          )}
          {d.baseNotes && (
            <div className="flex gap-2 text-xs">
              <span className="text-gray-600 w-12 flex-shrink-0">Base</span>
              <span className="text-gray-300">{d.baseNotes}</span>
            </div>
          )}
        </div>
      )}

      {d.scentDescription && (
        <p className="text-gray-500 text-xs leading-relaxed">{d.scentDescription}</p>
      )}

      {/* Catalog links */}
      {d.soapCatalogUrlPath && (
        <a
          href={`https://www.shavesplash.com${d.soapCatalogUrlPath}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#c9a050] text-xs hover:underline"
        >
          View on ShaveSplash.com →
        </a>
      )}
      {d.aftershaveCatalogUrlPath && (
        <a
          href={`https://www.shavesplash.com${d.aftershaveCatalogUrlPath}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#c9a050] text-xs hover:underline"
        >
          View on ShaveSplash.com →
        </a>
      )}
    </div>
  );
}

function Chip({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${accent ? "border-[#c9a050]/30 text-[#c9a050] bg-[#c9a050]/10" : "border-white/10 text-gray-400 bg-white/5"}`}>
      {label}
    </span>
  );
}

function ItemCard({ item, categoryId }: { item: DenItem; categoryId: string }) {
  const [expanded, setExpanded] = useState(false);
  const d = item.data;

  const hasDetails = d.notes || d.metal || d.finish || d.construction || d.edgeType ||
    d.knot || d.diameter || d.bladeFormat || (d.sharpness && d.sharpness > 0) ||
    d.bladeCountryOfOrigin || d.bladeCoating || d.soapDensity || d.soapCushion ||
    d.soapSlickness || d.soapStability || d.soapScentStrength || d.soapHasMenthol !== undefined ||
    d.aftershaveScentStrength || d.edpedtScentStrength || d.topNotes || d.heartNotes ||
    d.baseNotes || d.scentFamily || d.preshaveType || d.size || d.weight ||
    d.bladeGap || d.soapCatalogUrlPath || d.aftershaveCatalogUrlPath;

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => hasDetails && setExpanded((v) => !v)}
        className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors ${hasDetails ? "hover:bg-white/3 cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            {item.brand && (
              <span className="text-[#c9a050] text-xs font-semibold flex-shrink-0">{item.brand}</span>
            )}
            <span className="text-[#f5f2eb] text-sm">{item.name}</span>
          </div>
          {!expanded && d.notes && (
            <p className="text-gray-600 text-xs mt-0.5 truncate italic">{d.notes}</p>
          )}
        </div>
        {hasDetails && (
          <span className="text-gray-600 flex-shrink-0">
            {expanded ? "▲" : "▼"}
          </span>
        )}
      </button>
      {expanded && <ItemDetail item={item} categoryId={categoryId} />}
    </div>
  );
}

function CategorySection({ cat, defaultOpen }: { cat: DenCategory; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const label = CATEGORY_LABELS[cat.id] ?? cat.id;
  const icon = CATEGORY_ICONS[cat.id] ?? "📦";

  return (
    <div className="bg-[#191919] rounded-2xl border border-white/5 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/3 transition-colors"
      >
        <span className="text-lg">{icon}</span>
        <h2 className="text-[#f5f2eb] font-semibold text-sm flex-1 text-left">{label}</h2>
        <span className="text-gray-600 text-xs mr-2">{cat.items.length}</span>
        <span className="text-gray-600">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-white/5">
          {cat.items.map((item) => (
            <ItemCard key={item.id} item={item} categoryId={cat.id} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SharedDenPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<DenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/den/public/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? "Not found");
        }
        return r.json() as Promise<DenData>;
      })
      .then((d) => { setData(d); setActiveTab(d.categories[0]?.id ?? null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🪒</p>
          <h1 className="text-[#f5f2eb] font-semibold text-lg mb-2">Den not available</h1>
          <p className="text-gray-500 text-sm mb-6">This Den is no longer being shared, or the link has expired.</p>
          <Link href="/" className="text-[#c9a050] text-sm hover:underline">Go to ShaveSplash →</Link>
        </div>
      </div>
    );
  }

  const visibleCats = activeTab ? data.categories.filter((c) => c.id === activeTab) : data.categories;

  return (
    <div className="min-h-screen bg-[#111] text-[#f5f2eb]">
      {/* Header */}
      <div className="bg-[#151515] border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors mb-6 block">
            ← ShaveSplash
          </Link>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Shaving Den</p>
              <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050]">
                {data.ownerName}
              </h1>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-[#f5f2eb]">{data.totalItems}</p>
              <p className="text-gray-600 text-xs">items</p>
            </div>
          </div>

          {/* Category stat pills */}
          <div className="flex flex-wrap gap-2 mt-5">
            {data.categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1">
                <span className="text-sm">{CATEGORY_ICONS[cat.id] ?? "📦"}</span>
                <span className="text-gray-400 text-xs">{cat.items.length} {CATEGORY_LABELS[cat.id] ?? cat.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab filter */}
      {data.categories.length > 1 && (
        <div className="sticky top-0 z-10 bg-[#111]/95 backdrop-blur border-b border-white/5">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex gap-0 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setActiveTab(null)}
                className={`flex-shrink-0 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === null ? "border-[#c9a050] text-[#c9a050]" : "border-transparent text-gray-500 hover:text-gray-300"}`}
              >
                All
              </button>
              {data.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === cat.id ? "border-[#c9a050] text-[#c9a050]" : "border-transparent text-gray-500 hover:text-gray-300"}`}
                >
                  <span>{CATEGORY_ICONS[cat.id] ?? "📦"}</span>
                  {CATEGORY_LABELS[cat.id] ?? cat.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {visibleCats.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-12">This Den is empty.</p>
        ) : (
          visibleCats.map((cat, i) => (
            <CategorySection key={cat.id} cat={cat} defaultOpen={i === 0} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto px-4 py-8 border-t border-white/5 text-center">
        <p className="text-gray-600 text-xs">
          Shared via{" "}
          <Link href="/" className="text-[#c9a050] hover:underline">ShaveSplash</Link>
          {" "}— Track, analyze, and share your wet shaving gear
        </p>
      </div>
    </div>
  );
}
