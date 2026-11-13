"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/shell";
import { Button, Card, Dialog, Field, inputCls, useToast } from "@/components/ui";
import { toBibtex, toRis, formatCitation } from "@/lib/citations";
import { download, cn } from "@/lib/util";
import type { Profile } from "@/lib/types";

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span><span className="text-sm font-medium">{label}</span>{hint && <span className="block text-xs text-ink-3">{hint}</span>}</span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-6 w-10 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export default function Settings() {
  const { ws, mode, updateProfile, resetDemo, exitDemo, userEmail } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState(ws.profile.name);
  const [interests, setInterests] = useState(ws.profile.interests.join(", "));
  const [del, setDel] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const up = (p: Partial<Profile>, msg = "Preferences saved") => updateProfile(p).then(() => toast(msg), (e) => toast(e.message, "error"));

  const exportJson = () => download(`papertrail-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), papers: ws.papers, collections: ws.collections, reminders: ws.reminders, activity: ws.activity }, null, 2), "application/json");
  const exportCsv = () => {
    const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rows = [["title", "authors", "year", "venue", "doi", "url", "status", "priority", "progress", "tags", "summary", "notes"], ...ws.papers.map((p) => [p.title, p.authors.map((a) => `${a.given} ${a.family}`.trim()).join("; "), p.year, p.venue, p.doi, p.url, p.status, p.priority, p.progress, p.tags.join("; "), p.summary, p.notes])];
    download("papertrail-papers.csv", rows.map((r) => r.map(esc).join(",")).join("\n"), "text/csv");
  };

  const deleteAccount = async () => {
    setBusy(true);
    if (mode === "demo") { exitDemo(); router.push("/"); return; }
    const r = await fetch("/api/account", { method: "DELETE" });
    if (r.ok) window.location.href = "/?deleted=1"; else { setBusy(false); toast("Couldn't delete account. Please try again.", "error"); }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" />
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-4 font-serif text-lg font-semibold">Profile</h2>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); up({ name: name.trim(), interests: interests.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5) }, "Profile saved"); }}>
            <Field label="Display name" id="name"><input id="name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
            {userEmail && <p className="text-sm text-ink-3">Signed in as {userEmail}</p>}
            <Field label="Research interests" id="int" hint="Comma separated, up to five"><input id="int" value={interests} onChange={(e) => setInterests(e.target.value)} className={inputCls} /></Field>
            <Button type="submit" variant="primary">Save profile</Button>
          </form>
        </Card>

        <Card className="p-5" id="goals">
          <h2 className="mb-2 font-serif text-lg font-semibold">Reading goal</h2>
          <div className="flex items-center gap-3"><label htmlFor="goal" className="text-sm">Papers to finish per week</label>
            <input id="goal" type="number" min={1} max={100} defaultValue={ws.profile.weeklyGoal} onBlur={(e) => { const v = Math.max(1, Math.min(100, +e.target.value || 1)); if (v !== ws.profile.weeklyGoal) up({ weeklyGoal: v }, "Goal updated"); }} className={cn(inputCls, "w-24")} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 font-serif text-lg font-semibold">Appearance & motion</h2>
          <fieldset className="mb-2"><legend className="mb-2 text-sm font-medium">Theme</legend>
            <div className="flex gap-2">{(["system", "light", "dark"] as const).map((t) => <Button key={t} size="sm" variant={ws.profile.theme === t ? "primary" : "secondary"} aria-pressed={ws.profile.theme === t} onClick={() => up({ theme: t })}>{t[0].toUpperCase() + t.slice(1)}</Button>)}</div>
          </fieldset>
          <Toggle label="Reduce motion" hint="Turns off decorative animation. Your system's reduced-motion setting is always respected." checked={ws.profile.reduceMotion} onChange={(v) => up({ reduceMotion: v })} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 font-serif text-lg font-semibold">Notifications</h2>
          <Toggle label="Reminder emails" hint={mode === "demo" ? "Simulated in demo mode." : "Requires email delivery to be configured for this deployment."} checked={ws.profile.notifyReminders} onChange={(v) => up({ notifyReminders: v })} />
          <Toggle label="Comments on shared papers" checked={ws.profile.notifyComments} onChange={(v) => up({ notifyComments: v })} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-serif text-lg font-semibold">Your data</h2>
          <p className="mb-4 text-sm text-ink-3">Your research belongs to you. Export everything at any time, on any plan — including after a downgrade.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportJson}><Download className="size-4" aria-hidden />Everything (JSON)</Button>
            <Button onClick={exportCsv}><Download className="size-4" aria-hidden />Papers & notes (CSV)</Button>
            <Button onClick={() => download("papertrail.bib", ws.papers.map(toBibtex).join("\n\n"))}><Download className="size-4" aria-hidden />BibTeX</Button>
            <Button onClick={() => download("papertrail.ris", ws.papers.map(toRis).join("\n\n"))}><Download className="size-4" aria-hidden />RIS</Button>
            <Button onClick={() => download("papertrail-apa.txt", ws.papers.map((p) => formatCitation(p, "apa")).sort().join("\n\n"))}><Download className="size-4" aria-hidden />APA bibliography</Button>
          </div>
        </Card>

        {mode === "demo" && (
          <Card className="p-5">
            <h2 className="mb-2 font-serif text-lg font-semibold">Demo</h2>
            <Button onClick={() => { resetDemo(); toast("Sample data restored"); }}><RotateCcw className="size-4" aria-hidden />Reset sample data</Button>
          </Card>
        )}

        <Card className="border-rose/30 p-5">
          <h2 className="mb-1 font-serif text-lg font-semibold text-rose">{mode === "demo" ? "Clear demo data" : "Delete account"}</h2>
          <p className="mb-4 text-sm text-ink-3">{mode === "demo" ? "Removes all demo data from this browser." : "Permanently deletes your account, papers, notes, collections and uploaded PDFs. Export first if you want a copy."}</p>
          <Button variant="danger" onClick={() => setDel(true)}><Trash2 className="size-4" aria-hidden />{mode === "demo" ? "Clear demo data" : "Delete my account"}</Button>
        </Card>
      </div>

      <Dialog open={del} onClose={() => setDel(false)} title={mode === "demo" ? "Clear demo data?" : "Delete your account permanently?"} description="This cannot be undone.">
        <form onSubmit={(e) => { e.preventDefault(); if (confirm === "DELETE") deleteAccount(); }} className="space-y-4">
          <Field label='Type "DELETE" to confirm' id="confirm"><input id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} autoComplete="off" /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setDel(false)}>Cancel</Button><Button variant="danger" type="submit" disabled={confirm !== "DELETE" || busy}>{busy ? "Deleting…" : "Delete permanently"}</Button></div>
        </form>
      </Dialog>
    </div>
  );
}
