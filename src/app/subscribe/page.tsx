"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

const FEATURES = [
  { icon: "∞", label: "Unlimited listings", sub: "Free tier: 3 per month" },
  { icon: "📸", label: "Unlimited photos", sub: "Free tier: 3 per listing" },
  { icon: "⏳", label: "Listings stay until sold", sub: "Free tier: expire after 30 days" },
  { icon: "⬆️", label: "Priority placement", sub: "Your listings appear above free-tier listings" },
  { icon: "🔔", label: "Watchlist alerts", sub: "Get notified when items you want are listed" },
  { icon: "★", label: "Expert Seller badge", sub: "Builds trust with buyers in the community" },
];

export default function SubscribePage() {
  const { session, loading } = useSession();
  const [isExpert, setIsExpert] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) { setStatusLoading(false); return; }
    api.get<{ isExpert: boolean }>("/api/subscriptions/status")
      .then((d) => setIsExpert(d.isExpert))
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, [session]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>("/api/subscriptions/checkout");
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await api.post<{ url: string }>("/api/subscriptions/portal");
      if (url) window.location.href = url;
    } catch {
      setPortalLoading(false);
    }
  };

  const isLoading = loading || statusLoading;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-2xl mx-auto px-4 py-16 w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#c9a050]/10 border border-[#c9a050]/20 rounded-full px-4 py-1.5 text-[#c9a050] text-sm font-semibold mb-6">
            ★ ShaveSplash Expert
          </div>
          <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#f5f2eb] mb-3">
            Upgrade your marketplace presence
          </h1>
          <p className="text-gray-500 text-base">
            Everything you need to buy and sell without limits in the wetshaving community.
          </p>
        </div>

        {/* Price card */}
        <div className="bg-[#1e1e1e] border border-[#c9a050]/30 rounded-3xl p-8 mb-6">
          <div className="flex items-end gap-1 mb-1">
            <span className="font-[family-name:var(--font-fredericka)] text-5xl text-[#c9a050]">$2.99</span>
            <span className="text-gray-500 mb-2">/month</span>
          </div>
          <p className="text-gray-500 text-sm mb-8">Cancel anytime. No commitment.</p>

          <div className="space-y-4 mb-8">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <span className="text-lg w-7 flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-[#f5f2eb] text-sm font-semibold">{f.label}</p>
                  <p className="text-gray-600 text-xs">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="w-full h-14 bg-[#242424] rounded-xl animate-pulse" />
          ) : !session ? (
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-4">Sign in to subscribe</p>
              <Link
                href="/sign-in"
                className="block w-full bg-[#c9a050] text-black font-bold py-4 rounded-xl hover:bg-[#b8903f] transition-colors text-base text-center"
              >
                Sign In
              </Link>
            </div>
          ) : isExpert ? (
            <div className="space-y-3">
              <div className="w-full bg-green-500/10 border border-green-500/20 text-green-400 font-bold py-4 rounded-xl text-center">
                ✓ You&apos;re a ShaveSplash Expert
              </div>
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="w-full text-gray-500 text-sm py-2 hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                {portalLoading ? "Opening…" : "Manage subscription →"}
              </button>
            </div>
          ) : (
            <div>
              {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full bg-[#c9a050] text-black font-bold py-4 rounded-xl hover:bg-[#b8903f] transition-colors disabled:opacity-50 text-base"
              >
                {checkoutLoading ? "Redirecting to checkout…" : "Subscribe — $2.99/month"}
              </button>
            </div>
          )}
        </div>

        {/* Free tier comparison */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
          <h3 className="text-gray-400 text-sm font-semibold mb-4 uppercase tracking-wider">Free tier includes</h3>
          <div className="space-y-2 text-sm text-gray-500">
            <p>• 3 listings per month</p>
            <p>• 3 photos per listing</p>
            <p>• Listings active for 30 days</p>
            <p>• Standard placement</p>
            <p>• $0.99 per bump (move listing to top)</p>
          </div>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          Subscriptions are also available in the ShaveSplash iOS app via in-app purchase.
        </p>
      </div>
    </div>
  );
}
