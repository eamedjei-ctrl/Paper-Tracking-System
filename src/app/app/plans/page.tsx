"use client";
import { useEffect, useState } from "react";
import { FlaskConical, AlertTriangle, CreditCard } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/shell";
import { Button, Card, useToast } from "@/components/ui";
import { PlanCards } from "@/components/plan-cards";
import { effectivePlan, PLANS } from "@/lib/plans";
import { formatBytes } from "@/lib/util";
import type { SubscriptionStatus } from "@/lib/types";

const STATUS_TEXT: Record<SubscriptionStatus, string> = {
  none: "No subscription", trialing: "Trial", active: "Active", past_due: "Payment past due — update your payment method to keep Premium", canceled: "Canceled — you're on Standard; all your data remains exportable",
};

function Usage({ label, used, max }: { label: string; used: number; max: number | null; }) {
  const pct = max ? Math.min(100, (used / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="tabular-nums text-ink-2">{label === "PDF storage" ? `${formatBytes(used)} of ${formatBytes(max!)}` : `${used}${max ? ` of ${max}` : " · unlimited"}`}</span></div>
      {max !== null && <div className="mt-1.5 h-1.5 rounded-full bg-stone"><div className={pct > 85 ? "h-full rounded-full bg-amber" : "h-full rounded-full bg-accent"} style={{ width: `${pct}%` }} /></div>}
      {max !== null && pct > 85 && <p className="mt-1 text-xs text-amber">You're close to this limit.</p>}
    </div>
  );
}

export default function Plans() {
  const { ws, ent, mode, simulatePlan } = useStore();
  const toast = useToast();
  const [billing, setBilling] = useState<{ configured: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/billing/status").then((r) => r.json()).then(setBilling, () => setBilling({ configured: false })); }, []);
  const plan = effectivePlan(ws.plan, ws.subscriptionStatus);
  const storage = ws.papers.reduce((s, p) => s + (p.pdf?.size ?? 0), 0);

  const go = async (path: "checkout" | "portal") => {
    setBusy(true);
    try {
      const r = await fetch(`/api/billing/${path}`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      window.location.href = j.url;
    } catch (e) { toast(e instanceof Error ? e.message : "Billing unavailable", "error"); setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Plans & billing" description="Your usage, your plan, and what each plan includes." />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="space-y-4 p-5">
          <h2 className="font-serif text-lg font-semibold">Usage</h2>
          <Usage label="Papers" used={ws.papers.length} max={ent.maxPapers} />
          <Usage label="Collections" used={ws.collections.length} max={ent.maxCollections} />
          <Usage label="PDF storage" used={storage} max={ent.storageBytes} />
          <p className="text-xs text-ink-3">If you move to Standard with more than 200 papers, nothing is deleted — you can still read, edit and export everything; you just can't add new papers until you're under the limit.</p>
        </Card>
        <Card className="p-5">
          <h2 className="font-serif text-lg font-semibold">Subscription</h2>
          <p className="mt-2 text-sm"><strong>{PLANS[plan].name}</strong> · {STATUS_TEXT[ws.subscriptionStatus]}</p>
          {ws.subscriptionStatus === "past_due" && <p className="mt-2 flex gap-1.5 text-xs text-amber"><AlertTriangle className="size-3.5" aria-hidden />Premium stays active during a short grace period.</p>}
          {mode === "demo" ? (
            <div className="mt-4 space-y-3 rounded-xl border border-amber/30 bg-amber-soft/60 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber"><FlaskConical className="size-3.5" aria-hidden />Simulated billing</p>
              <p className="text-xs text-ink-2">No payment is taken in demo mode. Switch the simulated plan to see how limits behave.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => simulatePlan("standard", "none")}>Simulate Standard</Button>
                <Button size="sm" onClick={() => simulatePlan("premium", "active")}>Simulate Premium</Button>
                <Button size="sm" variant="ghost" onClick={() => simulatePlan("premium", "past_due")}>Past due</Button>
              </div>
            </div>
          ) : billing?.configured ? (
            <div className="mt-4 flex flex-col gap-2">
              {plan === "standard" ? <Button variant="primary" disabled={busy} onClick={() => go("checkout")}><CreditCard className="size-4" aria-hidden />Upgrade to Premium</Button>
                : <Button disabled={busy} onClick={() => go("portal")}>Manage billing</Button>}
              <p className="text-xs text-ink-3">Payments are handled by Stripe. Your plan updates once Stripe confirms payment.</p>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-stone p-3 text-xs text-ink-2">Billing is not configured on this deployment. See README → “Stripe billing” to enable upgrades.</p>
          )}
        </Card>
      </div>
      <h2 className="mb-4 mt-10 font-serif text-xl font-semibold">Compare plans</h2>
      <PlanCards current={plan} />
    </div>
  );
}
