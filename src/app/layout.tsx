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
  title: "ShaveSplash Cloud — The Wetshaving Community",
  description: "Log your shaves, track your den, and connect with the wetshaving community.",
  openGraph: {
    title: "ShaveSplash Cloud",
    description: "The wetshaving community. Log shaves, manage your den, and trade gear.",
    url: "https://shavesplash.app",
    siteName: "ShaveSplash Cloud",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fredericka.variable}>
      <body className="min-h-screen bg-[#1a1a1a] text-[#f5f2eb] antialiased">
        <SessionProvider>
          <AppNav />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
