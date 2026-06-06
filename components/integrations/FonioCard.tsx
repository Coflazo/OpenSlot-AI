"use client";

import { useState } from "react";
import {
  PhoneCallIcon,
  CopySimpleIcon,
  CheckIcon,
  CircleNotchIcon,
  ArrowSquareOutIcon
} from "@phosphor-icons/react/dist/ssr";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/primitives/card";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { Input, Label, Textarea } from "@/components/primitives/input";
import { PERFECT_FONIO_PROMPT, EXTRACTION_FIELDS } from "@/lib/fonio/prompt";

const ORIGIN_HINT =
  typeof window === "undefined" ? "https://your-app.example" : window.location.origin;

export function FonioCard() {
  const [copied, setCopied] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [calling, setCalling] = useState<"idle" | "calling" | "ok" | "err">("idle");
  const [error, setError] = useState<string | null>(null);

  function copy(key: string, value: string) {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  }

  async function testCall() {
    if (!phone) return;
    setCalling("calling");
    setError(null);
    try {
      const r = await fetch("/api/fonio/test-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toNumber: phone })
      });
      const data = await r.json();
      if (data?.ok) {
        setCalling("ok");
      } else {
        setError(data?.hint ?? data?.error ?? "unknown");
        setCalling("err");
      }
    } catch (e) {
      setError(String(e));
      setCalling("err");
    }
  }

  const webhookBase = `${ORIGIN_HINT}/api/fonio`;
  const webhookToken = "<FONIO_WEBHOOK_TOKEN>";

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <PhoneCallIcon size={18} weight="duotone" className="text-saffron-700" />
              Fonio — voice agent
            </span>
          </CardTitle>
          <CardDescription>
            Configure the Assistant prompt, webhooks, and Variable Extraction in app.fonio.ai.
            EU servers, GDPR-compliant.
          </CardDescription>
        </div>
        <Badge tone="saffron">Connected via env</Badge>
      </CardHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div>
            <Label>Assistant prompt (paste into app.fonio.ai → Assistant → Prompt)</Label>
            <Textarea
              value={PERFECT_FONIO_PROMPT}
              readOnly
              className="mt-1.5 min-h-[260px] font-mono text-[12px] leading-[18px]"
            />
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => copy("prompt", PERFECT_FONIO_PROMPT)}
            >
              {copied === "prompt" ? <CheckIcon size={12} /> : <CopySimpleIcon size={12} />}
              {copied === "prompt" ? "Copied" : "Copy prompt"}
            </Button>
          </div>

          <div>
            <Label>Variable Extraction (Technical → Variable Extraction Active)</Label>
            <div className="mt-1.5 rounded-card border border-stone bg-porcelain p-3 text-[12.5px] space-y-1 max-h-[180px] overflow-y-auto">
              {EXTRACTION_FIELDS.map((f) => (
                <div key={f.key} className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] text-violet">{f.type}</span>
                  <span className="font-mono font-[700]">{f.key}</span>
                  <span className="text-ink-500 truncate">— {f.prompt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Webhook URLs (Assistant → Webhooks)</Label>
            <div className="mt-1.5 space-y-2">
              {[
                { kind: "Inbound", path: "inbound" },
                { kind: "Mid-call", path: "mid-call" },
                { kind: "Post-call", path: "post-call" }
              ].map((w) => {
                const url = `${webhookBase}/${w.path}?token=${webhookToken}`;
                return (
                  <div
                    key={w.kind}
                    className="rounded-card border border-stone bg-porcelain p-3 flex items-center gap-3"
                  >
                    <span className="text-[11px] uppercase tracking-wider text-ink-400 font-[700] shrink-0 w-[80px]">
                      {w.kind}
                    </span>
                    <code className="text-[12px] font-mono truncate flex-1">{url}</code>
                    <Button variant="ghost" size="sm" onClick={() => copy(w.kind, url)}>
                      {copied === w.kind ? <CheckIcon size={12} /> : <CopySimpleIcon size={12} />}
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="text-meta text-ink-400 mt-2">
              Replace <code className="font-mono">{webhookToken}</code> with the value of
              <code className="font-mono ml-1">FONIO_WEBHOOK_TOKEN</code> in your .env.local.
              Set Content-Type to application/json in Advanced Settings.
            </p>
          </div>

          <div>
            <Label>Test call</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+43 660 ..."
              />
              <Button onClick={testCall} disabled={calling === "calling" || !phone}>
                {calling === "calling" ? (
                  <>
                    <CircleNotchIcon size={13} className="animate-spin" />
                    Dialing…
                  </>
                ) : calling === "ok" ? (
                  <>
                    <CheckIcon size={13} /> Calling
                  </>
                ) : (
                  "Test call"
                )}
              </Button>
            </div>
            {calling === "err" && (
              <p className="text-meta text-sienna-700 mt-1.5">{error}</p>
            )}
            <p className="text-meta text-ink-400 mt-1.5 flex items-center gap-1">
              <ArrowSquareOutIcon size={11} /> Buy an Import Number (~€5/mo) at app.fonio.ai for branded outbound.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
