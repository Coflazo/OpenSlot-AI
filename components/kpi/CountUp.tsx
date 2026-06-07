"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useMotionValue, useTransform } from "framer-motion";

export function CountUp({
  value,
  format = (n) => Math.round(n).toString(),
  duration = 0.9
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(0);
  const text = useTransform(mv, (latest) => format(latest));
  const inView = useInView(ref, { once: true, margin: "-32px" });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, {
      duration,
      ease: [0.16, 1, 0.3, 1]
    });
    return controls.stop;
  }, [inView, value, duration, mv]);

  useEffect(() => {
    return text.on("change", (latest) => {
      if (ref.current) ref.current.textContent = latest;
    });
  }, [text]);

  return <span ref={ref}>{format(0)}</span>;
}
