"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { useSession } from "@/lib/session-context";

const NAV_LINKS = [
  { href: "/den", label: "Den" },
  { href: "/logs", label: "History" },
  { href: "/bst", label: "Marketplace" },
  { href: "/preferences", label: "Preferences" },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, refresh } = useSession();

  const handleSignOut = async () => {
    await signOut();
    refresh();
    router.push("/");
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-[#1a1a1a]/95 backdrop-blur-sm z-10">
      <Link href="/" className="font-[family-name:var(--font-fredericka)] text-xl text-[#c9a050]">
        ShaveSplash
      </Link>

      <div className="flex items-center gap-1">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith(link.href)
                ? "text-[#c9a050] bg-[#c9a050]/10"
                : "text-gray-400 hover:text-[#f5f2eb]"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {session && (
          <span className="text-gray-600 text-xs hidden sm:block">
            {session.user.email}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
