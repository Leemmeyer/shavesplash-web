import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-20 min-h-[calc(100vh-57px)]">
        {/* BST badge */}
        <div className="inline-flex items-center gap-2 bg-[#c9a050]/10 border border-[#c9a050]/30 rounded-full px-5 py-2 text-sm text-[#c9a050] mb-10 font-semibold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c9a050] animate-pulse" />
          Marketplace now live · Free to list
        </div>

        {/* Primary headline */}
        <h1 className="font-[family-name:var(--font-fredericka)] text-4xl md:text-6xl text-[#f5f2eb] mb-4 leading-tight max-w-3xl">
          Home of the ShaveSplash<br />
          <span className="text-[#c9a050]">Buy · Sell · Trade</span> Marketplace
        </h1>

        {/* Tagline */}
        <p className="text-[#c9a050] text-xl md:text-2xl font-semibold mt-4 mb-3">
          Move Your Shave to the Cloud
        </p>

        {/* Sub-copy */}
        <p className="text-gray-500 text-base md:text-lg max-w-lg mb-10 leading-relaxed">
          Web companion to{" "}
          <span className="text-gray-400 font-medium">ShaveSplash: The Rabbit Hole</span>
          {" "}— the iOS app for wetshaving obsessives.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/bst"
            className="flex items-center gap-3 bg-[#c9a050] text-black font-bold px-8 py-4 rounded-2xl hover:bg-[#b8903f] transition-colors text-base"
          >
            Browse Marketplace
          </Link>
          <Link
            href="https://apps.apple.com/app/shavesplash"
            target="_blank"
            className="flex items-center gap-3 border border-[#c9a050]/30 text-[#c9a050] px-8 py-4 rounded-2xl hover:bg-[#c9a050]/10 transition-colors text-base"
          >
            <AppleIcon />
            Download iOS App
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/5 px-6 py-20 bg-[#1e1e1e]">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] text-center mb-12">
            Everything in one place
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Feature
              icon="🏠"
              title="My Den"
              description="Catalog your entire collection. Track every razor, brush, soap, and blade with performance stats and usage history."
              href="/den"
            />
            <Feature
              icon="📊"
              title="Analytics"
              description="Visualize your shave history. See your most-used gear, top performers, and trends over time."
              href="/logs"
            />
            <Feature
              icon="💬"
              title="Forum"
              description="Discuss technique, share finds, and get advice from the wetshaving community."
              href="/forum"
            />
            <Feature
              icon="🛒"
              title="Marketplace"
              description="Buy, sell, and trade gear with fellow shavers. List items from your den in seconds."
              href="/bst"
            />
          </div>
        </div>
      </section>

      {/* Marketplace CTA */}
      <section className="border-t border-white/5 px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-[#c9a050] text-sm font-bold tracking-widest uppercase mb-4">Buy · Sell · Trade</p>
          <h2 className="font-[family-name:var(--font-fredericka)] text-3xl md:text-4xl text-[#f5f2eb] mb-4">
            The wetshaving community marketplace
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            List gear for free. Expert subscribers get priority placement, 30-day listings, and watchlist alerts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/bst"
              className="inline-block bg-[#c9a050] text-black font-bold px-8 py-4 rounded-2xl hover:bg-[#b8903f] transition-colors"
            >
              Browse Listings
            </Link>
            <Link
              href="/forum"
              className="inline-block border border-[#c9a050]/30 text-[#c9a050] px-8 py-4 rounded-2xl hover:bg-[#c9a050]/10 transition-colors"
            >
              Join the Forum
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
        <span className="font-[family-name:var(--font-fredericka)] text-[#c9a050]/60">ShaveSplash</span>
        <div className="flex gap-6">
          <Link href="https://shavesplash.com" target="_blank" className="hover:text-gray-400 transition-colors">shavesplash.com</Link>
          <Link href="/forum" className="hover:text-gray-400 transition-colors">Forum</Link>
          <Link href="/bst" className="hover:text-gray-400 transition-colors">Marketplace</Link>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, description, href }: { icon: string; title: string; description: string; href: string }) {
  return (
    <Link href={href} className="group block">
      <div className="bg-[#242424] rounded-2xl p-6 border border-white/5 hover:border-[#c9a050]/30 transition-colors h-full">
        <div className="text-3xl mb-4">{icon}</div>
        <h3 className="text-[#f5f2eb] font-semibold text-lg mb-2 group-hover:text-[#c9a050] transition-colors">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}
