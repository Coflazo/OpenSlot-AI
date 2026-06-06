import type { Metadata, Viewport } from "next";
import { TooltipProvider } from "@/components/primitives/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://openslot.ai"),
  title: "OpenSlot AI — Close the loop on every cancellation",
  description:
    "Detect cancelled appointments, rank your waitlist, call eligible customers, and fill the slot before it expires.",
  applicationName: "OpenSlot AI"
};

export const viewport: Viewport = {
  themeColor: "#FAF8F1",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grain min-h-[100dvh] bg-porcelain text-ink antialiased">
        <TooltipProvider delayDuration={120}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
