import React from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";

interface AdminLayoutProps {
  children: ReactNode;
}

export const metadata = {
  title: "Benjyland Beach Guesthouse — Content",
  robots: { index: false, follow: false },
};

export default async function ContentLayout({
  children,
}: AdminLayoutProps): Promise<React.JSX.Element> {
  const user = await requireAdmin();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-brand-cream text-brand-ink min-h-screen">
        <header className="border-b border-black/5 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-6">
              <Link href="/content" className="text-brand-pink font-serif text-xl font-semibold">
                Benjyland Beach Guesthouse · Content
              </Link>
              <nav className="text-brand-ink-soft hidden gap-5 text-sm sm:flex">
                <Link href="/content/text" className="hover:text-brand-pink">
                  Text
                </Link>
                <Link href="/content/rooms" className="hover:text-brand-pink">
                  Rooms
                </Link>
                <Link href="/content/facilities" className="hover:text-brand-pink">
                  Facilities
                </Link>
                <Link href="/content/media" className="hover:text-brand-pink">
                  Media
                </Link>
                <Link href="/content/services" className="hover:text-brand-pink">
                  Services
                </Link>
                <Link href="/content/calendar" className="hover:text-brand-pink">
                  Calendar
                </Link>
                <Link href="/content/bookings" className="hover:text-brand-pink">
                  Bookings
                </Link>
                <Link href="/content/site" className="hover:text-brand-pink">
                  Settings
                </Link>
              </nav>
            </div>
            <div className="text-brand-ink-soft text-xs">
              <span className="hidden sm:inline">Signed in as </span>
              <span className="font-medium">{user.email}</span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
