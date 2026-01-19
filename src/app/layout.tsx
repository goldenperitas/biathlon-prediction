import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hit or Miss",
  description: "Predict biathlon podiums and compete with friends",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  const headerLink = user ? "/dashboard" : "/login";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center">
              <Link href={headerLink} className="text-xl text-zinc-900 dark:text-zinc-100">
                HIT<span className="text-zinc-500 dark:text-zinc-500">OR</span>MISS
              </Link>
              <span className="hidden md:block text-sm text-zinc-400 dark:text-zinc-500 ms-2 pt-0.5">
                The Biathlon Prediction Game
              </span>
            </div>
            <AuthButton />
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
