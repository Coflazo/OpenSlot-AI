import type { CallEvent, FonioAdapter, StartCallRequest } from "./types";
import type { CallStatus, TranscriptTurn } from "../types";

type Listener = (event: CallEvent) => void;

const listeners = new Set<Listener>();

type ScriptedOutcome = {
  status: Extract<CallStatus, "accepted" | "declined" | "no_answer" | "voicemail" | "failed">;
  turns: TranscriptTurn[];
  durationSeconds: number;
  extraction: {
    identityConfirmed: boolean;
    slotAccepted: boolean;
    askedMedicalQuestion: boolean;
    needsCallback: boolean;
    voicemail: boolean;
  };
};

const scripts: Record<string, (req: StartCallRequest) => Promise<ScriptedOutcome>> = {};

// Default scripted outcome registry. Demo seeds register custom outcomes per customer.
export function registerScriptedOutcome(
  customerId: string,
  factory: (req: StartCallRequest) => Promise<ScriptedOutcome>
) {
  scripts[customerId] = factory;
}

let counter = 0;

function emit(event: CallEvent) {
  listeners.forEach((l) => l(event));
}

function turn(speaker: "agent" | "customer", text: string): TranscriptTurn {
  return { id: `t_${++counter}`, speaker, text, at: new Date().toISOString() };
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function defaultScript(req: StartCallRequest) {
  const turns: TranscriptTurn[] = [
    turn("agent", req.script),
    turn("customer", "Sorry, I can't take this slot today."),
    turn("agent", "No problem. I'll keep you on the waitlist.")
  ];
  return {
    status: "declined" as const,
    turns,
    durationSeconds: 38,
    extraction: {
      identityConfirmed: true,
      slotAccepted: false,
      askedMedicalQuestion: false,
      needsCallback: false,
      voicemail: false
    }
  };
}

export const mockAdapter: FonioAdapter = {
  async startCall(req: StartCallRequest) {
    const callId = req.callId;
    const scriptFn = scripts[req.customerId] ?? defaultScript;

    void (async () => {
      await delay(600);
      emit({ kind: "ringing", callId, at: new Date().toISOString() });
      await delay(900);
      emit({ kind: "in_progress", callId, at: new Date().toISOString() });

      const result = await scriptFn(req);

      // Stream transcript turn by turn
      for (const t of result.turns) {
        await delay(700);
        emit({ kind: "transcript_turn", callId, turn: t });
      }

      await delay(400);
      emit({
        kind: "completed",
        callId,
        at: new Date().toISOString(),
        status: result.status,
        durationSeconds: result.durationSeconds,
        extraction: result.extraction,
        transcript: result.turns,
        recordingUrl: `mock://recording/${callId}`
      });
    })();

    return { callId };
  },

  async cancelCall() {
    // mock no-op
  },

  onCallEvent(handler) {
    listeners.add(handler);
    return () => listeners.delete(handler) as unknown as void;
  }
};
