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
  createdAt: string;
};

type GearEdit = {
  id: string;
  gearItemId: string;
  current: { brand: string; name: string; data: Record<string, unknown>; hasPhoto: boolean };
  proposed: { brand?: string; name?: string; data?: Record<string, unknown> };
  submittedBy: string;
  createdAt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  razors: "Razor", blades: "Blade", brushes: "Brush",
  soaps: "Soap", aftershaves: "Aftershave", balms: "Balm",
  preshaves: "Preshave", edpedt: "EDP/EDT",
};

function PhotoPreview({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get<{ photoUrl: string | null }>(`/api/admin/gear/${id}/photo`)
      .then((d) => setUrl(d.photoUrl))
      .catch(() => {});
  }, [id]);

  if (!url) return null;
  return (
    <div className="w-16 aspect-square rounded-lg overflow-hidden bg-[#242424] shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}

function DataDisplay({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== 0);
  if (!entries.length) return <span className="text-gray-600 text-xs">No additional data</span>;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {entries.map(([k, v]) => (
        <span key={k} className="text-xs bg-[#242424] border border-white/10 rounded px-2 py-0.5 text-gray-400">
          <span className="text-gray-600">{k}: </span>{String(v)}
        </span>
      ))}
    </div>
  );
}

function SubmissionCard({ item, onAction }: {
  item: GearSubmission;
  onAction: (id: string, action: "approve" | "reject" | "delete") => Promise<void>;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | "delete" | null>(null);
  const [done, setDone] = useState(false);

  const handle = async (action: "approve" | "reject" | "delete") => {
    setBusy(action);
    await onAction(item.id, action);
    setDone(true);
  };

  if (done) return null;

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-5">
      <div className="flex items-start gap-4">
        {item.hasPhoto && <PhotoPreview id={item.id} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs bg-[#c9a050]/10 text-[#c9a050] border border-[#c9a050]/20 rounded-full px-2 py-0.5">
              {CATEGORY_LABELS[item.categoryId] ?? item.categoryId}
            </span>
            <span className="text-[10px] text-gray-600">{new Date(item.createdAt).toLocaleDateString()}</span>
            <span className="text-[10px] text-gray-700 truncate">{item.submittedBy.slice(0, 8)}…</span>
          </div>
          <p className="text-[#f5f2eb] font-semibold">{item.brand} — {item.name}</p>
          <DataDisplay data={item.data} />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
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
        <p className="text-[10px] text-gray-700 mt-0.5">By: {edit.submittedBy.slice(0, 8)}…</p>
      </div>
      <div className="space-y-1">
        {brand && <p className="text-xs"><span className="text-gray-600">Brand → </span><span className="text-[#f5f2eb]">{brand}</span></p>}
        {name && <p className="text-xs"><span className="text-gray-600">Name → </span><span className="text-[#f5f2eb]">{name}</span></p>}
        {data && <DataDisplay data={data} />}
      </div>
      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
        <button onClick={() => handle("approve")} disabled={!!busy}
          className="px-4 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50">
          {busy === "approve" ? "Approving…" : "Approve"}
        </button>
        <button onClick={() => handle("reject")} disabled={!!busy}
          className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50">
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </div>
  );
}

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
