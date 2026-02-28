import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "../components/Toast";
import { AudioPlayerProvider } from "../components/AudioPlayerProvider";
import { AuthProvider } from "../components/AuthProvider";
import MobileBottomNav from "../components/MobileBottomNav";
import { createClient } from "../lib/supabase-server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Metalist — Metal Music Discovery",
  description: "Discover metal bands, releases, shows, and musicians. The home for metalheads.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const initialUser = user?.id ?? null;

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider initialUser={initialUser}>
          <ToastProvider>
            <AudioPlayerProvider>
              {/* Extra bottom padding for mobile nav + global audio player (player ~80px tall) */}
              <div className="pb-28 md:pb-24 flex flex-col min-h-screen">
                {children}
                <footer className="mt-auto border-t border-zinc-900/70 px-4 md:px-8 py-6 text-[11px] text-zinc-500 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <p className="tracking-widest uppercase">
                    © {new Date().getFullYear()} The Metalist · Built for metalheads
                  </p>
                  <div className="flex flex-wrap gap-4 items-center">
                    <Link
                      href="/about"
                      className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-100 text-[11px] font-semibold uppercase tracking-[0.18em] hover:border-red-500 hover:text-red-400 transition-colors"
                    >
                      About Us
                    </Link>
                    <Link
                      href="/privacy"
                      className="uppercase tracking-[0.2em] hover:text-red-400"
                    >
                      Privacy
                    </Link>
                    <Link
                      href="/terms"
                      className="uppercase tracking-[0.2em] hover:text-red-400"
                    >
                      Terms
                    </Link>
                    <Link
                      href="/contact"
                      className="uppercase tracking-[0.2em] hover:text-red-400"
                    >
                      Contact
                    </Link>
                  </div>
                </footer>
              </div>
              <MobileBottomNav />
            </AudioPlayerProvider>
          </ToastProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
