"use client";

import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react/dist/ssr";
import { chapters } from "./content";
import { cn } from "@/lib/cn";

export function AcademySidebar({
  active,
  completed,
  onSelect
}: {
  active: string;
  completed: Set<string>;
  onSelect: (slug: string) => void;
}) {
  return (
    <nav className="rounded-card bg-white shadow-card p-2 sticky top-20 max-h-[calc(100dvh-7rem)] overflow-y-auto">
      <ol className="space-y-0.5">
        {chapters.map((ch, i) => {
          const isActive = active === ch.slug;
          const isDone = completed.has(ch.slug);
          return (
            <li key={ch.slug}>
              <button
                onClick={() => onSelect(ch.slug)}
                className={cn(
                  "w-full text-left flex items-start gap-2 px-3 py-2 rounded-btn transition",
                  isActive ? "bg-peacock-50" : "hover:bg-porcelain2"
                )}
              >
                <span className="mt-0.5">
                  {isDone ? (
                    <CheckCircleIcon size={14} weight="fill" className="text-vert-600" />
                  ) : (
                    <CircleIcon size={14} className={isActive ? "text-peacock" : "text-ink-300"} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-[13px]", isActive ? "font-[700] text-peacock-800" : "font-[600]")}>
                    {i + 1}. {ch.title}
                  </div>
                  <div className="text-[11px] text-ink-400 truncate">{ch.oneLine}</div>
                </div>
                <span className="font-mono text-[10.5px] text-ink-400 tabular-nums shrink-0 pt-0.5">
                  {ch.estimatedMinutes}m
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
