"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { sendOTP } from "@/lib/auth";
import { useSession } from "@/lib/session-context";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "";
  const isSuspended = searchParams.get("suspended") === "1";
  const { session, loading: sessionLoading } = useSession();

  useEffect(() => {
    if (!sessionLoading && session) router.replace(redirect || "/den");
  }, [session, sessionLoading, router, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address"); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await sendOTP(email.trim().toLowerCase());
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      const otpUrl = `/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`;
      router.push(otpUrl);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] mb-2 text-center">
          Continue with Email
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          Enter your email to sign in or create a free account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/50 text-base"
            />
          </div>

          {isSuspended && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
              Your account has been suspended. Please contact{" "}
              <a href="mailto:teutonblade@shavesplash.com" className="underline hover:text-red-300">teutonblade@shavesplash.com</a>
              {" "}for more information.
            </div>
          )}
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#c9a050] text-black font-bold py-3.5 rounded-xl hover:bg-[#b8903f] transition-colors disabled:opacity-60 text-base"
          >
            {loading ? "Sending..." : "Send Verification Code"}
          </button>
        </form>

        <p className="text-gray-600 text-xs text-center mt-6">
          We&apos;ll send a 6-digit code to your email. No password needed.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="font-[family-name:var(--font-fredericka)] text-2xl text-[#c9a050]">
          ShaveSplash
        </Link>
      </nav>
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
