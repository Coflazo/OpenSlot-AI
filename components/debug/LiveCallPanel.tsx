"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneCallIcon,
  CheckCircleIcon,
  XCircleIcon,
  CircleNotchIcon,
  WaveformIcon,
  VoicemailIcon
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { DemoCall } from "@/lib/fonio/demoCallStore";

const FINAL_STATES = new Set(["accepted", "declined", "no_answer", "voicemail", "failed"]);

export function LiveCallPanel({
  offerId,
  onClose
}: {
  offerId: string;
  onClose: () => void;
}) {
  const [call, setCall] = useState<DemoCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elapsedRef = useRef<number | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const r = await fetch(`/api/fonio/demo-call/${offerId}`);
        const data = await r.json();
        if (cancelled) return;
        if (data?.ok) {
          setCall(data.call);
          if (!FINAL_STATES.has(data.call.status)) {
            setTimeout(tick, 1500);
          }
        } else {
          setError(data?.reason ?? "not_found");
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }
    tick();
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  // Elapsed clock for active calls
  useEffect(() => {
    if (!call || FINAL_STATES.has(call.status)) return;
    elapsedRef.current = Date.parse(call.startedAt);
    const id = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [call]);

  const elapsed = call && elapsedRef.current
    ? Math.max(0, Math.floor((Date.now() - elapsedRef.current) / 1000))
    : call?.durationSeconds ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="rounded-card bg-white shadow-cardHover overflow-hidden border border-stone"
    >
      <div className="px-4 py-3 bg-gradient-to-r from-violet to-peacock text-white">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-[700]">
          <PhoneCallIcon size={12} weight="fill" />
          Live Fonio call
        </div>
        <div className="text-[15px] font-[700] mt-1">
          {call?.customerName ?? "Connecting…"}
        </div>
        <div className="text-[12px] text-white/80 font-mono">{call?.customerPhone}</div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <StatusBadge status={call?.status ?? "queued"} />
          <span className="font-mono tabular-nums text-[13px] text-ink">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        </div>

        {call && !FINAL_STATES.has(call.status) && (
          <div className="rounded-card bg-porcelain border border-stone/80 p-3">
            <div className="text-[10.5px] uppercase tracking-wider text-ink-400 font-[700] mb-1.5">
              Signal
            </div>
            <Waveform live />
          </div>
        )}

        {call?.extraction && (
          <div className="rounded-card border border-stone/80 p-3 space-y-1.5 text-[12.5px]">
            <div className="text-[10.5px] uppercase tracking-wider text-ink-400 font-[700] mb-1">
              Structured extraction
            </div>
            <ExtractionRow label="Slot accepted" value={call.extraction.slotAccepted} good />
            <ExtractionRow label="Identity confirmed" value={call.extraction.identityConfirmed} good />
            <ExtractionRow label="Asked medical question" value={call.extraction.askedMedicalQuestion} bad />
            <ExtractionRow label="Wants human callback" value={call.extraction.wantsCallback} bad />
            <ExtractionRow label="Voicemail" value={call.extraction.voicemail} bad />
            <ExtractionRow label="Opted out" value={call.extraction.optOut} bad />
            {call.extraction.customerPickedAlternateTime && (
              <div className="text-meta text-ink-500 pt-1">
                Proposed time: <span className="font-mono">{call.extraction.customerPickedAlternateTime}</span>
              </div>
            )}
          </div>
        )}

        {call?.error && (
          <div className="rounded-card bg-sienna-50 border border-sienna-200 text-sienna-700 text-[12px] p-2.5">
            {call.error}
          </div>
        )}

        {error && (
          <div className="rounded-card bg-sienna-50 border border-sienna-200 text-sienna-700 text-[12px] p-2.5">
            {error === "not_found" ? "Waiting for Fonio…" : error}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full text-meta text-ink-400 hover:text-ink py-1.5"
        >
          {call && FINAL_STATES.has(call.status) ? "Close" : "Hide"}
        </button>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: DemoCall["status"] }) {
  const map: Record<DemoCall["status"], { bg: string; fg: string; label: string; Icon: Icon }> = {
    queued: { bg: "bg-porcelain2", fg: "text-ink-500", label: "Queued", Icon: CircleNotchIcon },
    ringing: { bg: "bg-peacock-50", fg: "text-peacock-700", label: "Ringing…", Icon: PhoneCallIcon },
    in_progress: { bg: "bg-peacock-50", fg: "text-peacock-700", label: "Talking", Icon: WaveformIcon },
    accepted: { bg: "bg-vert-100", fg: "text-vert-700", label: "Accepted", Icon: CheckCircleIcon },
    declined: { bg: "bg-sienna-50", fg: "text-sienna-700", label: "Declined", Icon: XCircleIcon },
    no_answer: { bg: "bg-saffron-100", fg: "text-saffron-700", label: "No answer", Icon: PhoneCallIcon },
    voicemail: { bg: "bg-saffron-100", fg: "text-saffron-700", label: "Voicemail", Icon: VoicemailIcon },
    failed: { bg: "bg-sienna-100", fg: "text-sienna-700", label: "Failed", Icon: XCircleIcon }
  };
  const c = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip text-[11px] font-[700] uppercase tracking-wider ${c.bg} ${c.fg}`}>
      <c.Icon size={11} weight="fill" />
      {c.label}
    </span>
  );
}

function ExtractionRow({ label, value, good, bad }: { label: string; value: boolean; good?: boolean; bad?: boolean }) {
  const tone = value ? (good ? "text-vert-700" : bad ? "text-sienna-700" : "text-ink") : "text-ink-400";
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-600">{label}</span>
      <span className={`font-mono font-[700] ${tone}`}>{value ? "yes" : "no"}</span>
    </div>
  );
}

function Waveform({ live }: { live: boolean }) {
  const bars = 24;
  return (
    <div className="h-9 flex items-center gap-[3px]">
      {Array.from({ length: bars }).map((_, i) => {
        const base = 0.3 + ((Math.sin(i * 1.7) + 1) / 2) * 0.7;
        return (
          <motion.span
            key={i}
            animate={
              live
                ? { scaleY: [base, base * 1.4, base * 0.7, base] }
                : { scaleY: 0.4 }
            }
            transition={
              live
                ? { duration: 0.9 + (i % 4) * 0.12, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.2 }
            }
            className="flex-1 rounded-full bg-peacock origin-center"
            style={{ height: `${Math.round(base * 30)}px` }}
          />
        );
      })}
    </div>
  );
}
