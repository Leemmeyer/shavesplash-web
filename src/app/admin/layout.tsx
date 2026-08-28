"use client";

import { useSession } from "@/lib/session-context";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_EMAIL = "leemeyernyc@gmail.com";

type PendingCounts = {
  razors: number; soaps: number; aftershaves: number;
  blades: number; brushes: number; database: number;
};

const TABS: { label: string; href: string; countKey?: keyof PendingCounts }[] = [
  { label: "Razors",      href: "/admin/razors",      countKey: "razors" },
  { label: "Soaps",       href: "/admin/soaps",        countKey: "soaps" },
  { label: "Aftershaves", href: "/admin/aftershaves",  countKey: "aftershaves" },
  { label: "Blades",      href: "/admin/blades",       countKey: "blades" },
  { label: "Brushes",     href: "/admin/brushes",      countKey: "brushes" },
  { label: "Database",    href: "/admin/database",     countKey: "database" },
  { label: "Users",       href: "/admin/users" },
  { label: "Activity",    href: "/admin/activity" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const pathname = usePathname();
  const [counts, setCounts] = useState<PendingCounts | null>(null);

  useEffect(() => {
    if (!session || session.user.email !== ADMIN_EMAIL) return;
    api.get<PendingCounts>("/api/admin/pending-counts")
      .then(setCounts)
      .catch(() => {});
  }, [session]);

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
            const pending = tab.countKey ? (counts?.[tab.countKey] ?? 0) : 0;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors -mb-px border-b-2 ${
                  active
                    ? "text-[#c9a050] border-[#c9a050]"
                    : "text-gray-500 border-transparent hover:text-gray-300"
                }`}
              >
                {tab.label}
                {pending > 0 && (
                  <span className="min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                    {pending > 99 ? "99+" : pending}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        {children}
      </div>
    </div>
  );
}
