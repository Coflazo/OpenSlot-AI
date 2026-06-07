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
import { Input, Label, Textarea } from "@/components/primitives/input";
import { Checkbox } from "@/components/primitives/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/primitives/select";
import { useStore } from "@/lib/store";
import type { ServiceCode } from "@/lib/types";

const SERVICES: ServiceCode[] = ["MRI Knee", "MRI Brain", "MRI Spine", "CT Chest", "CT Abdomen", "Ultrasound", "X-ray"];

export function AddCustomerDialog() {
  const [open, setOpen] = useState(false);
  const addCustomer = useStore((s) => s.addCustomer);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState<ServiceCode>("MRI Knee");
  const [consent, setConsent] = useState(true);

  function submit() {
    if (!name) return;
    addCustomer({
      id: `cust_${Date.now().toString(36)}`,
      name,
      phone,
      email,
      language: "en",
      consent: { call: consent, sms: consent, voicemail: consent, recording: consent },
      eligibility: {
        safetyForm: false,
        referral: false,
        paymentReady: false,
        authorization: false,
        contrastStatus: "not_required"
      },
      preferences: { sameDay: false, preferredWindow: "any", maxTravelMinutes: 30 },
      requestedService: service,
      bookingSatisfaction: "neutral",
      earlierOpportunityPreference: "any_earlier",
      cascadeParticipation: "can_move",
      businessPriority: 0.5,
      waitingSince: new Date().toISOString()
    });
    setName("");
    setPhone("");
    setEmail("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon size={14} weight="bold" />
          Add customer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer to waitlist</DialogTitle>
          <DialogDescription>
            Customer agreed to be contacted if an earlier slot becomes available.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Berger" />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+43 1 234 5678" />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@example.com" />
          </div>
          <div className="space-y-1">
            <Label>Requested service</Label>
            <Select value={service} onValueChange={(v) => setService(v as ServiceCode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Preferred location</Label>
            <Input placeholder="Innere Stadt" />
          </div>
          <div className="col-span-2 flex items-start gap-2 p-3 rounded-card bg-porcelain border border-stone/80">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} id="consent" />
            <label htmlFor="consent" className="text-[13px] text-ink-600">
              Customer agreed to be contacted if an earlier slot becomes available.
            </label>
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Notes</Label>
            <Textarea placeholder="Anything the team should know" />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={submit}>Add to waitlist</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
