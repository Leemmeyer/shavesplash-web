"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

type ScoreParameter = { id: string; name: string; shortName: string };

export default function PreferencesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AuthGuard><PreferencesContent /></AuthGuard>
    </div>
  );
}

function PreferencesContent() {
  const [loading, setLoading] = useState(true);
  const [resultOptions, setResultOptions] = useState<string[]>([]);
  const [scoreParameters, setScoreParameters] = useState<ScoreParameter[]>([]);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    api.get<{ resultOptions: string[]; scoreParameters: ScoreParameter[] }>("/api/preferences")
      .then((d) => {
        setResultOptions(d.resultOptions);
        setScoreParameters(d.scoreParameters);
        setSynced(true);
      })
      .catch(() => setSynced(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 w-full">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#c9a050] mb-1">Log Preferences</h1>
        <p className="text-gray-500 text-sm">Synced automatically from your phone app</p>
      </div>

      {/* Sync status banner */}
      <div className={`rounded-xl border px-4 py-3 mb-8 text-sm ${
        synced
          ? "bg-green-500/10 border-green-500/20 text-green-400"
          : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
      }`}>
        {synced
          ? "✓ Parameters synced from your phone. Changes made on the phone will appear here after your next sync."
          : "⚠ No parameters synced yet. Open ShaveSplash on your phone and press Sync to push your settings here."}
      </div>

      <div className="space-y-6">
        {/* Result Options */}
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6">
          <h2 className="text-[#f5f2eb] font-semibold text-base mb-1">Result Options</h2>
          <p className="text-gray-500 text-xs mb-4">Listed worst → best (position 1 = worst)</p>
          {resultOptions.length > 0 ? (
            <div className="space-y-1.5">
              {resultOptions.map((r, i) => (
                <div key={r} className="flex items-center gap-3 bg-[#242424] rounded-lg px-3 py-2 border border-white/5">
                  <span className="text-gray-600 text-xs w-5 text-center">{i + 1}</span>
                  <span className="text-[#f5f2eb] text-sm">{r}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No result options synced yet.</p>
          )}
        </div>

        {/* Score Parameters */}
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6">
          <h2 className="text-[#f5f2eb] font-semibold text-base mb-1">Score Parameters</h2>
          <p className="text-gray-500 text-xs mb-4">Used when logging shaves on the web</p>
          {scoreParameters.length > 0 ? (
            <div className="space-y-1.5">
              {scoreParameters.map((p) => (
                <div key={p.id} className="flex items-center gap-3 bg-[#242424] rounded-lg px-3 py-2 border border-white/5">
                  <span className="text-[#f5f2eb] text-sm flex-1">{p.name}</span>
                  <span className="text-gray-500 text-xs">Short: {p.shortName}</span>
                  <span className="text-gray-700 text-xs font-mono">id: {p.id}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No score parameters synced yet.</p>
          )}
        </div>

        <div className="bg-[#1a1a1a] rounded-xl border border-white/5 p-4">
          <p className="text-gray-500 text-xs leading-relaxed">
            <strong className="text-gray-400">To update these:</strong> Change your Result Options or Score Parameters in the ShaveSplash mobile app (Settings → Score Parameters / Result Options), then press Sync. The web app will pick up the changes automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
