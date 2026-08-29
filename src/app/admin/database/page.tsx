"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type GearSubmission = {
  id: string;
  categoryId: string;
  brand: string;
  name: string;
  data: Record<string, unknown>;
  hasPhoto: boolean;
  status: string;
  submittedBy: string;
  submittedByName: string | null;
  submittedByEmail: string | null;
  createdAt: string;
};

type GearEdit = {
  id: string;
  gearItemId: string;
  current: { brand: string; name: string; data: Record<string, unknown>; hasPhoto: boolean };
  proposed: { brand?: string; name?: string; data?: Record<string, unknown> };
  submittedBy: string;
  submittedByName: string | null;
  submittedByEmail: string | null;
  createdAt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  razors: "Razor", blades: "Blade", brushes: "Brush",
  soaps: "Soap", aftershaves: "Aftershave", balms: "Balm",
  preshaves: "Preshave", edpedt: "EDP/EDT",
};

// All fields per category, with display labels
const ALL_FIELDS: Record<string, { key: string; label: string }[]> = {
  razors: [
    { key: "edgeType", label: "Edge Type" },
    { key: "construction", label: "Construction" },
    { key: "metal", label: "Metal" },
    { key: "finish", label: "Finish" },
    { key: "bladeGap", label: "Blade Gap (mm)" },
    { key: "exposure", label: "Exposure (mm)" },
    { key: "weight", label: "Weight (g)" },
    { key: "straightWidth", label: "Width" },
    { key: "straightPoint", label: "Point" },
    { key: "straightHollow", label: "Hollow" },
  ],
  blades: [
    { key: "bladeFormat", label: "Format" },
    { key: "bladeCountryOfOrigin", label: "Country of Origin" },
    { key: "bladeCoating", label: "Coating" },
    { key: "sharpness", label: "Sharpness" },
  ],
  brushes: [
    { key: "knot", label: "Knot" },
    { key: "diameter", label: "Diameter" },
  ],
  soaps: [
    { key: "soapDensity", label: "Density" },
    { key: "soapCushion", label: "Cushion" },
    { key: "soapSlickness", label: "Slickness" },
    { key: "soapStability", label: "Stability" },
    { key: "soapScentStrength", label: "Scent Strength" },
    { key: "soapHasMenthol", label: "Menthol" },
    { key: "soapIsTallow", label: "Base" },
    { key: "scentFamily", label: "Scent Family" },
    { key: "familySubtype", label: "Subtype" },
    { key: "topNotes", label: "Top Notes" },
    { key: "heartNotes", label: "Heart Notes" },
    { key: "baseNotes", label: "Base Notes" },
    { key: "ingredients", label: "Ingredients" },
    { key: "inspiration", label: "Inspiration" },
    { key: "size", label: "Size (oz)" },
  ],
  aftershaves: [
    { key: "aftershaveScentStrength", label: "Scent Strength" },
    { key: "scentFamily", label: "Scent Family" },
    { key: "familySubtype", label: "Subtype" },
    { key: "topNotes", label: "Top Notes" },
    { key: "heartNotes", label: "Heart Notes" },
    { key: "baseNotes", label: "Base Notes" },
    { key: "ingredients", label: "Ingredients" },
    { key: "inspiration", label: "Inspiration" },
    { key: "size", label: "Size (mL)" },
  ],
  balms: [
    { key: "ingredients", label: "Ingredients" },
    { key: "size", label: "Size (oz)" },
  ],
  preshaves: [
    { key: "preshaveType", label: "Type" },
    { key: "ingredients", label: "Ingredients" },
  ],
  edpedt: [
    { key: "edpedtScentStrength", label: "Scent Strength" },
    { key: "scentFamily", label: "Scent Family" },
    { key: "familySubtype", label: "Subtype" },
    { key: "topNotes", label: "Top Notes" },
    { key: "heartNotes", label: "Heart Notes" },
    { key: "baseNotes", label: "Base Notes" },
    { key: "ingredients", label: "Ingredients" },
    { key: "inspiration", label: "Inspiration" },
    { key: "size", label: "Size (mL)" },
  ],
};

function formatValue(key: string, value: unknown): string {
  if (key === "soapHasMenthol") return value ? "Yes" : "No";
  if (key === "soapIsTallow") return value ? "Tallow" : "Vegan";
  if (key.endsWith("Strength") || key === "sharpness") return `${value}/10`;
  return String(value);
}

