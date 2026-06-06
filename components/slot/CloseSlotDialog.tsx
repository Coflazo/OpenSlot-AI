"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/primitives/dialog";
import { Button } from "@/components/primitives/button";
import { useStore } from "@/lib/store";

const REASONS = [
  "Filled manually",
  "Clinic closed slot",
  "Original customer returned",
  "Slot no longer available",
  "Other"
];

export function CloseSlotDialog({
  slotId,
  open,
  onOpenChange
}: {
  slotId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const closeSlot = useStore((s) => s.closeSlot);
  const [reason, setReason] = useState(REASONS[0]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close this open slot?</DialogTitle>
          <DialogDescription>This will stop all calls and mark the slot as closed.</DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-1.5">
          {REASONS.map((r) => (
            <label
              key={r}
              className={
                "flex items-center gap-2.5 p-3 rounded-btn border transition cursor-pointer " +
                (reason === r ? "border-peacock bg-peacock-50/50" : "border-stone hover:bg-porcelain2")
              }
            >
              <input
                type="radio"
                name="close-reason"
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-peacock"
              />
              <span className="text-[13.5px]">{r}</span>
            </label>
          ))}
        </fieldset>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep open</Button>
          </DialogClose>
          <Button variant="danger" onClick={() => { closeSlot(slotId, reason); onOpenChange(false); }}>
            Close slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
