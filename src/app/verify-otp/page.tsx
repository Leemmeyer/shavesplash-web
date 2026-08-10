"use client";

import { useState, useRef, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyOTP } from "@/lib/auth";
import { useSession } from "@/lib/session-context";
import { api } from "@/lib/api";

const NUM_DIGITS = 6;

function VerifyOTPForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const autoOtp = searchParams.get("otp") ?? "";
  const isAuto = searchParams.get("auto") === "1";
  const redirect = searchParams.get("redirect") ?? "";
  const [digits, setDigits] = useState<string[]>(Array(NUM_DIGITS).fill(""));
  const [loading, setLoading] = useState(isAuto);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(NUM_DIGITS).fill(null));
  const router = useRouter();
  const { refresh } = useSession();

  // Magic link: auto-verify on mount if otp + auto params are present
  useEffect(() => {
    if (isAuto && autoOtp && email) {
      handleVerify(autoOtp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (value: string, index: number) => {
    // Handle paste
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, "").slice(0, NUM_DIGITS);
      const newDigits = Array(NUM_DIGITS).fill("");
      cleaned.split("").forEach((c, i) => { newDigits[i] = c; });
      setDigits(newDigits);
      const nextFocus = Math.min(cleaned.length, NUM_DIGITS - 1);
      inputRefs.current[nextFocus]?.focus();
      if (cleaned.length === NUM_DIGITS) handleVerify(cleaned);
      return;
    }
    const char = value.replace(/\D/g, "");
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    if (char && index < NUM_DIGITS - 1) inputRefs.current[index + 1]?.focus();
    if (newDigits.every((d) => d !== "")) handleVerify(newDigits.join(""));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace") {
      const newDigits = [...digits];
      if (newDigits[index]) {
        newDigits[index] = "";
        setDigits(newDigits);
      } else if (index > 0) {
        newDigits[index - 1] = "";
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = async (otp: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const { error: err } = await verifyOTP(email, otp);
    if (err) {
      setError(err);
      setDigits(Array(NUM_DIGITS).fill(""));
      inputRefs.current[0]?.focus();
      setLoading(false);
    } else {
      refresh();
      // Check if user has a display name; if not, send them to set one first
      try {
        const { profile } = await api.get<{ profile: { displayName?: string | null } }>("/api/bst/profile");
        if (!profile.displayName) {
          const dest = redirect || "/den";
          router.replace(`/set-display-name?redirect=${encodeURIComponent(dest)}`);
          return;
        }
      } catch { /* proceed normally if check fails */ }
      router.replace(redirect || "/den");
    }
  };

  const code = digits.join("");

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] mb-2 text-center">
          {isAuto && loading ? "Signing you in…" : "Check Your Email"}
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          {isAuto && loading
            ? "Please wait a moment."
            : <>We sent a sign-in link and 6-digit code to <span className="text-[#f5f2eb]">{email}</span></>}
        </p>

        {isAuto && loading ? (
          <div className="flex justify-center mb-6">
            <div className="w-8 h-8 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
          </div>
        ) : null}

        <div className={`flex gap-2 justify-center mb-6 ${isAuto && loading ? "hidden" : ""}`}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={NUM_DIGITS}
              value={digit}
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className="w-11 h-14 text-center text-xl font-bold bg-[#242424] border-2 border-white/10 rounded-xl text-[#f5f2eb] focus:outline-none focus:border-[#c9a050] transition-colors"
            />
          ))}
        </div>

        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

        <button
          onClick={() => handleVerify(code)}
          disabled={loading || code.length < NUM_DIGITS}
          className="w-full bg-[#c9a050] text-black font-bold py-3.5 rounded-xl hover:bg-[#b8903f] transition-colors disabled:opacity-50 text-base"
        >
          {loading ? "Verifying..." : "Verify Code"}
        </button>

        <button
          onClick={() => router.back()}
          className="w-full text-gray-500 text-sm mt-4 hover:text-gray-400 transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="font-[family-name:var(--font-fredericka)] text-2xl text-[#c9a050]">
          ShaveSplash
        </Link>
      </nav>
      <Suspense>
        <VerifyOTPForm />
      </Suspense>
    </div>
  );
}
