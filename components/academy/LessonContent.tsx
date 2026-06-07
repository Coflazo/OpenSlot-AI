"use client";

import Link from "next/link";
import { CheckCircleIcon, ArrowRightIcon, InfoIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { motion } from "framer-motion";
import { Button } from "@/components/primitives/button";
import type { AcademyBlock, AcademyChapter } from "./content";

export function LessonContent({
  chapter,
  index,
  isCompleted,
  onMarkComplete
}: {
  chapter: AcademyChapter;
  index: number;
  isCompleted: boolean;
  onMarkComplete: () => void;
}) {
  return (
    <article className="rounded-card bg-white shadow-card p-6 lg:p-8">
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700]">
            Chapter {index + 1}
          </div>
          <h2 className="text-title-lg mt-1">{chapter.title}</h2>
          <p className="text-meta text-ink-500 mt-1">
            {chapter.oneLine} · ~{chapter.estimatedMinutes} min read
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4 max-w-[68ch]">
        {chapter.body.map((block, i) => (
          <BlockRender key={i} block={block} />
        ))}
      </div>

      <div className="mt-8 pt-5 border-t border-stone/70 flex items-center gap-3 flex-wrap">
        {chapter.cta && (
          <Button asChild>
            <Link href={chapter.cta.href}>
              Try it now <ArrowRightIcon size={12} className="ml-1" />
            </Link>
          </Button>
        )}
        {isCompleted ? (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-btn bg-vert-100 text-vert-700 font-[650] text-[13px]">
            <CheckCircleIcon size={14} weight="fill" />
            Chapter complete
          </span>
        ) : (
          <Button variant="success" onClick={onMarkComplete}>
            <CheckCircleIcon size={13} weight="fill" />
            Mark complete
          </Button>
        )}
      </div>
    </article>
  );
}

function BlockRender({ block }: { block: AcademyBlock }) {
  if (block.kind === "h")
    return <h3 className="text-section pt-3">{block.text}</h3>;
  if (block.kind === "p")
    return <p className="text-[14.5px] leading-[1.65] text-ink">{block.text}</p>;
  if (block.kind === "list")
    return (
      <ul className="space-y-1.5 text-[14px] text-ink leading-[1.55]">
        {block.items.map((i) => (
          <li key={i} className="flex gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-peacock mt-2.5 shrink-0" />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    );
  if (block.kind === "code")
    return (
      <pre className="rounded-card bg-ink text-porcelain p-4 text-[12.5px] font-mono leading-relaxed overflow-x-auto">
        {block.text}
      </pre>
    );
  if (block.kind === "callout") {
    const tone =
      block.tone === "info"
        ? "bg-peacock-50 text-peacock-800 border-peacock-200"
        : block.tone === "warn"
          ? "bg-saffron-50 text-saffron-700 border-saffron-200"
          : "bg-vert-100 text-vert-700 border-vert-200";
    const Icon = block.tone === "warn" ? WarningCircleIcon : InfoIcon;
    return (
      <motion.div
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        className={"rounded-card border p-4 text-[13.5px] leading-snug flex gap-3 " + tone}
      >
        <Icon size={16} weight="fill" className="shrink-0 mt-0.5" />
        <span>{block.text}</span>
      </motion.div>
    );
  }
  if (block.kind === "kv")
    return (
      <dl className="rounded-card bg-porcelain border border-stone/80 p-4 space-y-1.5 text-[13.5px]">
        {block.items.map((it) => (
          <div key={it.k} className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-500 font-[600]">{it.k}</dt>
            <dd className="text-ink font-mono tabular-nums">{it.v}</dd>
          </div>
        ))}
      </dl>
    );
  return null;
}
