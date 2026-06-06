"use client";

import { useState } from "react";
import { CheckCircleIcon, CircleNotchIcon, LinkIcon } from "@phosphor-icons/react/dist/ssr";
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
import { useStore } from "@/lib/store";

export function ConnectDialog({
  trigger,
  service,
  description
}: {
  trigger: React.ReactNode;
  service: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "done">("idle");
  const appendAudit = useStore((s) => s.appendAudit);

  function go() {
    setStatus("connecting");
    setTimeout(() => {
      setStatus("done");
      appendAudit({
        actor: "user",
        action: "integration.connect",
        object: service,
        result: "success",
        details: "OAuth handshake completed"
      });
    }, 1300);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTimeout(() => setStatus("idle"), 300);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {service}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {status === "done" ? (
          <div className="rounded-card bg-vert-100/60 border border-vert-200 p-4 text-[13.5px] flex items-start gap-3">
            <CheckCircleIcon size={16} weight="fill" className="text-vert-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-[650] text-vert-700">{service} connected</div>
              <div className="text-meta text-ink-500 mt-0.5">
                Webhook receiver active. First sync will run within 5 minutes.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Workspace or account</Label>
              <Input placeholder={`${service.toLowerCase()}@viennaprivate.at`} />
            </div>
            <div className="space-y-1">
              <Label>API token (optional)</Label>
              <Input placeholder="••••••••" />
            </div>
            <div className="text-meta text-ink-400">
              OpenSlot AI will request the minimum scopes needed to read appointments and write confirmations.
            </div>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{status === "done" ? "Close" : "Cancel"}</Button>
          </DialogClose>
          {status !== "done" && (
            <Button onClick={go} disabled={status === "connecting"}>
              {status === "connecting" ? (
                <>
                  <CircleNotchIcon size={13} className="animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <LinkIcon size={13} />
                  Authorize
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
