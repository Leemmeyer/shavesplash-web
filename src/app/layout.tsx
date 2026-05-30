import type { Metadata } from "next";
import { Fredericka_the_Great } from "next/font/google";
import { SessionProvider } from "@/lib/session-context";
import "./globals.css";

const fredericka = Fredericka_the_Great({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-fredericka",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShaveSplash — The Wetshaving Community",
  description: "Log your shaves, track your den, and buy/sell/trade gear with the wetshaving community.",
  openGraph: {
    title: "ShaveSplash",
    description: "The wetshaving app. Log shaves, manage your den, and trade gear.",
    url: "https://shavesplash.app",
    siteName: "ShaveSplash",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fredericka.variable}>
      <body className="min-h-screen bg-[#1a1a1a] text-[#f5f2eb] antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
