"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

type ScoreParameter = { id: string; name: string; shortName: string };

export default function PreferencesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AuthGuard><PreferencesContent /></AuthGuard>
    </div>
  );
}

function PreferencesContent() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [resultOptions, setResultOptions] = useState<string[]>([]);
  const [scoreParameters, setScoreParameters] = useState<ScoreParameter[]>([]);
  const [synced, setSynced] = useState(false);

  // Display name
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

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

  useEffect(() => {
    if (!session) return;
    api.get<{ profile: { displayName?: string | null } }>("/api/bst/profile")
      .then((d) => { if (d.profile?.displayName) setDisplayName(d.profile.displayName); })
      .catch(() => {});
  }, [session]);

  const handleSaveName = async () => {
    if (!displayName.trim() || savingName) return;
    setSavingName(true);
    try {
      await api.patch("/api/bst/profile", { displayName: displayName.trim() });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch {}
    finally { setSavingName(false); }
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
        {/* Display Name */}
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6">
          <h2 className="text-[#f5f2eb] font-semibold text-base mb-1">Public Username</h2>
          <p className="text-gray-500 text-xs mb-4">Shown on forum posts, messages, and marketplace listings. Syncs instantly with the mobile app.</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
              placeholder="Choose a username"
              maxLength={40}
              className="flex-1 bg-[#242424] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/40"
            />
            <button
              onClick={handleSaveName}
              disabled={!displayName.trim() || savingName}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
                nameSaved
                  ? "bg-green-500 text-white"
                  : "bg-[#c9a050] text-black hover:bg-[#b8903f]"
              }`}
            >
              {nameSaved ? "✓ Saved" : savingName ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

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

        {/* Import data */}
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6">
          <h2 className="text-[#f5f2eb] font-semibold text-base mb-1">Import Data</h2>
          <p className="text-gray-500 text-xs mb-4">Upload a ShaveSplash CSV export to import your inventory and shave logs into this account.</p>
          <a
            href="/import"
            className="inline-flex items-center gap-2 bg-[#c9a050] text-black font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[#b8903f] transition-colors"
          >
            Import from CSV
          </a>
        </div>
      </div>
    </div>
  );
}
