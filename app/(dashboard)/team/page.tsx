"use client";

import { useState } from "react";
import { UserPlusIcon, CheckIcon, XIcon } from "@phosphor-icons/react/dist/ssr";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/primitives/card";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { Input, Label } from "@/components/primitives/input";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/primitives/select";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Manager" | "Receptionist" | "Compliance" | "Read-only";
  status: "Active" | "Invited";
  locations: string;
}

const seed: Member[] = [
  { id: "1", name: "Çağan Oflazoğlu", email: "owner@viennaprivate.at", role: "Owner", status: "Active", locations: "All" },
  { id: "2", name: "Helene Pichler", email: "h.pichler@viennaprivate.at", role: "Manager", status: "Active", locations: "All" },
  { id: "3", name: "Stefan Köhler", email: "s.koehler@viennaprivate.at", role: "Receptionist", status: "Active", locations: "Innere Stadt" },
  { id: "4", name: "Marija Horvat", email: "m.horvat@viennaprivate.at", role: "Receptionist", status: "Active", locations: "Mariahilf" },
  { id: "5", name: "Dr. Klaus Reiter", email: "k.reiter@viennaprivate.at", role: "Compliance", status: "Active", locations: "All" },
  { id: "6", name: "Felix Bauer", email: "f.bauer@viennaprivate.at", role: "Read-only", status: "Invited", locations: "Innere Stadt" }
];

const PERMS = [
  "View dashboard",
  "Manage waitlist",
  "Pause workflows",
  "Edit rules",
  "View transcripts",
  "Export data",
  "Manage integrations",
  "Manage billing"
];

const roleAccess: Record<Member["role"], boolean[]> = {
  Owner: [true, true, true, true, true, true, true, true],
  Manager: [true, true, true, true, true, true, true, false],
  Receptionist: [true, true, true, false, true, false, false, false],
  Compliance: [true, false, false, false, true, true, false, false],
  "Read-only": [true, false, false, false, false, false, false, false]
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>(seed);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("Receptionist");

  function invite() {
    if (!email) return;
    setMembers((m) => [
      { id: String(m.length + 1), name: name || email.split("@")[0], email, role, status: "Invited", locations: "Innere Stadt" },
      ...m
    ]);
    setName("");
    setEmail("");
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="max-w-2xl">
          <h1 className="text-title-xl tracking-tight">Team</h1>
          <p className="mt-2 text-body text-ink-500">
            Manage who can view, approve, pause, and configure recovery workflows.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlusIcon size={14} weight="bold" />
              Invite team member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite team member</DialogTitle>
              <DialogDescription>They'll receive an email with a sign-up link.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Helene Pichler" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Email address</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@viennaprivate.at" />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Member["role"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Owner">Owner</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Receptionist">Receptionist</SelectItem>
                    <SelectItem value="Compliance">Compliance reviewer</SelectItem>
                    <SelectItem value="Read-only">Read-only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Location access</Label>
                <Select defaultValue="All">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All locations</SelectItem>
                    <SelectItem value="IS">Innere Stadt</SelectItem>
                    <SelectItem value="MH">Mariahilf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button onClick={invite}>Send invite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-[13.5px]">
          <thead className="bg-porcelain/70 border-b border-stone/80">
            <tr className="text-left text-meta text-ink-500 [&>th]:py-2.5 [&>th]:px-4 [&>th]:font-[600] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-[11px]">
              <th>Member</th>
              <th>Role</th>
              <th>Locations</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-stone/60">
                <td className="px-4 py-3">
                  <div className="font-[650]">{m.name}</div>
                  <div className="text-meta text-ink-400">{m.email}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={m.role === "Owner" ? "saffron" : m.role === "Manager" ? "violet" : "neutral"}>
                    {m.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-ink-500">{m.locations}</td>
                <td className="px-4 py-3">
                  <Badge tone={m.status === "Active" ? "vert" : "saffron"}>{m.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Permissions matrix</CardTitle>
            <CardDescription>What each role can do by default.</CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-meta text-ink-500 [&>th]:py-2 [&>th]:px-3 [&>th]:font-[600] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-[11px] border-b border-stone/60">
                <th>Permission</th>
                <th>Owner</th>
                <th>Manager</th>
                <th>Receptionist</th>
                <th>Compliance</th>
                <th>Read-only</th>
              </tr>
            </thead>
            <tbody>
              {PERMS.map((p, idx) => (
                <tr key={p} className="border-b border-stone/40">
                  <td className="px-3 py-2 font-[600]">{p}</td>
                  {(["Owner", "Manager", "Receptionist", "Compliance", "Read-only"] as Member["role"][]).map((r) => (
                    <td key={r} className="px-3 py-2">
                      {roleAccess[r][idx] ? (
                        <CheckIcon size={14} className="text-vert-600" weight="bold" />
                      ) : (
                        <XIcon size={14} className="text-ink-300" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
