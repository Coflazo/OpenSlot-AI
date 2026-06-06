"use client";

import { BellSimpleIcon, CheckCircleIcon, WarningOctagonIcon, PhoneCallIcon, CoinIcon } from "@phosphor-icons/react/dist/ssr";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem
} from "@/components/primitives/dropdown";
import { Button } from "@/components/primitives/button";

const items = [
  {
    icon: <CoinIcon size={14} weight="fill" className="text-saffron-600" />,
    title: "Slot recovered",
    body: "MRI Knee 16:30 filled by Alex Berger — €420 recovered.",
    when: "2m ago"
  },
  {
    icon: <PhoneCallIcon size={14} weight="fill" className="text-peacock" />,
    title: "Voicemail to review",
    body: "Sara Klein returned a voicemail about her July 25 booking.",
    when: "11m ago"
  },
  {
    icon: <WarningOctagonIcon size={14} weight="fill" className="text-sienna" />,
    title: "Slot expired",
    body: "MRI Brain yesterday 17:00 expired without fill.",
    when: "1h ago"
  },
  {
    icon: <CheckCircleIcon size={14} weight="fill" className="text-vert-600" />,
    title: "Consent refresh complete",
    body: "12 customer consent records refreshed.",
    when: "Today, 09:14"
  }
];

export function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <BellSimpleIcon size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-saffron ring-2 ring-porcelain" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="px-3 pt-3 pb-2 flex items-center justify-between">
          <DropdownMenuLabel className="px-0 py-0">Notifications</DropdownMenuLabel>
          <button className="text-meta text-ink-400 hover:text-ink">Mark all read</button>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[380px] overflow-y-auto">
          {items.map((it) => (
            <DropdownMenuItem key={it.title} className="items-start gap-3 px-3 py-2.5">
              <span className="mt-0.5">{it.icon}</span>
              <div className="min-w-0">
                <div className="text-[13px] font-[650] truncate">{it.title}</div>
                <div className="text-meta text-ink-500 line-clamp-2">{it.body}</div>
                <div className="text-[11px] text-ink-400 mt-0.5">{it.when}</div>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="px-3 py-2 text-center">
          <a className="text-meta text-peacock font-[600] hover:underline" href="/calls">
            View all activity
          </a>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
