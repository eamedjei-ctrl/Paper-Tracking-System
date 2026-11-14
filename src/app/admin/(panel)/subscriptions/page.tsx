"use client";
import { useAdmin } from "@/lib/admin";
import { Stat } from "@/components/admin-ui";
import { Card } from "@/components/ui";
import { relTime } from "@/lib/util";

export default function AdminSubscriptions() {
  const { users } = useAdmin();
  const premium = users.filter((u) => u.plan === "premium");
  const pastDue = premium.filter((u) => u.subStatus === "past_due");
  const near = users.filter((u) => u.plan === "standard" && u.papers >= 160).sort((a, b) => b.papers - a.papers);
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Subscriptions</h1>
      <p className="mt-1 text-sm text-ink-3">Demo figures are simulated.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Premium" value={premium.length} tone="mint" /><Stat label="Standard" value={users.length - premium.length} />
        <Stat label="Past due" value={pastDue.length} tone="amber" hint="In grace period" /><Stat label="Conversion" value={`${users.length ? Math.round((premium.length / users.length) * 100) : 0}%`} hint="Premium / all users" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-3 font-serif text-lg font-semibold">Payment problems</h2>
          {pastDue.length === 0 ? <p className="text-sm text-ink-3">No past-due subscriptions.</p> : <ul className="space-y-2">{pastDue.map((u) => <li key={u.id} className="flex justify-between text-sm"><span>{u.email}</span><span className="text-xs text-amber">past due</span></li>)}</ul>}</Card>
        <Card className="p-5"><h2 className="mb-1 font-serif text-lg font-semibold">Close to the Standard limit</h2><p className="mb-3 text-xs text-ink-3">160+ of 200 papers — likely to need Premium soon.</p>
          {near.length === 0 ? <p className="text-sm text-ink-3">Nobody is near the limit.</p> : <ul className="space-y-2">{near.map((u) => <li key={u.id} className="text-sm"><div className="flex justify-between"><span>{u.email}</span><span className="tabular-nums text-ink-3">{u.papers}/200</span></div><div className="mt-1 h-1.5 rounded-full bg-stone"><div className="h-full rounded-full bg-amber" style={{ width: `${Math.min(100, u.papers / 2)}%` }} /></div></li>)}</ul>}</Card>
      </div>
      <Card className="mt-6 overflow-hidden"><h2 className="border-b border-line px-5 py-3 font-serif text-lg font-semibold">Premium subscribers</h2>
        <ul className="divide-y divide-line">{premium.map((u) => <li key={u.id} className="flex justify-between px-5 py-2.5 text-sm"><span>{u.name} <span className="text-ink-3">· {u.email}</span></span><span className="text-xs text-ink-3">joined {relTime(u.joinedAt)}</span></li>)}</ul></Card>
    </div>
  );
}
