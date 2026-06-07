"use client";

import { useEffect, useMemo, useState } from "react";
import { GraduationCapIcon } from "@phosphor-icons/react/dist/ssr";
import { AcademySidebar } from "@/components/academy/AcademySidebar";
import { SetupChecklist } from "@/components/academy/SetupChecklist";
import { LessonContent } from "@/components/academy/LessonContent";
import { chapters } from "@/components/academy/content";

const STORAGE_KEY = "openslot:academy:completed";

export default function AcademyPage() {
  const [activeSlug, setActiveSlug] = useState<string>(chapters[0].slug);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setCompleted(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completed)));
    } catch {}
  }, [completed]);

  const activeIdx = useMemo(
    () => Math.max(0, chapters.findIndex((c) => c.slug === activeSlug)),
    [activeSlug]
  );
  const chapter = chapters[activeIdx];

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <h1 className="text-title-xl tracking-tight inline-flex items-center gap-2">
          <GraduationCapIcon size={22} weight="duotone" className="text-saffron-600" />
          Academy
        </h1>
        <p className="mt-2 text-body text-ink-500">
          Zero-to-mastery course. 14 chapters, ~90 minutes total. Each lesson links
          straight back into the product so you can practice as you read.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-3">
          <AcademySidebar active={activeSlug} completed={completed} onSelect={setActiveSlug} />
        </div>
        <div className="lg:col-span-6">
          <LessonContent
            chapter={chapter}
            index={activeIdx}
            isCompleted={completed.has(chapter.slug)}
            onMarkComplete={() => {
              setCompleted((prev) => {
                const next = new Set(prev);
                next.add(chapter.slug);
                return next;
              });
              if (activeIdx < chapters.length - 1) {
                setActiveSlug(chapters[activeIdx + 1].slug);
              }
            }}
          />
        </div>
        <div className="lg:col-span-3">
          <SetupChecklist />
        </div>
      </div>
    </div>
  );
}
