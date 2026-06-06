import { registerScriptedOutcome } from "../fonio/mockAdapter";
import type { TranscriptTurn } from "../types";

let i = 0;
const T = (speaker: "agent" | "customer", text: string): TranscriptTurn => ({
  id: `demo_t_${++i}`,
  speaker,
  text,
  at: new Date().toISOString()
});

// Idempotent registration so HMR doesn't double-register
let registered = false;

export function seedCascadeDemo() {
  if (registered) return;
  registered = true;

  // Alex accepts the today 16:30 upgrade offer
  registerScriptedOutcome("cust_alex", async (req) => ({
    status: "accepted",
    durationSeconds: 78,
    turns: [
      T("agent", req.script),
      T("customer", "Yes, I have been hoping for something earlier. Today works."),
      T("agent", "Great. I'll check that the 16:30 slot is still available and move you over."),
      T("customer", "Perfect. Thank you."),
      T("agent", "You're booked for 16:30. Please arrive by 16:15. Your July 20 appointment is released. I'll send a confirmation now.")
    ],
    extraction: {
      identityConfirmed: true,
      slotAccepted: true,
      askedMedicalQuestion: false,
      needsCallback: false,
      voicemail: false
    }
  }));

  // Sara declines the July 20 upgrade offer (satisfied)
  registerScriptedOutcome("cust_sara", async (req) => ({
    status: "declined",
    durationSeconds: 31,
    turns: [
      T("agent", req.script),
      T("customer", "Actually I'd rather keep my July 25 slot, thanks."),
      T("agent", "Understood. We'll keep your current booking unchanged.")
    ],
    extraction: {
      identityConfirmed: true,
      slotAccepted: false,
      askedMedicalQuestion: false,
      needsCallback: false,
      voicemail: false
    }
  }));

  // Mia accepts the July 20 waitlist offer
  registerScriptedOutcome("cust_mia", async (req) => ({
    status: "accepted",
    durationSeconds: 64,
    turns: [
      T("agent", req.script),
      T("customer", "Yes please, that would be excellent."),
      T("agent", "Booking you for July 20. I'll send the confirmation now. If a still earlier slot opens, would you like us to notify you?"),
      T("customer", "Absolutely, yes."),
      T("agent", "Noted. We'll be in touch.")
    ],
    extraction: {
      identityConfirmed: true,
      slotAccepted: true,
      askedMedicalQuestion: false,
      needsCallback: false,
      voicemail: false
    }
  }));
}
