import * as React from "react";
import { cn } from "@/lib/cn";

const tones: Record<string, string> = {
  neutral: "bg-porcelain2 text-ink-500",
  peacock: "bg-peacock-50 text-peacock-700",
  violet: "bg-violet-50 text-violet-600",
  vert: "bg-vert-100 text-vert-700",
  saffron: "bg-saffron-100 text-saffron-700",
  sienna: "bg-sienna-100 text-sienna-700",
  ink: "bg-ink-100 text-ink-700"
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-chip text-[11px] font-[600] tracking-[0.005em]",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
