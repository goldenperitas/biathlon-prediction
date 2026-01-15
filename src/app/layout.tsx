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
            <Link href={headerLink} className="font-semibold">
              Hit or Miss
            </Link>
            <AuthButton />
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
