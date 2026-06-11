import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "CommuteIQ — Intelligent Commute Tracker",
  description:
    "Automatically track and optimize your daily commute. Discover the best time to leave, backed by your own data.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563EB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F9FAFB] text-gray-900">
        <ToastProvider>
          <NavBar />
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4 text-center text-xs text-gray-400 sm:px-6 lg:px-8">
            CommuteIQ v1.0.0 — Your commute data, your insights.
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
