"use client";

import { useEffect, useRef, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resultOptions, setResultOptions] = useState<string[]>([]);
  const [scoreParameters, setScoreParameters] = useState<ScoreParameter[]>([]);
  const [synced, setSynced] = useState(false);

  // Display name
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Email notification prefs
  type EmailPrefs = { forumReplies: boolean; quoteReplies: boolean; sotdComments: boolean; directMessages: boolean };
  const [emailPrefs, setEmailPrefs] = useState<EmailPrefs>({ forumReplies: true, quoteReplies: true, sotdComments: true, directMessages: true });
  const [savingEmailPref, setSavingEmailPref] = useState(false);

  // Clear all data
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  const [clearInventory, setClearInventory] = useState(true);
  const [clearLogs, setClearLogs] = useState(true);
  const [clearPreferences, setClearPreferences] = useState(true);

  // Den sharing
  const [denShareToken, setDenShareToken] = useState<string | null | undefined>(undefined);
  const [denShareLoading, setDenShareLoading] = useState(false);
  const [denLinkCopied, setDenLinkCopied] = useState(false);
  const [showDenMsgSearch, setShowDenMsgSearch] = useState(false);
  const [denMsgQuery, setDenMsgQuery] = useState("");
  const [denMsgResults, setDenMsgResults] = useState<{ id: string; displayName: string }[]>([]);
  const [denMsgSearching, setDenMsgSearching] = useState(false);
  const [denMsgSending, setDenMsgSending] = useState<string | null>(null);
  const [denMsgSent, setDenMsgSent] = useState<string | null>(null);
  const denMsgSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const nothingSelected = !clearInventory && !clearLogs && !clearPreferences;

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE MY ACCOUNT" || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete("/api/user");
      router.push("/?deleted=1");
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  };

  const handleClearData = async () => {
    if (clearConfirmText !== "DELETE" || clearing || nothingSelected) return;
    setClearing(true);
    setClearError("");
    try {
      await api.delete("/api/user/data", { inventory: clearInventory, logs: clearLogs, preferences: clearPreferences });
      router.push("/?cleared=1");
    } catch {
      setClearError("Something went wrong. Please try again.");
      setClearing(false);
    }
  };

  useEffect(() => {
    api.get<{ token: string | null }>("/api/den/share/status")
      .then((d) => setDenShareToken(d.token))
      .catch(() => setDenShareToken(null));
  }, []);

  const denShareUrl = denShareToken ? `${window.location.origin}/den/share/${denShareToken}` : null;

  const handleGenerateDenLink = async () => {
    setDenShareLoading(true);
    try {
      const d = await api.post<{ token: string }>("/api/den/share", {});
      setDenShareToken(d.token);
    } finally {
      setDenShareLoading(false);
    }
  };

  const handleRevokeDenLink = async () => {
    setDenShareLoading(true);
    try {
      await api.delete("/api/den/share");
      setDenShareToken(null);
    } finally {
      setDenShareLoading(false);
    }
  };

  const handleCopyDenLink = () => {
    if (!denShareUrl) return;
    navigator.clipboard.writeText(denShareUrl);
    setDenLinkCopied(true);
    setTimeout(() => setDenLinkCopied(false), 2000);
  };

  useEffect(() => {
    if (!showDenMsgSearch) { setDenMsgQuery(""); setDenMsgResults([]); setDenMsgSent(null); }
  }, [showDenMsgSearch]);

  useEffect(() => {
    if (denMsgSearchRef.current) clearTimeout(denMsgSearchRef.current);
    if (denMsgQuery.trim().length < 2) { setDenMsgResults([]); return; }
    setDenMsgSearching(true);
    denMsgSearchRef.current = setTimeout(async () => {
      try {
        const d = await api.get<{ users: { id: string; displayName: string }[] }>(`/api/bst/users/search?q=${encodeURIComponent(denMsgQuery)}`);
        setDenMsgResults(d.users);
      } catch {
        setDenMsgResults([]);
      } finally {
        setDenMsgSearching(false);
      }
    }, 300);
  }, [denMsgQuery]);

  const handleSendDenViaMessage = async (recipientId: string, displayName: string) => {
    if (denMsgSending || !denShareUrl) return;
    setDenMsgSending(recipientId);
    try {
      const { conversation } = await api.post<{ conversation: { id: string } }>("/api/bst/conversations/direct", { recipientId });
      await api.post(`/api/bst/conversations/${conversation.id}/messages`, { body: `Check out my Den: ${denShareUrl}` });
      setDenMsgSent(displayName);
    } catch {
      // leave as-is, user can retry
    } finally {
      setDenMsgSending(null);
    }
  };

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
    api.get<{ prefs: EmailPrefs }>("/api/preferences/email-notifs")
      .then((d) => setEmailPrefs(d.prefs))
      .catch(() => {});
  }, []);

  const handleEmailPrefToggle = async (key: keyof EmailPrefs) => {
    const next = { ...emailPrefs, [key]: !emailPrefs[key] };
    setEmailPrefs(next);
    setSavingEmailPref(true);
    await api.put("/api/preferences/email-notifs", next).catch(() => {});
    setSavingEmailPref(false);
  };

  useEffect(() => {
    if (!session) return;
    api.get<{ profile: { displayName?: string | null } }>("/api/bst/profile")
      .then((d) => { if (d.profile?.displayName) setDisplayName(d.profile.displayName); })
      .catch(() => {});
  }, [session]);

  // Scroll to hash anchor after page finishes loading
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading]);

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

        {/* Email Alerts */}
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6">
          <h2 className="text-[#f5f2eb] font-semibold text-base mb-1">Email Alerts</h2>
          <p className="text-gray-500 text-xs mb-4">
            Choose which activity triggers an email notification. {savingEmailPref && <span className="text-[#c9a050]">Saving…</span>}
          </p>
          <div className="space-y-3">
            {([
              { key: "forumReplies",   label: "Forum Replies",   sub: "When someone replies to your forum post" },
              { key: "quoteReplies",   label: "Quote Replies",   sub: "When someone quotes your post" },
              { key: "sotdComments",   label: "SOTD Comments",   sub: "When someone comments on your shave" },
              { key: "directMessages", label: "Direct Messages", sub: "When you receive a new message" },
            ] as { key: keyof EmailPrefs; label: string; sub: string }[]).map(({ key, label, sub }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[#f5f2eb] text-sm font-medium">{label}</p>
                  <p className="text-gray-500 text-xs">{sub}</p>
                </div>
                <button
                  onClick={() => handleEmailPrefToggle(key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${emailPrefs[key] ? "bg-[#c9a050]" : "bg-[#333]"}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${emailPrefs[key] ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Share My Den */}
        <div id="den-sharing" style={{ scrollMarginTop: "2rem" }} className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-6">
          <h2 className="text-[#f5f2eb] font-semibold text-base mb-1">Share My Den</h2>
          <p className="text-gray-500 text-xs mb-4">
            Generate a private link to share your gear collection with a friend. Anyone with the link can view your Den — no account required.
          </p>
          {denShareToken === undefined ? (
            <div className="w-5 h-5 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
          ) : denShareToken ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-[#242424] border border-white/10 rounded-xl px-4 py-2.5 overflow-hidden">
                <span className="text-[#f5f2eb] text-sm truncate flex-1 font-mono text-xs">{denShareUrl}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleCopyDenLink}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${denLinkCopied ? "bg-green-500 text-white" : "bg-[#c9a050] text-black hover:bg-[#b8903f]"}`}
                >
                  {denLinkCopied ? "✓ Copied" : "Copy Link"}
                </button>
                <button
                  onClick={() => setShowDenMsgSearch((v) => !v)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${showDenMsgSearch ? "bg-white/10 border-white/20 text-[#f5f2eb]" : "bg-[#242424] border-white/10 text-[#f5f2eb] hover:border-white/20"}`}
                >
                  Send via Message
                </button>
                <button
                  onClick={handleRevokeDenLink}
                  disabled={denShareLoading}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                >
                  {denShareLoading ? "Stopping…" : "Stop Sharing"}
                </button>
              </div>

              {showDenMsgSearch && (
                <div className="bg-[#242424] border border-white/10 rounded-xl p-4 space-y-3">
                  {denMsgSent ? (
                    <p className="text-green-400 text-sm">✓ Link sent to {denMsgSent}!</p>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={denMsgQuery}
                        onChange={(e) => setDenMsgQuery(e.target.value)}
                        placeholder="Search by username…"
                        autoFocus
                        className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/40"
                      />
                      {denMsgSearching && <p className="text-gray-500 text-xs">Searching…</p>}
                      {denMsgResults.length > 0 && (
                        <div className="divide-y divide-white/5">
                          {denMsgResults.map((u) => (
                            <div key={u.id} className="flex items-center justify-between py-2">
                              <span className="text-[#f5f2eb] text-sm">{u.displayName}</span>
                              <button
                                onClick={() => handleSendDenViaMessage(u.id, u.displayName)}
                                disabled={!!denMsgSending}
                                className="text-[#c9a050] text-xs font-semibold hover:underline disabled:opacity-40"
                              >
                                {denMsgSending === u.id ? "Sending…" : "Send"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {denMsgQuery.length >= 2 && !denMsgSearching && denMsgResults.length === 0 && (
                        <p className="text-gray-600 text-xs">No users found.</p>
                      )}
                    </>
                  )}
                </div>
              )}

              <p className="text-gray-600 text-xs">Stopping sharing immediately invalidates this link.</p>
            </div>
          ) : (
            <button
              onClick={handleGenerateDenLink}
              disabled={denShareLoading}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#c9a050] text-black hover:bg-[#b8903f] transition-colors disabled:opacity-40"
            >
              {denShareLoading ? "Generating…" : "Share My Den"}
            </button>
          )}
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

        {/* Danger Zone */}
        <div className="bg-[#1e1e1e] rounded-2xl border border-red-500/20 p-6">
          <h2 className="text-red-400 font-semibold text-base mb-1">Danger Zone</h2>
          <p className="text-gray-500 text-xs mb-2">
            Permanently deletes selected data from the cloud. Your account is kept. This cannot be undone. If you delete Shave Logs, any reactions and comments other users have left on your posts will also be permanently deleted.
          </p>
          <p className="text-gray-600 text-xs mb-4">
            To re-upload your data from your phone afterward, open ShaveSplash on your phone and go to <strong className="text-gray-500">Settings → Reset Cloud &amp; Re-sync</strong>.
          </p>
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              Clear Data…
            </button>
          ) : (
            <div className="space-y-4">
              {/* Toggles */}
              <div className="space-y-2">
                <p className="text-gray-400 text-sm font-medium">What would you like to delete?</p>
                {[
                  { label: "Inventory (Den)", description: "All your gear", value: clearInventory, set: setClearInventory },
                  { label: "Shave Logs", description: "All your shave history, including reactions and comments from other users", value: clearLogs, set: setClearLogs },
                  { label: "Preferences", description: "Result options and score parameters", value: clearPreferences, set: setClearPreferences },
                ].map(({ label, description, value, set }) => (
                  <button
                    key={label}
                    onClick={() => set(!value)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                      value
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-[#242424] border-white/5 opacity-50"
                    }`}
                  >
                    <div>
                      <p className={`text-sm font-medium ${value ? "text-red-300" : "text-gray-400"}`}>{label}</p>
                      <p className="text-gray-600 text-xs">{description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${value ? "bg-red-500 border-red-500" : "border-gray-600"}`}>
                      {value && <span className="text-white text-xs">✓</span>}
                    </div>
                  </button>
                ))}
              </div>

              {/* Confirm input */}
              {!nothingSelected && (
                <>
                  <p className="text-gray-400 text-sm">
                    Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm.
                  </p>
                  <input
                    type="text"
                    value={clearConfirmText}
                    onChange={(e) => setClearConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full bg-[#242424] border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-red-500/40"
                  />
                </>
              )}
              {clearError && <p className="text-red-400 text-xs">{clearError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleClearData}
                  disabled={clearConfirmText !== "DELETE" || clearing || nothingSelected}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40"
                >
                  {clearing ? "Clearing…" : "Confirm Delete"}
                </button>
                <button
                  onClick={() => { setShowClearConfirm(false); setClearConfirmText(""); setClearError(""); setClearInventory(true); setClearLogs(true); setClearPreferences(true); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#242424] text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Delete Account */}
        <div className="bg-[#1e1e1e] rounded-2xl border border-red-500/20 p-6">
          <h2 className="text-red-400 font-semibold text-base mb-1">Delete Account</h2>
          <p className="text-gray-500 text-xs mb-4">
            Permanently deletes your account and all associated data — den items, shave logs, BST listings, messages, and profile. This cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              Delete Account…
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-300 text-sm font-medium mb-1">This will permanently delete:</p>
                <ul className="text-gray-400 text-xs space-y-0.5 list-disc list-inside">
                  <li>Your account and profile</li>
                  <li>All den items and shave logs</li>
                  <li>All BST listings and messages</li>
                  <li>All preferences and settings</li>
                </ul>
              </div>
              <p className="text-gray-400 text-sm">
                Type <span className="font-mono font-bold text-red-400">DELETE MY ACCOUNT</span> to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE MY ACCOUNT to confirm"
                className="w-full bg-[#242424] border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-red-500/40"
              />
              {deleteError && <p className="text-red-400 text-xs">{deleteError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE MY ACCOUNT" || deleting}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40"
                >
                  {deleting ? "Deleting…" : "Permanently Delete Account"}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); setDeleteError(""); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#242424] text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
