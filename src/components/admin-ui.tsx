"use client";
import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Button, Dialog, Field, inputCls, useToast } from "./ui";
import { useAdmin, type AdminUser } from "@/lib/admin";
import { cn } from "@/lib/util";

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "rose" | "mint" | "amber" }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-3">{label}</p>
      <p className={cn("mt-2 font-serif text-3xl font-semibold tabular-nums", tone === "rose" && "text-rose", tone === "mint" && "text-mint", tone === "amber" && "text-amber")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ u }: { u: AdminUser }) {
  if (u.blockedAt) return <span className="inline-flex items-center gap-1 rounded-full bg-rose-soft px-2 py-0.5 text-xs font-medium text-rose"><ShieldAlert className="size-3" aria-hidden />Blocked</span>;
  if (!u.confirmed) return <span className="rounded-full bg-amber-soft px-2 py-0.5 text-xs font-medium text-amber">Unconfirmed</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-mint-soft px-2 py-0.5 text-xs font-medium text-mint"><ShieldCheck className="size-3" aria-hidden />Active</span>;
}

const REASONS = ["Spam or abusive content", "Suspicious sign-in activity", "Payment fraud / chargeback", "Terms of service violation", "Requested by the account owner"];

export function BlockDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const { setBlocked } = useAdmin();
  const toast = useToast();
  const [reason, setReason] = useState(""); const [custom, setCustom] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (user) { setReason(""); setCustom(""); setErr(""); } }, [user]);
  if (!user) return null;
  const unblocking = !!user.blockedAt;
  const finalReason = reason === "other" ? custom.trim() : reason;
  return (
    <Dialog open={!!user} onClose={onClose} title={unblocking ? `Unblock ${user.name || user.email}?` : `Block ${user.name || user.email}?`}
      description={unblocking ? "They'll be able to sign in and use PaperTrail again." : "They'll be signed out, can't sign in, and every API request from them is refused. Their data is kept, not deleted."}>
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setErr("");
        if (!unblocking && !finalReason) return setErr("Choose or write a reason. It's saved in the audit log.");
        setBusy(true);
        try { await setBlocked(user.id, !unblocking, finalReason || undefined); toast(unblocking ? "Account unblocked" : "Account blocked"); onClose(); }
        catch (e2) { setErr(e2 instanceof Error ? e2.message : "Couldn't update"); } finally { setBusy(false); }
      }}>
        <div className="rounded-xl bg-stone p-3 text-sm"><p className="font-medium">{user.email}</p><p className="text-xs text-ink-3">{user.papers} papers · {user.plan} plan{user.isAdmin && " · admin"}</p>
          {unblocking && user.blockedReason && <p className="mt-1 text-xs text-rose">Blocked for: {user.blockedReason}</p>}</div>
        {!unblocking && <>
          <fieldset><legend className="mb-1.5 text-[13px] font-medium">Reason</legend>
            <div className="space-y-1">{[...REASONS, "other"].map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-stone"><input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--rose)]" />{r === "other" ? "Other…" : r}</label>
            ))}</div>
          </fieldset>
          {reason === "other" && <Field label="Describe the reason" id="breason"><textarea id="breason" rows={2} maxLength={500} value={custom} onChange={(e) => setCustom(e.target.value)} className={inputCls} /></Field>}
        </>}
        {err && <p role="alert" className="text-sm text-rose">{err}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant={unblocking ? "primary" : "danger"} disabled={busy}>{busy ? "Saving…" : unblocking ? "Unblock account" : "Block account"}</Button></div>
      </form>
    </Dialog>
  );
}

export const KIND_LABEL: Record<string, string> = { added: "Added a paper", status: "Changed reading status", note: "Edited notes", collection: "Updated a collection", import: "Imported references", upload: "Uploaded a PDF", comment: "Commented on a shared paper" };
