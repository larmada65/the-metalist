import type { Metadata } from "next";
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider initialUser={initialUser}>
          <ToastProvider>
            <AudioPlayerProvider>
              {/* Extra bottom padding for mobile nav + global audio player (player ~80px tall) */}
              <div className="pb-28 md:pb-24">
                {children}
              </div>
              <MobileBottomNav />
            </AudioPlayerProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
