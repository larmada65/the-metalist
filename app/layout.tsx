import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "../components/Toast";
import { AudioPlayerProvider } from "../components/AudioPlayerProvider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ToastProvider>
          <AudioPlayerProvider>
            {/* Extra bottom padding for mobile nav + global audio player */}
            <div className="pb-28 md:pb-8">
              {children}
            </div>
          </AudioPlayerProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
