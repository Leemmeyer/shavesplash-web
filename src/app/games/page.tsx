"use client";

import Link from "next/link";
import Image from "next/image";
import AuthGuard from "@/components/AuthGuard";

const GAMES = [
  {
    href: "/games/den-master",
    title: "Den Master",
    description: "Build the optimal shave setup from the Gear Database. Scored against real shave results — winner announced every night at 8:45pm ET.",
    icon: "/den-master-hero.png",
    cta: "Play Den Master",
    accent: "#c9a050",
  },
  {
    href: "/games/shave-iq",
    title: "Shave IQ",
    description: "A blurred SOTD photo, four choices per gear slot. Guess every item in today's shave before the winner is revealed at 8:45pm ET.",
    icon: null,
    emoji: "🔍",
    cta: "Play Shave IQ",
    accent: "#50a0c9",
  },
];

function GameCard({
  href, title, description, icon, emoji, cta, accent,
}: {
  href: string; title: string; description: string;
  icon: string | null; emoji?: string; cta: string; accent: string;
}) {
  return (
    <Link href={href} className="group block bg-[#1e1e1e] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:scale-[1.01]">
      {/* Hero area */}
      <div className="relative h-40 bg-[#161616] flex items-center justify-center">
        {icon ? (
          <Image src={icon} alt={title} fill className="object-contain p-6 opacity-90 group-hover:opacity-100 transition-opacity" />
        ) : (
          <span className="text-6xl">{emoji}</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] to-transparent opacity-60" />
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        <h2
          className="font-[family-name:var(--font-fredericka)] text-2xl mb-2"
          style={{ color: accent }}
        >
          {title}
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-5">{description}</p>
        <span
          className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold text-black transition-opacity group-hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          {cta} →
        </span>
      </div>
    </Link>
  );
}

export default function GamesHubPage() {
  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#f5f2eb] mb-3">Games</h1>
          <p className="text-gray-500 text-sm">Daily competitions for the wet shaving community. Winners announced nightly at 8:45pm ET in the Evening Edge.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {GAMES.map((g) => (
            <GameCard key={g.href} {...g} />
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
