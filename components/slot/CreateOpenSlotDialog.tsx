"use client";

import { useState } from "react";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/primitives/dialog";
import { Button } from "@/components/primitives/button";
import { Input, Label } from "@/components/primitives/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/primitives/select";
import { useStore } from "@/lib/store";
import type { ServiceCode, Slot } from "@/lib/types";

const SERVICES: { code: ServiceCode; value: number; duration: number; contrast: boolean }[] = [
  { code: "MRI Knee", value: 420, duration: 45, contrast: false },
  { code: "MRI Brain", value: 520, duration: 45, contrast: false },
  { code: "MRI Spine", value: 640, duration: 60, contrast: false },
  { code: "CT Chest", value: 380, duration: 30, contrast: true },
  { code: "CT Abdomen", value: 410, duration: 30, contrast: true },
  { code: "Ultrasound", value: 180, duration: 25, contrast: false },
  { code: "X-ray", value: 120, duration: 15, contrast: false }
];

export function CreateOpenSlotDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [service, setService] = useState<ServiceCode>("MRI Knee");
  const [time, setTime] = useState("16:30");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("Vienna Private Imaging — Innere Stadt");

  const addSlot = useStore((s) => s.slots);
  const appendAudit = useStore((s) => s.appendAudit);
  const setSlots = (slots: Slot[]) => useStore.setState({ slots, activeSlotId: slots[0]?.id ?? null });

  function submit() {
    const meta = SERVICES.find((s) => s.code === service)!;
    const iso = new Date(`${date}T${time}:00`).toISOString();
    const id = `slot_open_${Date.now().toString(36)}`;
    const newSlot: Slot = {
      id,
      service,
      location,
      startTime: iso,
      durationMinutes: meta.duration,
      estimatedValue: meta.value,
      status: "open",
      requirements: { safetyForm: true, referral: true, paymentReady: true, contrast: meta.contrast },
      origin: "manual_opening",
      cascadeDepth: 0,
      cancelledAt: new Date().toISOString()
    };
    setSlots([newSlot, ...addSlot]);
    appendAudit({ actor: "user", action: "slot.create_open", object: id, result: "success", details: `${service} ${date} ${time}` });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <PlusIcon size={14} weight="bold" />
            Create open slot
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create open slot</DialogTitle>
          <DialogDescription>
            Add a recoverable slot manually. The recovery workflow will start immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Service</Label>
            <Select value={service} onValueChange={(v) => setService(v as ServiceCode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.code} · €{s.value} · {s.duration} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Location</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Vienna Private Imaging — Innere Stadt">Innere Stadt</SelectItem>
                <SelectItem value="Vienna Private Imaging — Mariahilf">Mariahilf</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={submit}>Create slot</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
