"use client";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Lock, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/shell";
import { Button, Card, EmptyState, Field, inputCls, useToast } from "@/components/ui";
import { cn } from "@/lib/util";

export default function RemindersPage() {
  const { ws, ent, upsertReminder, deleteReminder, mode } = useStore();
  const toast = useToast();
  const [text, setText] = useState(""); const [date, setDate] = useState(""); const [paperId, setPaperId] = useState(""); const [err, setErr] = useState("");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sorted = [...ws.reminders].sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));
  const groups = [
    { label: "Overdue", items: sorted.filter((r) => !r.done && new Date(r.due) < today) },
    { label: "Upcoming", items: sorted.filter((r) => !r.done && new Date(r.due) >= today) },
    { label: "Done", items: sorted.filter((r) => r.done) },
  ];
  const safe = (p: Promise<unknown>, ok?: string) => p.then(() => ok && toast(ok), (e) => toast(e.message, "error"));

  return (
    <div className="max-w-3xl">
      <PageHeader step="reminders" title="Reminders" description="Dated nudges for your reading. Upcoming ones also appear on your dashboard." />
      <Card className="mb-6 p-5">
        <h2 className="mb-3 font-serif text-lg font-semibold">New reminder</h2>
        {ent.customReminders ? (
          <form noValidate className="grid gap-3 sm:grid-cols-[1fr_160px]" onSubmit={async (e) => {
            e.preventDefault(); setErr("");
            if (!text.trim()) return setErr("Say what you want to be reminded about.");
            if (!date) return setErr("Pick a date.");
            try { await upsertReminder({ text: text.trim(), due: new Date(date + "T09:00").toISOString(), paperId: paperId || null }); toast("Reminder set"); setText(""); setDate(""); setPaperId(""); } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Couldn't save"); }
          }}>
            <Field label="Remind me to…" id="rt" error={err}><input id="rt" value={text} onChange={(e) => setText(e.target.value)} className={inputCls} placeholder="Finish the methods section" /></Field>
            <Field label="On" id="rd"><input id="rd" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="About a paper (optional)" id="rp"><select id="rp" value={paperId} onChange={(e) => setPaperId(e.target.value)} className={inputCls}><option value="">No specific paper</option>{ws.papers.map((p) => <option key={p.id} value={p.id}>{p.title.slice(0, 80)}</option>)}</select></Field>
            <div className="flex items-end"><Button variant="primary" type="submit" className="w-full"><Bell className="size-4" aria-hidden />Set reminder</Button></div>
          </form>
        ) : <p className="flex items-center gap-2 text-sm text-ink-3"><Lock className="size-4" aria-hidden />Custom reminders are part of <Link href="/app/plans" className="text-accent underline">Premium</Link>. Existing reminders stay visible below.</p>}
        <p className="mt-3 text-xs text-ink-3">{mode === "demo" ? "Demo: reminders are shown in the app; no notifications are sent." : "Reminders appear in the app. Email delivery isn't configured on this deployment."}</p>
      </Card>

      {ws.reminders.length === 0 ? <EmptyState title="No reminders" body="Set one above, or from any paper's page." /> : (
        <div className="space-y-6">
          {groups.filter((g) => g.items.length).map((g) => (
            <section key={g.label}>
              <h2 className={cn("mb-2 text-xs font-semibold uppercase tracking-wide", g.label === "Overdue" ? "text-rose" : "text-ink-3")}>{g.label} · {g.items.length}</h2>
              <Card className="divide-y divide-line">
                <AnimatePresence initial={false}>
                  {g.items.map((r) => {
                    const p = ws.papers.find((x) => x.id === r.paperId);
                    return (
                      <motion.div key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-start gap-3 p-3">
                        <input type="checkbox" checked={r.done} onChange={() => safe(upsertReminder({ ...r, done: !r.done }), r.done ? "Reopened" : "Marked done")} aria-label={`Done: ${r.text}`} className="mt-1 size-4 accent-[var(--accent)]" />
                        <div className="min-w-0 flex-1 text-sm">
                          <p className={cn(r.done && "text-ink-3 line-through")}>{r.text}</p>
                          <p className="text-xs text-ink-3">{new Date(r.due).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}{p && <> · <Link href={`/app/papers/${p.id}`} className="text-accent hover:underline">{p.title.slice(0, 60)}</Link></>}</p>
                        </div>
                        <button onClick={() => safe(deleteReminder(r.id), "Reminder deleted")} aria-label={`Delete reminder ${r.text}`} className="rounded p-1 text-ink-3 hover:text-rose"><Trash2 className="size-4" /></button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
