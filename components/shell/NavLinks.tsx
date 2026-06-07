"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Icon } from "@phosphor-icons/react";
import {
  CalendarBlankIcon,
  PhoneCallIcon,
  UsersThreeIcon,
  SlidersHorizontalIcon,
  ChartLineUpIcon,
  PuzzlePieceIcon,
  ShieldCheckIcon,
  UsersFourIcon,
  GearSixIcon,
  CompassIcon,
  ClockCountdownIcon,
  AddressBookIcon,
  GraphIcon,
  FileXlsIcon,
  GraduationCapIcon
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

export const NAV: { href: string; label: string; icon: Icon; group: "core" | "ops" | "admin" }[] = [
  { href: "/overview", label: "Overview", icon: CompassIcon, group: "core" },
  { href: "/open-slots", label: "Open Slots", icon: ClockCountdownIcon, group: "core" },
  { href: "/waitlist", label: "Waitlist", icon: UsersThreeIcon, group: "core" },
  { href: "/calendar", label: "Calendar", icon: CalendarBlankIcon, group: "core" },
  { href: "/calls", label: "Calls", icon: PhoneCallIcon, group: "ops" },
  { href: "/customers", label: "Customers", icon: AddressBookIcon, group: "ops" },
  { href: "/rules", label: "Rules", icon: SlidersHorizontalIcon, group: "ops" },
  { href: "/algorithm", label: "Algorithm", icon: GraphIcon, group: "ops" },
  { href: "/analytics", label: "Analytics", icon: ChartLineUpIcon, group: "ops" },
  { href: "/data", label: "Data", icon: FileXlsIcon, group: "admin" },
  { href: "/integrations", label: "Integrations", icon: PuzzlePieceIcon, group: "admin" },
  { href: "/compliance", label: "Compliance", icon: ShieldCheckIcon, group: "admin" },
  { href: "/academy", label: "Academy", icon: GraduationCapIcon, group: "admin" },
  { href: "/team", label: "Team", icon: UsersFourIcon, group: "admin" },
  { href: "/settings", label: "Settings", icon: GearSixIcon, group: "admin" }
];

export function NavList({
  onNavigate
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups: { label: string; key: "core" | "ops" | "admin" }[] = [
    { label: "Workspace", key: "core" },
    { label: "Operations", key: "ops" },
    { label: "Admin", key: "admin" }
  ];

  return (
    <nav className="px-3 flex-1 overflow-y-auto">
      {groups.map((g) => (
        <div key={g.key} className="mb-4">
          <div className="px-3 mb-1.5 text-[10.5px] font-[700] uppercase tracking-[0.12em] text-violet-100/40">
            {g.label}
          </div>
          {NAV.filter((n) => n.group === g.key).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2 rounded-btn text-[13.5px] font-[600] transition-all",
                  active
                    ? "bg-white/10 text-white shadow-[inset_2px_0_0_0_rgba(252,179,21,0.9)]"
                    : "text-violet-100/80 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={18} weight={active ? "fill" : "regular"} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