function SubmitterBadge({ name, email }: { name: string | null; email: string | null }) {
  const display = name || email || "Unknown";
  const sub = name && email ? email : null;
  return (
    <div className="text-[11px] text-gray-500 leading-tight">
      <span className="font-medium text-gray-400">{display}</span>
      {sub && <span className="ml-1 text-gray-600">({sub})</span>}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function FullPhotoModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    api.get<{ photoUrl: string | null }>(`/api/admin/gear/${id}/photo`)
      .then((d) => setUrl(d.photoUrl)).catch(() => {});
  }, [id]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        {url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={url} alt="" className="w-full rounded-xl object-contain max-h-[80vh]" />
          : <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>
        }
      </div>
    </div>
  );
}

function SubmissionDetailModal({ item, onAction, onClose }: {
  item: GearSubmission;
  onAction: (action: "approve" | "reject" | "delete") => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | "delete" | null>(null);
  const [done, setDone] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);

  const handle = async (action: "approve" | "reject" | "delete") => {
    setBusy(action);
    await onAction(action);
    setDone(true);
    onClose();
  };

  const fields = ALL_FIELDS[item.categoryId] ?? [];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
        <div className="bg-[#1e1e1e] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/10 max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5 shrink-0">
            <div>
              <span className="text-xs bg-[#c9a050]/10 text-[#c9a050] border border-[#c9a050]/20 rounded-full px-2 py-0.5">
                {CATEGORY_LABELS[item.categoryId] ?? item.categoryId}
              </span>
              <p className="text-[#f5f2eb] font-semibold mt-1.5">{item.brand} — {item.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <SubmitterBadge name={item.submittedByName} email={item.submittedByEmail} />
                <span className="text-gray-700 text-[10px]">· {new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-xl leading-none ml-4 shrink-0">✕</button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-2">
            {/* Photo */}
            {item.hasPhoto && (
              <button onClick={() => setShowPhoto(true)}
                className="w-full aspect-video bg-[#161616] rounded-xl overflow-hidden block hover:opacity-90 transition-opacity mb-3">
                <PhotoThumbnail id={item.id} />
              </button>
            )}

            {/* All fields */}
            {fields.map(({ key, label }) => {
              const val = item.data[key];
              const populated = val !== null && val !== undefined && val !== "" && val !== 0;
              return (
                <div key={key} className={`flex justify-between items-start gap-4 py-1.5 border-b border-white/5 last:border-0 ${populated ? "" : "opacity-30"}`}>
                  <span className="text-gray-500 text-sm shrink-0">{label}</span>
                  <span className={`text-sm text-right ${populated ? "text-[#f5f2eb]" : "text-gray-700 italic"}`}>
                    {populated ? formatValue(key, val) : "—"}
                  </span>
                </div>
              );
            })}
            {fields.length === 0 && (
              <p className="text-gray-600 text-sm text-center py-4">No category-specific fields</p>
            )}
          </div>

          {/* Actions */}
          {!done && (
            <div className="px-5 pb-5 pt-3 border-t border-white/5 shrink-0 flex gap-2">
              <button onClick={() => handle("approve")} disabled={!!busy}
                className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-500 transition-colors disabled:opacity-50">
                {busy === "approve" ? "Approving…" : "Approve"}
              </button>
              <button onClick={() => handle("reject")} disabled={!!busy}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50">
                {busy === "reject" ? "Rejecting…" : "Reject"}
              </button>
              <button onClick={() => handle("delete")} disabled={!!busy}
                className="px-4 py-2.5 border border-white/10 text-gray-500 text-sm rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50">
                {busy === "delete" ? "…" : "Delete"}
              </button>
            </div>
          )}
        </div>
      </div>
      {showPhoto && <FullPhotoModal id={item.id} onClose={() => setShowPhoto(false)} />}
    </>
  );
}

function PhotoThumbnail({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    api.get<{ photoUrl: string | null }>(`/api/admin/gear/${id}/photo`)
      .then((d) => setUrl(d.photoUrl)).catch(() => {});
  }, [id]);
  if (!url) return <div className="w-full h-full flex items-center justify-center"><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" onLoad={() => setLoaded(true)} className={`w-full h-full object-contain transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`} />;
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function SubmissionCard({ item, onAction }: {
  item: GearSubmission;
  onAction: (id: string, action: "approve" | "reject" | "delete") => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"approve" | "reject" | "delete" | null>(null);
  const [done, setDone] = useState(false);

  const handle = async (action: "approve" | "reject" | "delete") => {
    setBusy(action);
    await onAction(item.id, action);
    setBusy(null);
    setDone(true);
  };

  if (done) return null;

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-4 cursor-pointer hover:border-white/15 transition-colors"
      >
        <div className="flex items-start gap-3">
          {item.hasPhoto && (
            <div className="w-14 aspect-square rounded-lg overflow-hidden bg-[#242424] shrink-0">
              <PhotoThumbnail id={item.id} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs bg-[#c9a050]/10 text-[#c9a050] border border-[#c9a050]/20 rounded-full px-2 py-0.5">
                {CATEGORY_LABELS[item.categoryId] ?? item.categoryId}
              </span>
              <span className="text-[10px] text-gray-600">{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-[#f5f2eb] font-semibold text-sm">{item.brand} — {item.name}</p>
            <SubmitterBadge name={item.submittedByName} email={item.submittedByEmail} />
            <p className="text-[10px] text-gray-600 mt-1.5">Click to view all fields →</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handle("approve")} disabled={!!busy}
            className="px-4 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50">
            {busy === "approve" ? "Approving…" : "Approve"}
          </button>
          <button onClick={() => handle("reject")} disabled={!!busy}
            className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50">
            {busy === "reject" ? "Rejecting…" : "Reject"}
          </button>
          <button onClick={() => handle("delete")} disabled={!!busy}
            className="px-4 py-1.5 border border-white/10 text-gray-500 text-xs rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50 ml-auto">
            {busy === "delete" ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {open && (
        <SubmissionDetailModal item={item} onAction={handle} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function EditCard({ edit, onAction }: {
  edit: GearEdit;
  onAction: (id: string, action: "approve" | "reject") => Promise<void>;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState(false);

  const handle = async (action: "approve" | "reject") => {
    setBusy(action);
    await onAction(edit.id, action);
    setDone(true);
  };

  if (done) return null;

  const { brand, name, data } = edit.proposed;

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-5">
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5">Edit Proposal</span>
          <span className="text-[10px] text-gray-600">{new Date(edit.createdAt).toLocaleDateString()}</span>
        </div>
        <p className="text-gray-500 text-sm">
          Editing: <span className="text-[#f5f2eb] font-medium">{edit.current.brand} — {edit.current.name}</span>
        </p>
        <SubmitterBadge name={edit.submittedByName} email={edit.submittedByEmail} />
      </div>
      <div className="space-y-1 mt-2">
        {brand && <p className="text-xs"><span className="text-gray-600">Brand → </span><span className="text-[#f5f2eb]">{brand}</span></p>}
        {name && <p className="text-xs"><span className="text-gray-600">Name → </span><span className="text-[#f5f2eb]">{name}</span></p>}
        {data && Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== 0).map(([k, v]) => (
          <p key={k} className="text-xs"><span className="text-gray-600">{k} → </span><span className="text-[#f5f2eb]">{String(v)}</span></p>
        ))}
      </div>
      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
        <button onClick={() => handle("approve")} disabled={!!busy}
          className="flex-1 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50">
          {busy === "approve" ? "Approving…" : "Approve"}
        </button>
        <button onClick={() => handle("reject")} disabled={!!busy}
          className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50">
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDatabasePage() {
  const [submissions, setSubmissions] = useState<GearSubmission[]>([]);
  const [edits, setEdits] = useState<GearEdit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get<{ submissions: GearSubmission[]; edits: GearEdit[] }>("/api/admin/gear")
      .then((d) => { setSubmissions(d.submissions); setEdits(d.edits); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmission = async (id: string, action: "approve" | "reject" | "delete") => {
    if (action === "delete") {
      await api.delete(`/api/admin/gear/${id}`);
    } else {
      await api.post(`/api/admin/gear/${id}/${action}`, {});
    }
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleEdit = async (id: string, action: "approve" | "reject") => {
    await api.post(`/api/admin/gear/edits/${id}/${action}`, {});
    setEdits((prev) => prev.filter((e) => e.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  const total = submissions.length + edits.length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{total} item{total !== 1 ? "s" : ""} pending review</p>
        <button onClick={load} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Refresh</button>
      </div>

      {submissions.length > 0 && (
        <section>
          <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider mb-4">
            New Submissions ({submissions.length})
          </h2>
          <div className="space-y-3">
            {submissions.map((s) => (
              <SubmissionCard key={s.id} item={s} onAction={handleSubmission} />
            ))}
          </div>
        </section>
      )}

      {edits.length > 0 && (
        <section>
          <h2 className="text-[#f5f2eb] font-semibold text-sm uppercase tracking-wider mb-4">
            Edit Proposals ({edits.length})
          </h2>
          <div className="space-y-3">
            {edits.map((e) => (
              <EditCard key={e.id} edit={e} onAction={handleEdit} />
            ))}
          </div>
        </section>
      )}

      {total === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-600">Nothing pending review.</p>
        </div>
      )}
    </div>
  );
}
