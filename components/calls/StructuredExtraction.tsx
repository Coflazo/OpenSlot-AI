"use client";

import { CheckCircleIcon, MinusCircleIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import type { CallSession } from "@/lib/types";

const order: { key: keyof NonNullable<CallSession["extraction"]>; label: string; trueIsGood?: boolean }[] = [
  { key: "identityConfirmed", label: "Identity confirmed" },
  { key: "slotAccepted", label: "Slot accepted" },
  { key: "askedMedicalQuestion", label: "Asked medical question", trueIsGood: false },
  { key: "needsCallback", label: "Needs callback", trueIsGood: false },
  { key: "voicemail", label: "Voicemail", trueIsGood: false }
];

export function StructuredExtraction({ call }: { call: CallSession }) {
  if (!call.extraction) {
    return (
      <div className="rounded-card border border-stone bg-porcelain p-3 text-meta text-ink-400">
        Extraction available after call completes.
      </div>
    );
  }
  return (
    <div className="rounded-card border border-stone bg-white p-3">
      <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700] mb-2">
        Structured extraction
      </div>
      <ul className="space-y-1.5">
        {order.map((o) => {
          const value = call.extraction![o.key];
          const trueIsGood = o.trueIsGood ?? true;
          const ok = value === trueIsGood;
          return (
            <li key={o.key} className="flex items-center gap-2 text-[13px]">
              {ok ? (
                <CheckCircleIcon size={13} weight="fill" className="text-vert-600" />
              ) : value ? (
                <XCircleIcon size={13} weight="fill" className="text-sienna-600" />
              ) : (
                <MinusCircleIcon size={13} className="text-ink-300" />
              )}
              <span className="text-ink">{o.label}</span>
              <span className="ml-auto text-meta text-ink-500">{String(value)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
