"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, X, ShieldAlert, ShieldCheck, Crown } from "lucide-react";
import { useAdmin, type AdminUser } from "@/lib/admin";
import { BlockDialog, StatusBadge } from "@/components/admin-ui";
import { Button, Card, inputCls } from "@/components/ui";
import { cn, formatBytes, relTime } from "@/lib/util";

type Filter = "all" | "active" | "blocked" | "premium" | "unconfirmed";

export default function AdminUsers() {
  const { users } = useAdmin();
  const [q, setQ] = useState(""); const [f, setF] = useState<Filter>("all"); const [sort, setSort] = useState<"joined" | "papers" | "seen">("joined");
  const [sel, setSel] = useState<AdminUser | null>(null); const [blocking, setBlocking] = useState<AdminUser | null>(null);
  const list = useMemo(() => users.filter((u) => {
    const t = q.trim().toLowerCase();
    if (t && !u.email.toLowerCase().includes(t) && !u.name.toLowerCase().includes(t)) return false;
    if (f === "active") return !u.blockedAt; if (f === "blocked") return !!u.blockedAt; if (f === "premium") return u.plan === "premium"; if (f === "unconfirmed") return !u.confirmed;
    return true;
  }).sort((a, b) => sort === "papers" ? b.papers - a.papers : sort === "seen" ? (b.lastSignInAt ?? "").localeCompare(a.lastSignInAt ?? "") : b.joinedAt.localeCompare(a.joinedAt)), [users, q, f, sort]);
  const current = sel ? users.find((u) => u.id === sel.id) ?? null : null;
  useEffect(() => {
    if (!sel || blocking) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sel, blocking]);
  const counts: Record<Filter, number> = { all: users.length, active: users.filter((u) => !u.blockedAt).length, blocked: users.filter((u) => u.blockedAt).length, premium: users.filter((u) => u.plan === "premium").length, unconfirmed: users.filter((u) => !u.confirmed).length };

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Users</h1>
      <p className="mt-1 text-sm text-ink-3">Search accounts, inspect usage, and block or unblock access.</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" aria-label="Search users" className={cn(inputCls, "h-10 pl-9")} />{q && <button onClick={() => setQ("")} aria-label="Clear" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-3"><X className="size-4" /></button>}</div>
        <select value={sort} onChange={(e) => setSort(e.target.value as "joined")} aria-label="Sort users" className={cn(inputCls.replace("w-full ", ""), "h-10 sm:w-48")}><option value="joined">Newest first</option><option value="seen">Last signed in</option><option value="papers">Most papers</option></select>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter users">
        {(Object.keys(counts) as Filter[]).map((k) => <button key={k} aria-pressed={f === k} onClick={() => setF(k)} className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize", f === k ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-2 hover:border-ink-3")}>{k} · {counts[k]}</button>)}
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line bg-stone/60 text-left text-xs uppercase tracking-wide text-ink-3">
              <tr><th className="px-4 py-2.5 font-medium">User</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-3 py-2.5 font-medium">Plan</th><th className="px-3 py-2.5 text-right font-medium">Papers</th><th className="px-3 py-2.5 font-medium">Last sign-in</th><th className="px-4 py-2.5 text-right font-medium">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((u) => (
                <tr key={u.id} className={cn("cursor-pointer hover:bg-stone/50", u.blockedAt && "bg-rose-soft/30")} onClick={() => setSel(u)}>
                  <td className="px-4 py-2.5"><button className="text-left" onClick={(e) => { e.stopPropagation(); setSel(u); }}><span className="flex items-center gap-1.5 font-medium">{u.name || "—"}{u.isAdmin && <Crown className="size-3.5 text-amber" aria-label="Admin" />}</span><span className="text-xs text-ink-3">{u.email}</span></button></td>
                  <td className="px-3 py-2.5"><StatusBadge u={u} /></td>
                  <td className="px-3 py-2.5 capitalize">{u.plan}{u.subStatus === "past_due" && <span className="ml-1 text-xs text-amber">(past due)</span>}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{u.papers}</td>
                  <td className="px-3 py-2.5 text-ink-2">{u.lastSignInAt ? relTime(u.lastSignInAt) : "Never"}</td>
                  <td className="px-4 py-2.5 text-right">
                    {u.isAdmin && !u.blockedAt ? <span className="text-xs text-ink-3">Admin</span> :
                      <Button size="sm" variant={u.blockedAt ? "secondary" : "ghost"} className={u.blockedAt ? "" : "text-rose hover:text-rose"} onClick={(e) => { e.stopPropagation(); setBlocking(u); }}>
                        {u.blockedAt ? <><ShieldCheck className="size-3.5" aria-hidden />Unblock</> : <><ShieldAlert className="size-3.5" aria-hidden />Block</>}
                      </Button>}
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-3">No users match.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2 text-xs text-ink-3">{list.length} of {users.length} users</p>
      </Card>

      <AnimatePresence>
        {current && (
          <div className="fixed inset-0 z-40">
            <motion.div className="absolute inset-0 bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSel(null)} />
            <motion.aside role="dialog" aria-modal="true" aria-label={`Details for ${current.email}`} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-line bg-paper p-6 text-ink shadow-[var(--shadow-lift)]">
              <div className="flex items-start justify-between gap-3"><div><h2 className="font-serif text-2xl font-semibold">{current.name || current.email}</h2><p className="text-sm text-ink-3">{current.email}</p></div><button onClick={() => setSel(null)} aria-label="Close details" className="rounded-md p-1.5 hover:bg-stone"><X className="size-5" /></button></div>
              <div className="mt-3"><StatusBadge u={current} /></div>
              {current.blockedAt && <p className="mt-3 rounded-xl bg-rose-soft p-3 text-sm text-rose">Blocked {relTime(current.blockedAt)}{current.blockedReason && ` — ${current.blockedReason}`}</p>}
              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                {[["User ID", <span key="i" className="font-mono text-xs break-all">{current.id}</span>], ["Role", current.isAdmin ? "Admin" : "Member"], ["Research role", current.researchRole ?? "—"], ["Email confirmed", current.confirmed ? "Yes" : "No"], ["Joined", new Date(current.joinedAt).toLocaleDateString()], ["Last sign-in", current.lastSignInAt ? relTime(current.lastSignInAt) : "Never"], ["Plan", <span key="p" className="capitalize">{current.plan}</span>], ["Subscription", current.subStatus.replace("_", " ")], ["Papers", current.papers], ["PDF storage", formatBytes(current.storageBytes)]].map(([k, v]) => (
                  <div key={k as string}><dt className="text-xs uppercase tracking-wide text-ink-3">{k}</dt><dd className="mt-0.5">{v}</dd></div>
                ))}
              </dl>
              <p className="mt-6 rounded-xl bg-stone p-3 text-xs text-ink-3">For privacy, admins can't read users' notes, summaries or PDF contents.</p>
              <div className="mt-auto pt-6">{!(current.isAdmin && !current.blockedAt) && <Button className="w-full" variant={current.blockedAt ? "primary" : "danger"} onClick={() => setBlocking(current)}>{current.blockedAt ? "Unblock account" : "Block account"}</Button>}</div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
      <div><BlockDialog user={blocking} onClose={() => setBlocking(null)} /></div>
    </div>
  );
}
