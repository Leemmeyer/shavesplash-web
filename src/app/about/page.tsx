import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">

      {/* Header */}
      <div className="mb-10">
        <h1 className="font-[family-name:var(--font-fredericka)] text-4xl text-[#c9a050] mb-3">
          About ShaveSplash Community
        </h1>
        <p className="text-gray-400 text-base leading-relaxed">
          ShaveSplash Community is the companion website to{" "}
          <span className="text-[#f5f2eb] font-medium">ShaveSplash: The Rabbit Hole</span>
          {" "}— available on{" "}
          <Link href="https://apps.apple.com/app/shavesplash" target="_blank" className="text-[#c9a050] hover:underline">iOS</Link>
          {" "}and{" "}
          <Link href="https://play.google.com/store/apps/details?id=com.shavesplash" target="_blank" className="text-[#c9a050] hover:underline">Android</Link>
          . Together they form a complete resource for the wetshaving community — whether you're tracking your morning shave, building out your den, or hunting down your next razor.
        </p>
      </div>

      {/* Artwork */}
      <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/barbershop-shaves.png"
          alt="Victorian barbershop"
          style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 420 }}
        />
      </div>

      {/* Features */}
      <div className="mb-12">
        <h2 className="font-[family-name:var(--font-fredericka)] text-2xl text-[#c9a050] mb-6">What's inside</h2>
        <div className="space-y-4">
          <Feature
            title="My Den"
            description="Catalog your entire shaving collection — razors, blades, brushes, soaps, aftershaves, and more. Add photos, track usage, and keep everything organized in one place."
          />
          <Feature
            title="Shave Log & Analytics"
            description="Log every shave with scores, results, and notes. Over time, Analytics surfaces patterns in your data — which soaps work best, which razors give the closest shave, and how your technique is evolving."
          />
          <Feature
            title="Buy · Sell · Trade Marketplace"
            description="A dedicated BST marketplace for the wetshaving community. List gear you no longer use, discover pieces from other shavers, and trade with confidence. Free to list."
          />
          <Feature
            title="Forum"
            description="A home for wetshaving discussion. Talk technique, share recommendations, post reviews, and connect with shavers at every level — from first-timers to seasoned veterans."
          />
          <Feature
            title="Shave of the Day (SOTD)"
            description="Share your daily shave with the community. See what others are reaching for and get inspired for tomorrow's setup."
          />
          <Feature
            title="Messages"
            description="Private messaging for marketplace conversations. Keep your contact details private while negotiating deals and arranging trades."
          />
        </div>
      </div>

      {/* Creator */}
      <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 p-8 mb-10">
        <h2 className="font-[family-name:var(--font-fredericka)] text-2xl text-[#c9a050] mb-4">Created By</h2>
        <p className="text-gray-400 text-base leading-relaxed mb-4">
          ShaveSplash was created by{" "}
          <span className="text-[#f5f2eb] font-semibold">Teutonblade</span>
          , a passionate member of the wetshaving community who wanted to build something genuinely useful for fellow shavers.
        </p>
        <p className="text-gray-400 text-base leading-relaxed">
          Wetshaving is more than a grooming routine — it's a craft with a rich history, a passionate community, and an almost endless rabbit hole of gear to explore. ShaveSplash exists to make that journey easier to track, share, and enjoy.
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/bst"
          className="flex items-center justify-center gap-2 bg-[#c9a050] text-black font-bold px-6 py-3 rounded-2xl hover:bg-[#b8903f] transition-colors text-sm"
        >
          Browse Marketplace
        </Link>
        <Link
          href="/forum"
          className="flex items-center justify-center gap-2 border border-[#c9a050]/30 text-[#c9a050] px-6 py-3 rounded-2xl hover:bg-[#c9a050]/10 transition-colors text-sm"
        >
          Join the Forum
        </Link>
      </div>

    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-[#1e1e1e] rounded-xl border border-white/5 p-5">
      <h3 className="text-[#f5f2eb] font-semibold text-base mb-1.5">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
