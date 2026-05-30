const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.shavesplash.app";

async function authFetch(path: string, body: unknown) {
  const res = await fetch(`${BACKEND}/api/auth/${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { data: null, error: (data as { message?: string } | null)?.message ?? "Request failed" };
  }
  return { data, error: null };
}

export async function sendOTP(email: string) {
  return authFetch("email-otp/send-verification-otp", { email, type: "sign-in" });
}

export async function verifyOTP(email: string, otp: string) {
  return authFetch("sign-in/email-otp", { email, otp });
}

export async function getSession() {
  try {
    const res = await fetch(`${BACKEND}/api/auth/get-session`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.session ? data : null;
  } catch {
    return null;
  }
}

export async function signOut() {
  await fetch(`${BACKEND}/api/auth/sign-out`, {
    method: "POST",
    credentials: "include",
  });
}

export type Session = {
  user: { id: string; name: string; email: string };
  session: { id: string; expiresAt: string };
};
