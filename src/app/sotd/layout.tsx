import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shave of the Day",
  description: "See what the wet shaving community is using today. Daily shave logs with gear breakdowns, scores, and photos.",
  openGraph: {
    title: "Shave of the Day — ShaveSplash",
    description: "Daily shave logs from the wetshaving community. Gear breakdowns, scores, and photos.",
    url: "https://shavesplash.app/sotd",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function SotdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
