"use client";

import { useSession } from "@/lib/session-context";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_EMAIL = "leemeyernyc@gmail.com";

const TABS = [
  { label: "Razors", href: "/admin/razors" },
  { label: "Soaps", href: "/admin/soaps" },
  { label: "Aftershaves", href: "/admin/aftershaves" },
  { label: "Blades", href: "/admin/blades" },
  { label: "Brushes", href: "/admin/brushes" },
  { label: "Users", href: "/admin/users" },
  { label: "Activity", href: "/admin/activity" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const pathname = usePathname();

  if (loading) return null;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Sign in required.</p>
      </div>
    );
  }

  if (session.user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Not authorized.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors mb-4 block">
          ← Home
        </Link>
        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] mb-6">
          Admin
        </h1>
        <div className="flex gap-1 mb-8 border-b border-white/10 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors -mb-px border-b-2 ${
                  active
                    ? "text-[#c9a050] border-[#c9a050]"
                    : "text-gray-500 border-transparent hover:text-gray-300"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        {children}
      </div>
    </div>
  );
}
