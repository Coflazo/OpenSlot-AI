import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenSlot AI - Medical Appointment Recovery",
  description: "Automated appointment slot recovery system for medical clinics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className={`${outfit.className} h-full flex`} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
        {/* Sidebar fijo */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header />

          {/* Content */}
          <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--background)' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
