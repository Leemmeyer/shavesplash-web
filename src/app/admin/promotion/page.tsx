"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Promotion {
  isActive: boolean;
  title: string;
  message: string;
  partnerName?: string;
  promoCode?: string;
  ctaText?: string;
  ctaUrl?: string;
  updatedAt: string;
}

const EMPTY: Promotion = {
  isActive: false,
  title: "",
  message: "",
  partnerName: "",
  promoCode: "",
  ctaText: "",
  ctaUrl: "",
  updatedAt: "",
};

export default function PromotionAdminPage() {
  const [form, setForm] = useState<Promotion>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    api.get<Promotion>("/api/promotion")
      .then((d) => setForm(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof Promotion, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setBanner({ ok: false, msg: "Title is required." }); return; }
    if (!form.message.trim()) { setBanner({ ok: false, msg: "Message is required." }); return; }
    setSaving(true);
    setBanner(null);
    try {
      const updated = await api.put<Promotion>("/api/promotion", {
        isActive: form.isActive,
        title: form.title,
        message: form.message,
        partnerName: form.partnerName?.trim() || null,
        promoCode: form.promoCode?.trim() || null,
        ctaText: form.ctaText?.trim() || null,
        ctaUrl: form.ctaUrl?.trim() || null,
      });
      setForm(updated);
      setBanner({ ok: true, msg: "Promotion saved and published." });
    } catch {
      setBanner({ ok: false, msg: "Failed to save. Check your connection." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-[#f5f2eb] text-xl font-semibold mb-1">Bell Promotion</h2>
        <p className="text-gray-500 text-sm">
          Controls the bell icon on the mobile app. When active, users see a modal with the promotion details.
        </p>
      </div>

      {banner && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${banner.ok ? "bg-green-900/40 text-green-400 border border-green-800" : "bg-red-900/40 text-red-400 border border-red-800"}`}>
          {banner.msg}
        </div>
      )}

      {/* Active toggle */}
      <div className="bg-[#252525] border border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[#f5f2eb] font-semibold">Active</p>
          <p className="text-gray-500 text-sm mt-0.5">Show the bell icon and allow users to view this promotion</p>
        </div>
        <button
          onClick={() => set("isActive", !form.isActive)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${form.isActive ? "bg-red-600" : "bg-white/10"}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <Field label="Title" required>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Exclusive Subscriber Offer"
            className="w-full bg-transparent text-[#f5f2eb] placeholder-gray-600 text-sm outline-none px-4 py-3"
          />
        </Field>

        <Field label="Message" required>
          <textarea
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            placeholder="e.g. Get 20% off your next order with code below..."
            rows={4}
            className="w-full bg-transparent text-[#f5f2eb] placeholder-gray-600 text-sm outline-none px-4 py-3 resize-none"
          />
        </Field>

        <Field label="Partner Name" hint="Optional — shown above the title">
          <input
            value={form.partnerName ?? ""}
            onChange={(e) => set("partnerName", e.target.value)}
            placeholder="e.g. West Coast Shaving"
            className="w-full bg-transparent text-[#f5f2eb] placeholder-gray-600 text-sm outline-none px-4 py-3"
          />
        </Field>

        <Field label="Promo Code" hint="Optional — displayed as a copyable code">
          <input
            value={form.promoCode ?? ""}
            onChange={(e) => set("promoCode", e.target.value.toUpperCase())}
            placeholder="e.g. SHAVE20"
            className="w-full bg-transparent text-[#f5f2eb] placeholder-gray-600 text-sm outline-none px-4 py-3 font-mono tracking-wider"
          />
        </Field>

        <Field label="CTA Button Text" hint="Optional — button label (requires CTA URL)">
          <input
            value={form.ctaText ?? ""}
            onChange={(e) => set("ctaText", e.target.value)}
            placeholder="e.g. Shop Now"
            className="w-full bg-transparent text-[#f5f2eb] placeholder-gray-600 text-sm outline-none px-4 py-3"
          />
        </Field>

        <Field label="CTA URL" hint="Optional — opens in external browser when button is tapped">
          <input
            value={form.ctaUrl ?? ""}
            onChange={(e) => set("ctaUrl", e.target.value)}
            placeholder="https://example.com"
            type="url"
            className="w-full bg-transparent text-[#f5f2eb] placeholder-gray-600 text-sm outline-none px-4 py-3"
          />
        </Field>
      </div>

      {/* Preview */}
      {(form.title || form.message) && (
        <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 space-y-3">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Preview</p>
          {form.partnerName && (
            <p className="text-[#c9a050] text-xs font-semibold uppercase tracking-widest">{form.partnerName}</p>
          )}
          <p className="text-[#f5f2eb] text-lg font-bold leading-snug">{form.title || "—"}</p>
          <p className="text-gray-400 text-sm leading-relaxed">{form.message || "—"}</p>
          {form.promoCode && (
            <div className="bg-[#2a2a2a] border border-white/10 rounded-xl px-4 py-2 inline-block">
              <p className="text-[#c9a050] font-mono font-bold tracking-widest text-sm">{form.promoCode}</p>
            </div>
          )}
          {form.ctaText && form.ctaUrl && (
            <div className="bg-red-700 rounded-xl px-4 py-2.5 inline-block">
              <p className="text-white font-semibold text-sm">{form.ctaText}</p>
            </div>
          )}
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? "Saving..." : "Save & Publish"}
        </button>
        {form.updatedAt && (
          <p className="text-gray-600 text-xs">
            Last updated {new Date(form.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5 ml-0.5">
        <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</label>
        {required && <span className="text-red-500 text-xs">*</span>}
      </div>
      {hint && <p className="text-gray-600 text-xs mb-1.5 ml-0.5">{hint}</p>}
      <div className="bg-[#252525] border border-white/10 rounded-xl overflow-hidden focus-within:border-white/25 transition-colors">
        {children}
      </div>
    </div>
  );
}
