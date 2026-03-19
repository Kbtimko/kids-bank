import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ParentAuthProvider } from "@/components/ParentAuthContext";
import { ParentUnlockBanner } from "@/components/ParentUnlockBanner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Kids Bank",
  description: "Family savings tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased bg-gray-50 min-h-screen`}>
        <ParentAuthProvider>
          <ParentUnlockBanner />
          <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
        </ParentAuthProvider>
      </body>
    </html>
  );
}
