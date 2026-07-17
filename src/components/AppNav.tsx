"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { useSession } from "@/lib/session-context";

const NAV_LINKS: { href: string; label: string; gold?: boolean }[] = [
  { href: "/den", label: "My Den" },
  { href: "/logs", label: "History" },
  { href: "/analytics", label: "Analytics" },
  { href: "/bst", label: "Marketplace" },
  { href: "/messages", label: "Messages" },
  { href: "/forum", label: "Forum" },
  { href: "/preferences", label: "Preferences" },
  { href: "/subscribe", label: "★ Upgrade", gold: true },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, refresh } = useSession();

  const handleSignOut = async () => {
    await signOut();
    refresh();
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-sm border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3 gap-4">
        {/* Brand */}
        <Link
          href="/"
          className="font-[family-name:var(--font-fredericka)] text-xl text-[#c9a050] shrink-0 whitespace-nowrap"
        >
          ShaveSplash Community
        </Link>

        {/* Nav links — only show when signed in */}
        {session && (
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  pathname.startsWith(link.href)
                    ? "text-[#c9a050] bg-[#c9a050]/10"
                    : link.gold
                    ? "text-[#c9a050]/70 hover:text-[#c9a050]"
                    : "text-gray-400 hover:text-[#f5f2eb]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* Auth area */}
        <div className="flex items-center gap-3 shrink-0">
          {!loading && (
            session ? (
              <>
                <span className="text-gray-600 text-xs hidden md:block truncate max-w-[160px]">
                  {session.user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/sign-in"
                className="text-sm bg-[#c9a050] text-black font-semibold px-4 py-1.5 rounded-lg hover:bg-[#b8903f] transition-colors whitespace-nowrap"
              >
                Sign in
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
