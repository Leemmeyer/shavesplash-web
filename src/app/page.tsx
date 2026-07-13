import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 min-h-[calc(100vh-57px)]">
        <div className="inline-flex items-center gap-2 bg-[#c9a050]/10 border border-[#c9a050]/20 rounded-full px-4 py-1.5 text-sm text-[#c9a050] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c9a050] animate-pulse" />
          Cloud sync · Forum · Marketplace
        </div>

        <h1 className="font-[family-name:var(--font-fredericka)] text-5xl md:text-7xl text-[#c9a050] mb-6 leading-tight">
          The Wetshaving<br />Community
        </h1>

        <p className="text-gray-400 text-lg md:text-xl max-w-xl mb-12 leading-relaxed">
          Log every shave, manage your den, discuss with fellow shavers,
          and trade gear — all in one place.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="https://apps.apple.com/app/shavesplash"
            target="_blank"
            className="flex items-center gap-3 bg-[#c9a050] text-black font-bold px-8 py-4 rounded-2xl hover:bg-[#b8903f] transition-colors text-base"
          >
            <AppleIcon />
            Download on iOS
          </Link>
          <Link
            href="/forum"
            className="flex items-center gap-3 border border-[#c9a050]/30 text-[#c9a050] px-8 py-4 rounded-2xl hover:bg-[#c9a050]/10 transition-colors text-base"
          >
            Join the Discussion
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/5 px-6 py-20 bg-[#1e1e1e]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <Feature icon="📔" title="Shave History" description="Log every shave with razor, blade, soap, aftershave, scores, and notes." />
          <Feature icon="🪒" title="Your Den" description="Catalog your entire collection. Track performance stats and usage history per item." />
          <Feature icon="☁️" title="Cloud Sync" description="Your data syncs automatically across devices via ShaveSplash Cloud." />
          <Feature icon="💬" title="Forum" description="Discuss technique, share finds, and get advice from the wetshaving community." />
          <Feature icon="🛒" title="Buy · Sell · Trade" description="A dedicated marketplace for the wetshaving community. List gear from your den in seconds." />
          <Feature icon="🤖" title="AI Coach" description="Get personalized recommendations based on your shave history." />
        </div>
      </section>

      {/* Forum CTA */}
      <section className="border-t border-white/5 px-6 py-16 text-center">
        <h2 className="font-[family-name:var(--font-fredericka)] text-3xl md:text-4xl text-[#c9a050] mb-4">
          Join the conversation
        </h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Share your latest shave, ask for advice, or review a new soap — the ShaveSplash community is here.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/forum"
            className="inline-block bg-[#c9a050] text-black font-bold px-8 py-4 rounded-2xl hover:bg-[#b8903f] transition-colors"
          >
            Browse Forum
          </Link>
          <Link
            href="/bst"
            className="inline-block border border-[#c9a050]/30 text-[#c9a050] px-8 py-4 rounded-2xl hover:bg-[#c9a050]/10 transition-colors"
          >
            Browse Marketplace
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
        <span className="font-[family-name:var(--font-fredericka)] text-[#c9a050]/60">ShaveSplash Cloud</span>
        <div className="flex gap-6">
          <Link href="https://shavesplash.com" target="_blank" className="hover:text-gray-400 transition-colors">shavesplash.com</Link>
          <Link href="/forum" className="hover:text-gray-400 transition-colors">Forum</Link>
          <Link href="/bst" className="hover:text-gray-400 transition-colors">Marketplace</Link>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-[#242424] rounded-2xl p-6 border border-white/5">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-[#f5f2eb] font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}
