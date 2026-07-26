import type { Metadata } from "next";
import { Fredericka_the_Great } from "next/font/google";
import { SessionProvider } from "@/lib/session-context";
import AppNav from "@/components/AppNav";
import "./globals.css";

const fredericka = Fredericka_the_Great({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-fredericka",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShaveSplash Community — The Wetshaving Community",
  description: "Log your shaves, track your den, and connect with the wetshaving community.",
  openGraph: {
    title: "ShaveSplash Community",
    description: "The wetshaving community. Log shaves, manage your den, and trade gear.",
    url: "https://shavesplash.app",
    siteName: "ShaveSplash Community",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fredericka.variable}>
      <body className="bg-[#1a1a1a] text-[#f5f2eb] antialiased flex flex-col min-h-screen">
        <SessionProvider>
          <AppNav />
          <div className="flex-1">
            {children}
          </div>
          <footer className="border-t border-white/5 px-6 py-4 flex flex-wrap items-center gap-y-3 justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/rabbit-logo.jpeg"
                alt="ShaveSplash"
                style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(201,160,80,0.4)", opacity: 0.85 }}
              />
              <span className="font-[family-name:var(--font-fredericka)] text-xl text-[#c9a050]">ShaveSplash</span>
            </div>
            <div className="flex gap-5">
              <a href="https://shavesplash.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">ShaveSplash.com</a>
              <a href="/about" className="hover:text-gray-400 transition-colors">About</a>
              <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</a>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
