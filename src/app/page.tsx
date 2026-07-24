import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-6 text-center">

        {/* BST badge */}
        <div className="inline-flex items-center gap-2 bg-[#c9a050]/10 border border-[#c9a050]/30 rounded-full px-4 py-1.5 text-xs text-[#c9a050] mb-5 font-semibold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c9a050] animate-pulse" />
          Marketplace now live · Free to list
        </div>

        {/* Primary headline */}
        <h1 className="font-[family-name:var(--font-fredericka)] text-2xl md:text-3xl text-[#f5f2eb] mb-2 leading-tight max-w-2xl">
          Home of the ShaveSplash{" "}
          <span className="text-[#c9a050]">Buy · Sell · Trade</span> Marketplace
        </h1>

        {/* Tagline */}
        <p className="text-[#c9a050] text-base md:text-lg font-semibold mt-1 mb-1">
          Move Your Shave to the Cloud
        </p>

        {/* Sub-copy */}
        <p className="text-gray-500 text-sm max-w-md mb-6 leading-relaxed">
          Web companion to{" "}
          <span className="text-gray-400 font-medium">ShaveSplash: The Rabbit Hole</span>
          {" "}— the iOS and Android app for Wetshaving.
        </p>

        {/* Everything in one place */}
        <h2 className="font-[family-name:var(--font-fredericka)] text-lg text-[#c9a050] mb-3">
          Everything in one place
        </h2>

        {/* Feature cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl mb-6">
          <Feature icon="🏠" title="My Den" description="Catalog your collection" href="/den" />
          <Feature icon="📊" title="Analytics" description="Visualize your shave history" href="/logs" />
          <Feature icon="💬" title="Forum" description="Community discussions" href="/forum" />
          <Feature icon="🛒" title="Marketplace" description="Buy, sell, and trade gear" href="/bst" />
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Link
            href="/bst"
            className="flex items-center gap-2 bg-[#c9a050] text-black font-bold px-6 py-3 rounded-2xl hover:bg-[#b8903f] transition-colors text-sm"
          >
            Browse Marketplace
          </Link>
          <Link
            href="https://apps.apple.com/app/shavesplash"
            target="_blank"
            className="flex items-center gap-2 border border-[#c9a050]/30 text-[#c9a050] px-6 py-3 rounded-2xl hover:bg-[#c9a050]/10 transition-colors text-sm"
          >
            <AppleIcon />
            iOS App
          </Link>
          <Link
            href="https://play.google.com/store/apps/details?id=com.shavesplash"
            target="_blank"
            className="flex items-center gap-2 border border-[#c9a050]/30 text-[#c9a050] px-6 py-3 rounded-2xl hover:bg-[#c9a050]/10 transition-colors text-sm"
          >
            <AndroidIcon />
            Android App
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
        <span className="font-[family-name:var(--font-fredericka)] text-[#c9a050]/60">ShaveSplash</span>
        <div className="flex gap-6">
          <Link href="https://shavesplash.com" target="_blank" className="hover:text-gray-400 transition-colors">shavesplash.com</Link>
          <Link href="/forum" className="hover:text-gray-400 transition-colors">Forum</Link>
          <Link href="/bst" className="hover:text-gray-400 transition-colors">Marketplace</Link>
          <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, description, href }: { icon: string; title: string; description: string; href: string }) {
  return (
    <Link href={href} className="group block">
      <div className="bg-[#242424] rounded-xl p-4 border border-white/5 hover:border-[#c9a050]/30 transition-colors h-full text-left">
        <div className="text-2xl mb-2">{icon}</div>
        <h3 className="text-[#f5f2eb] font-semibold text-sm mb-1 group-hover:text-[#c9a050] transition-colors">{title}</h3>
        <p className="text-gray-500 text-xs leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.523 15.341a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-9.046 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM3.607 8.26l-1.44-2.5a.5.5 0 0 1 .866-.5l1.458 2.527A11.98 11.98 0 0 1 12 6.5c1.99 0 3.865.484 5.509 1.337l1.458-2.527a.5.5 0 0 1 .866.5l-1.44 2.5A11.96 11.96 0 0 1 24 17.5H0a11.96 11.96 0 0 1 3.607-9.24z" />
    </svg>
  );
}
