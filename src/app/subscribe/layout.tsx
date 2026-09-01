import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Expert Subscription",
  description: "Upgrade to ShaveSplash Expert — unlock watchlist alerts, expert badge, and more premium features for serious wet shavers.",
  openGraph: {
    title: "ShaveSplash Expert Subscription",
    description: "Unlock watchlist alerts, expert badge, and more premium features.",
    url: "https://shavesplash.app/subscribe",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
