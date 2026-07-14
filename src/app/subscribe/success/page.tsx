import Link from "next/link";

export default function SubscribeSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-[#c9a050]/15 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">★</span>
        </div>
        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] mb-3">
          Welcome to Expert!
        </h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Your ShaveSplash Expert subscription is active. You now have unlimited listings, priority placement, and the Expert Seller badge.
        </p>
        <div className="space-y-3">
          <Link
            href="/bst"
            className="block w-full bg-[#c9a050] text-black font-bold py-3.5 rounded-xl hover:bg-[#b8903f] transition-colors text-sm"
          >
            Browse the Marketplace
          </Link>
          <Link
            href="/den"
            className="block w-full text-gray-500 text-sm py-2 hover:text-gray-300 transition-colors"
          >
            Go to your Den →
          </Link>
        </div>
      </div>
    </div>
  );
}
