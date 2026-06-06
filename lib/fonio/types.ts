import type { CallExtraction, CallStatus, CallType, TranscriptTurn } from "../types";

export interface StartCallRequest {
  callId: string;
  slotId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  type: CallType;
  script: string;
  metadata?: Record<string, string | number>;
}

export type CallEvent =
  | { kind: "ringing"; callId: string; at: string }
  | { kind: "in_progress"; callId: string; at: string }
  | { kind: "transcript_turn"; callId: string; turn: TranscriptTurn }
  | {
      kind: "completed";
      callId: string;
      at: string;
      status: CallStatus;
      durationSeconds: number;
      extraction: CallExtraction;
      transcript: TranscriptTurn[];
      recordingUrl?: string;
    };

export interface FonioAdapter {
  startCall(req: StartCallRequest): Promise<{ callId: string }>;
  cancelCall(callId: string): Promise<void>;
  onCallEvent(handler: (event: CallEvent) => void): () => void;
}
