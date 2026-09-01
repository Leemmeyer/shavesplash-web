import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forum",
  description: "Discuss razors, soaps, brushes, technique, and everything wet shaving with the ShaveSplash community.",
  openGraph: {
    title: "ShaveSplash Forum",
    description: "Discuss razors, soaps, brushes, technique, and everything wet shaving.",
    url: "https://shavesplash.app/forum",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function ForumLayout({ children }: { children: React.ReactNode }) {
  return children;
}
