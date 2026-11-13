"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useAdmin } from "@/lib/admin";
import { Stat, StatusBadge, KIND_LABEL } from "@/components/admin-ui";
import { Card } from "@/components/ui";
import { formatBytes, relTime } from "@/lib/util";

export default function AdminOverview() {
  const { overview, users, error } = useAdmin();
  const [now] = useState(() => Date.now());
  const days = useMemo(() => {
    const out: { d: string; n: number }[] = [];
    for (let i = 29; i >= 0; i--) { const d = new Date(now - i * 864e5).toISOString().slice(0, 10); out.push({ d, n: (overview?.signups ?? []).filter((s) => s.slice(0, 10) === d).length }); }
    return out;
  }, [overview, now]);
  if (error) return <p role="alert" className="rounded-xl bg-rose-soft p-4 text-sm text-rose">{error}</p>;
  if (!overview) return null;
  const t = overview.totals; const max = Math.max(1, ...days.map((d) => d.n));
  const recent = [...users].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)).slice(0, 6);
  const active7 = users.filter((u) => u.lastSignInAt && now - +new Date(u.lastSignInAt) < 7 * 864e5).length;
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">System overview</h1>
      <p className="mt-1 text-sm text-ink-3">Everything happening across PaperTrail right now.</p>
      <motion.div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.05 } } }}>
        {[["Total users", t.users, `${active7} active in the last 7 days`], ["Blocked accounts", t.blocked, "Can't sign in", "rose"], ["Premium subscribers", t.premium, t.pastDue ? `${t.pastDue} past due` : "All payments current", "mint"], ["Papers stored", t.papers.toLocaleString(), `${formatBytes(t.storageBytes)} of PDFs`]].map(([l, v, h, tone]) => (
          <motion.div key={l as string} variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }}><Stat label={l as string} value={v as string} hint={h as string} tone={tone as "rose"} /></motion.div>
        ))}
      </motion.div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between"><h2 className="font-serif text-lg font-semibold">Sign-ups · last 30 days</h2><span className="text-sm text-ink-3">{days.reduce((n, d) => n + d.n, 0)} new</span></div>
          <div className="flex h-40 items-end gap-1" role="img" aria-label={`Sign-ups per day for the last 30 days, peak ${max}`}>
            {days.map((d) => <div key={d.d} title={`${d.d}: ${d.n}`} className="flex-1 rounded-t bg-accent/80 transition-colors hover:bg-accent" style={{ height: `${Math.max(3, (d.n / max) * 100)}%`, opacity: d.n ? 1 : 0.25 }} />)}
          </div>
          <div className="mt-2 flex justify-between text-xs text-ink-3"><span>30 days ago</span><span>Today</span></div>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-lg font-semibold">Newest accounts</h2><Link href="/admin/users" className="text-xs text-accent hover:underline">All users →</Link></div>
          <ul className="space-y-2.5">{recent.map((u) => <li key={u.id} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0"><span className="block truncate">{u.name || u.email}</span><span className="text-xs text-ink-3">joined {relTime(u.joinedAt)}</span></span><StatusBadge u={u} /></li>)}</ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-lg font-semibold">Live activity</h2><Link href="/admin/activity" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">Full feed<ArrowRight className="size-3" /></Link></div>
          <ul className="divide-y divide-line">{overview.events.slice(0, 7).map((e) => <li key={e.id} className="flex justify-between gap-3 py-2 text-sm"><span className="min-w-0"><span className="block truncate">{KIND_LABEL[e.kind] ?? e.kind}</span><span className="block truncate text-xs text-ink-3">{e.user}</span></span><span className="shrink-0 text-xs text-ink-3">{relTime(e.at)}</span></li>)}</ul>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-lg font-semibold">Recent admin actions</h2><Link href="/admin/audit" className="text-xs text-accent hover:underline">Audit log →</Link></div>
          {overview.audit.length === 0 ? <p className="text-sm text-ink-3">No admin actions yet.</p> : <ul className="space-y-2">{overview.audit.slice(0, 5).map((a) => <li key={a.id} className="text-sm"><span className={a.action === "block" ? "font-medium text-rose" : "font-medium text-mint"}>{a.action === "block" ? "Blocked" : "Unblocked"}</span> {a.target_email}<span className="block text-xs text-ink-3">by {a.admin_email} · {relTime(a.at)}{a.reason && ` · ${a.reason}`}</span></li>)}</ul>}
        </Card>
      </div>
    </div>
  );
}
