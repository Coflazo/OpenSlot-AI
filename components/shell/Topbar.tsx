"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, QuestionIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/primitives/button";
import { ClinicSwitcher } from "./ClinicSwitcher";
import { CommandPalette } from "./CommandPalette";
import { NotificationsMenu } from "./NotificationsMenu";
import { MobileNavButton } from "./MobileNav";

export function Topbar() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-porcelain/85 backdrop-blur supports-[backdrop-filter]:bg-porcelain/70 border-b border-stone/70">
      <div className="h-full px-4 lg:px-6 flex items-center gap-2 lg:gap-4">
        <MobileNavButton />

        <button
          onClick={() => setPaletteOpen(true)}
          className="flex-1 max-w-[520px] hidden md:flex items-center h-9 px-3 rounded-btn bg-white border border-stone hover:bg-porcelain2 transition text-left"
        >
          <MagnifyingGlassIcon size={15} className="text-ink-400" />
          <span className="ml-2 text-[13.5px] text-ink-400">Search slots, customers, actions…</span>
          <span className="ml-auto kbd">⌘K</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <ClinicSwitcher />
          <NotificationsMenu />
          <Button variant="ghost" size="icon" aria-label="Help">
            <QuestionIcon size={18} />
          </Button>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
