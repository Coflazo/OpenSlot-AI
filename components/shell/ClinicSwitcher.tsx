"use client";

import { useState } from "react";
import { CaretDownIcon, BuildingsIcon, PlusIcon, CheckIcon } from "@phosphor-icons/react/dist/ssr";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/primitives/dropdown";

const LOCATIONS = [
  "Vienna Private Imaging — Innere Stadt",
  "Vienna Private Imaging — Mariahilf",
  "Vienna Private Imaging — Donaustadt"
];

export function ClinicSwitcher() {
  const [active, setActive] = useState(LOCATIONS[0]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-9 inline-flex items-center gap-2 px-3 rounded-btn bg-white border border-stone hover:bg-porcelain2 transition">
          <BuildingsIcon size={15} className="text-violet" />
          <span className="text-[13px] font-[600] text-ink max-w-[200px] truncate">{active}</span>
          <CaretDownIcon size={12} className="text-ink-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[280px]">
        <DropdownMenuLabel>Locations</DropdownMenuLabel>
        {LOCATIONS.map((loc) => (
          <DropdownMenuItem key={loc} onSelect={() => setActive(loc)}>
            <span className="flex-1">{loc}</span>
            {active === loc && <CheckIcon size={12} className="text-peacock" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <PlusIcon size={14} className="text-ink-400" />
          <span>Add location</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <BuildingsIcon size={14} className="text-ink-400" />
          <span>Manage locations</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
