"use client";

import { useState } from "react";
import { ListIcon } from "@phosphor-icons/react/dist/ssr";
import { Sheet, SheetTrigger, SheetContent } from "@/components/primitives/sheet";
import { Brand } from "./Brand";
import { NavList } from "./NavLinks";

export function MobileNavButton() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open menu"
          className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-btn hover:bg-porcelain2 text-ink"
        >
          <ListIcon size={18} />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] bg-violet text-white p-0">
        <div className="px-6 pt-6 pb-5">
          <Brand />
        </div>
        <NavList onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
