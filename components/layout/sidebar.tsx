"use client";

import { usePathname } from "next/navigation";
import { BarChart3, LineChart, Calendar, Users, Phone } from "lucide-react";

const navItems = [
  {
    label: "Overview",
    href: "/overview",
    icon: BarChart3,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: LineChart,
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: Calendar,
  },
  {
    label: "Waitlist",
    href: "/waitlist",
    icon: Users,
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Phone,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 border-r flex flex-col shadow-lg"
      style={{ backgroundColor: 'var(--primary)' }}
    >
      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer font-medium text-sm`}
              style={{
                backgroundColor: isActive
                  ? 'oklch(31.18% 0.053 129.56 / 1)'
                  : 'oklch(31.18% 0.053 129.56 / 0.7)',
                color: 'var(--primary-foreground)',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'oklch(31.18% 0.053 129.56 / 0.85)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'oklch(31.18% 0.053 129.56 / 0.7)';
                }
              }}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
