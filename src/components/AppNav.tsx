"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "@/lib/auth";
import { useSession } from "@/lib/session-context";

const NAV_LINKS: { href: string; label: string; gold?: boolean }[] = [
  { href: "/den", label: "My Den" },
  { href: "/logs", label: "History" },
  { href: "/analytics", label: "Analytics" },
  { href: "/bst", label: "Marketplace" },
  { href: "/messages", label: "Messages" },
  { href: "/forum", label: "Forum" },
  { href: "/sotd", label: "SOTD" },
  { href: "/preferences", label: "Preferences" },
  { href: "/subscribe", label: "★ Upgrade", gold: true },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, refresh } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    refresh();
    router.push("/");
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3 gap-4">
          {/* Brand */}
          <Link
            href="/"
            className="font-[family-name:var(--font-fredericka)] text-xl text-[#c9a050] shrink-0 whitespace-nowrap"
          >
            ShaveSplash Community
          </Link>

          {/* Desktop nav links — hidden on mobile */}
          {session && (
            <div className="hidden md:flex items-center gap-0.5 min-w-0 overflow-x-auto scrollbar-hide">
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

          {/* Right side */}
          <div className="flex items-center gap-3 shrink-0">
            {!loading && (
              session ? (
                <>
                  <span className="text-gray-600 text-xs hidden lg:block truncate max-w-[160px]">
                    {session.user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap hidden md:block"
                  >
                    Sign out
                  </button>
                  {/* Hamburger — mobile only */}
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    className="md:hidden flex flex-col gap-1.5 p-2 -mr-2"
                    aria-label="Menu"
                  >
                    <span className={`block w-5 h-0.5 bg-[#c9a050] transition-transform origin-center ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
                    <span className={`block w-5 h-0.5 bg-[#c9a050] transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
                    <span className={`block w-5 h-0.5 bg-[#c9a050] transition-transform origin-center ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
                  </button>
                </>
              ) : (
                <Link
                  href="/sign-in"
                  className="text-sm bg-[#c9a050] text-black font-semibold px-4 py-1.5 rounded-lg hover:bg-[#b8903f] transition-colors whitespace-nowrap"
                >
                  Sign In / Join Free
                </Link>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {session && menuOpen && (
        <div className="md:hidden fixed top-[53px] inset-x-0 z-40 bg-[#1a1a1a] border-b border-white/10 shadow-xl">
          <div className="px-4 py-3 flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? "text-[#c9a050] bg-[#c9a050]/10"
                    : link.gold
                    ? "text-[#c9a050]/70"
                    : "text-gray-400"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-white/5 my-2" />
            <div className="px-4 py-2 text-xs text-gray-600">{session.user.email}</div>
            <button
              onClick={handleSignOut}
              className="text-left px-4 py-3 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
