"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Copy, Download, Pencil, Trash2, Plus, X, Check, Bell, AlertTriangle, MessageSquare, Users, Loader2, CloudOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Card, Dialog, Menu, MenuItem, PriorityBadge, ProgressBar, StatusPill, Tag, inputCls, useToast, EmptyState } from "@/components/ui";
import { PaperForm, draftFromPaper, draftToPaper, validateDraft, type Draft } from "@/components/paper-form";
import { PdfPanel } from "@/components/pdf-panel";
import { formatCitation, missingCitationFields, toBibtex, toRis, citeKey, type CitationStyle } from "@/lib/citations";
import { STATUS_LABEL, PRIORITY_LABEL, type Paper, type ReadingStatus, type Priority } from "@/lib/types";
import { cn, relTime, uid, download } from "@/lib/util";
import { spring } from "@/lib/motion";

function Flourish({ show }: { show: number }) {
  const reduce = useReducedMotion();
  if (reduce || !show) return null;
  return (
    <span key={show} className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
      {[...Array(8)].map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <motion.span key={i} className="absolute size-1.5 rounded-full" style={{ background: i % 2 ? "var(--mint)" : "var(--accent)" }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: Math.cos(a) * 28, y: Math.sin(a) * 28, opacity: 0, scale: 0.4 }} transition={{ duration: 0.6, ease: "easeOut" }} />;
      })}
    </span>
  );
}

/** Autosaving text field. Flushes pending changes on unmount and warns before unload. */
function useAutosave(value: string, save: (v: string) => Promise<void>) {
  const [text, setText] = useState(value);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveRef = useRef(save);
  saveRef.current = save;
  const flush = async () => {
    if (pending.current === null) return;
    const v = pending.current;
    pending.current = null;
    setState("saving");
    try { await saveRef.current(v); setState("saved"); } catch { pending.current = v; setState("error"); }
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => { if (pending.current !== null) { e.preventDefault(); } };
    window.addEventListener("beforeunload", onUnload);
    return () => { window.removeEventListener("beforeunload", onUnload); clearTimeout(timer.current); flushRef.current(); };
  }, []);
  const onChange = (v: string) => {
    setText(v); pending.current = v; setState("idle");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), 800);
  };
  return { text, onChange, state, retry: flush, dirty: () => pending.current !== null };
}

function SaveLabel({ state, onRetry }: { state: string; onRetry: () => void }) {
  if (state === "saving") return <span className="inline-flex items-center gap-1 text-xs text-ink-3"><Loader2 className="size-3 animate-spin" aria-hidden />Saving</span>;
  if (state === "saved") return <span className="inline-flex items-center gap-1 text-xs text-mint"><Check className="size-3" aria-hidden />Saved</span>;
  if (state === "error") return <button onClick={onRetry} className="inline-flex items-center gap-1 text-xs text-rose underline"><CloudOff className="size-3" aria-hidden />Couldn't save — retry</button>;
  return <span className="text-xs text-ink-3">Autosaves as you type</span>;
}

function TextBlock({ paper, field, label, placeholder, rows }: { paper: Paper; field: "notes" | "summary"; label: string; placeholder: string; rows: number }) {
  const { updatePapers } = useStore();
  const a = useAutosave(paper[field], (v) => updatePapers([paper.id], { [field]: v }));
  return (
    <section aria-labelledby={`${field}-h`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id={`${field}-h`} className="font-serif text-lg font-semibold">{label}</h2>
        <span aria-live="polite"><SaveLabel state={a.state} onRetry={a.retry} /></span>
      </div>
      <textarea value={a.text} onChange={(e) => a.onChange(e.target.value)} rows={rows} placeholder={placeholder} aria-label={label}
        className={cn(inputCls, "resize-y bg-paper font-serif text-[15px] leading-relaxed")} />
    </section>
  );
}

function ListBlock({ title, items, onChange, placeholder }: { title: string; items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [v, setV] = useState("");
  return (
    <section>
      <h2 className="mb-2 font-serif text-lg font-semibold">{title}</h2>
      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {items.map((t, i) => (
            <motion.li key={t + i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="group flex items-start gap-2 text-sm">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden /><span className="flex-1">{t}</span>
              <button onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove “${t}”`} className="rounded p-0.5 text-ink-3 opacity-60 hover:text-rose group-hover:opacity-100"><X className="size-3.5" /></button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onChange([...items, v.trim()]); setV(""); } }}>
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label={`Add to ${title}`} className={cn(inputCls, "h-9")} />
        <Button size="sm" type="submit" className="h-9" aria-label={`Add to ${title}`}><Plus className="size-4" /></Button>
      </form>
    </section>
  );
}

export default function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { ws, mode, ent, setStatus, updatePapers, deletePapers, setCollectionPapers, upsertReminder, deleteReminder, addComment } = useStore();
  const router = useRouter();
  const toast = useToast();
  const paper = ws.papers.find((p) => p.id === id);
  const [flourish, setFlourish] = useState(0);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [confirmDel, setConfirmDel] = useState(false);
  const [style, setStyle] = useState<CitationStyle>("apa");
  const [tagInput, setTagInput] = useState("");
  const [task, setTask] = useState("");
  const [remText, setRemText] = useState("");
  const [remDate, setRemDate] = useState("");
  const [comment, setComment] = useState("");

  const related = useMemo(() => {
    if (!paper) return [];
    return ws.papers.filter((p) => p.id !== paper.id).map((p) => ({ p, score: p.tags.filter((t) => paper.tags.includes(t)).length + (ws.collections.some((c) => c.paperIds.includes(p.id) && c.paperIds.includes(paper.id)) ? 1 : 0) }))
      .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 4).map((x) => x.p);
  }, [ws.papers, ws.collections, paper]);

  if (!paper) {
    return <EmptyState title="Paper not found" body="It may have been deleted, or the link is incorrect." action={<Link href="/app/library"><Button>Back to library</Button></Link>} />;
  }

  const sharedCols = ws.collections.filter((c) => c.shared && c.paperIds.includes(paper.id));
  const missing = missingCitationFields(paper);
  const citation = formatCitation(paper, style);
  const activity = ws.activity.filter((a) => a.paperId === paper.id).slice(0, 8);
  const reminders = ws.reminders.filter((r) => r.paperId === paper.id);
  const comments = ws.comments.filter((c) => c.paperId === paper.id);

  const safe = async (fn: () => Promise<unknown>, ok?: string) => { try { await fn(); if (ok) toast(ok); } catch (e) { toast(e instanceof Error ? e.message : "Couldn't save", "error"); } };
  const changeStatus = (s: ReadingStatus) => safe(async () => { await setStatus(paper.id, s); if (s === "read") setFlourish((n) => n + 1); }, `Marked as ${STATUS_LABEL[s]}`);
  const addTag = () => { const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-"); if (t && !paper.tags.includes(t)) safe(() => updatePapers([paper.id], { tags: [...paper.tags, t] })); setTagInput(""); };

  return (
    <article>
      <Link href="/app/library" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ArrowLeft className="size-4" aria-hidden />Library</Link>

      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <motion.span layoutId={`paper-${paper.id}`} className="inline-flex"><StatusPill status={paper.status} /></motion.span>
          <PriorityBadge p={paper.priority} />
          {paper.metadataSource !== "manual" && <span className="text-xs text-ink-3">Metadata from {paper.metadataSource === "crossref" ? "Crossref" : paper.metadataSource === "sample" ? "demo sample" : paper.metadataSource.toUpperCase()}, reviewed by you</span>}
        </div>
        <h1 className="font-serif text-2xl font-semibold leading-tight tracking-tight sm:text-[32px]">{paper.title}</h1>
        <p className="mt-2 text-[15px] text-ink-2">{paper.authors.length ? paper.authors.map((a) => `${a.given} ${a.family}`.trim()).join(", ") : <span className="italic text-ink-3">Authors unknown</span>}</p>
        <p className="mt-1 text-sm text-ink-3">{[paper.venue, paper.year].filter(Boolean).join(" · ") || "Venue and year unknown"}{paper.doi && <> · <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">doi:{paper.doi}</a></>}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { setDraft(draftFromPaper(paper)); setErrors({}); setEdit(true); }}><Pencil className="size-3.5" aria-hidden />Edit details</Button>
          <Menu label="Export citation" trigger={(t) => <Button size="sm" {...t}><Download className="size-3.5" aria-hidden />Export</Button>}>
            {(close) => <>
              <MenuItem onClick={() => { close(); download(`${citeKey(paper)}.bib`, toBibtex(paper)); }}>BibTeX (.bib)</MenuItem>
              <MenuItem onClick={() => { close(); download(`${citeKey(paper)}.ris`, toRis(paper)); }}>RIS (.ris)</MenuItem>
            </>}
          </Menu>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDel(true)}><Trash2 className="size-3.5 text-rose" aria-hidden />Delete</Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5">
            <fieldset>
              <legend className="mb-3 text-sm font-semibold">Reading status</legend>
              <div className="relative grid grid-cols-2 gap-1 rounded-xl bg-stone p-1 sm:grid-cols-4">
                {(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((s) => (
                  <button key={s} onClick={() => changeStatus(s)} aria-pressed={paper.status === s} className={cn("relative rounded-lg px-3 py-2 text-sm font-medium", paper.status === s ? "text-ink" : "text-ink-3 hover:text-ink")}>
                    {paper.status === s && <motion.span layoutId="status-seg" className="absolute inset-0 rounded-lg bg-card shadow-[var(--shadow-card)]" transition={spring.snappy} />}
                    <span className="relative">{STATUS_LABEL[s]}{s === "read" && <Flourish show={paper.status === "read" ? flourish : 0} />}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 flex items-center gap-3">
              <label htmlFor="prog" className="w-20 shrink-0 text-sm text-ink-2">Progress</label>
              <input id="prog" type="range" min={0} max={100} step={5} value={paper.progress} onChange={(e) => updatePapers([paper.id], { progress: +e.target.value, status: +e.target.value === 100 ? paper.status : paper.status === "unread" && +e.target.value > 0 ? "in_progress" : paper.status })} className="flex-1 accent-[var(--accent)]" />
              <span className="w-10 text-right text-sm tabular-nums">{paper.progress}%</span>
            </div>
            <div className="mt-2"><ProgressBar value={paper.progress} /></div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label htmlFor="prio" className="w-20 text-sm text-ink-2">Priority</label>
              <select id="prio" value={paper.priority} onChange={(e) => safe(() => updatePapers([paper.id], { priority: e.target.value as Priority }))} className={cn(inputCls, "w-auto")}>
                {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </Card>

          {paper.abstract && (
            <section><h2 className="mb-2 font-serif text-lg font-semibold">Abstract</h2><p className="text-[15px] leading-relaxed text-ink-2">{paper.abstract}</p></section>
          )}

          <Card className="space-y-6 p-5">
            <TextBlock key={`s-${paper.id}`} paper={paper} field="summary" label="Your summary" placeholder="In two or three sentences, what is this paper about and why does it matter to you?" rows={3} />
            <TextBlock key={`n-${paper.id}`} paper={paper} field="notes" label="Notes" placeholder="Private notes, quotes with page numbers, methods to borrow…" rows={9} />
            <p className="flex items-center gap-1.5 text-xs text-ink-3"><Users className="size-3.5" aria-hidden />Summary and notes are private to you, even in shared projects.</p>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5"><ListBlock title="Key takeaways" items={paper.takeaways} onChange={(v) => safe(() => updatePapers([paper.id], { takeaways: v }))} placeholder="Add a takeaway" /></Card>
            <Card className="p-5"><ListBlock title="Questions to investigate" items={paper.questions} onChange={(v) => safe(() => updatePapers([paper.id], { questions: v }))} placeholder="Add a question" /></Card>
          </div>

          <Card className="p-5">
            <h2 className="mb-3 font-serif text-lg font-semibold">Follow-up tasks</h2>
            <ul className="space-y-1">
              {paper.tasks.map((t) => (
                <li key={t.id} className="group flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-stone/60">
                  <button role="checkbox" aria-checked={t.done} aria-label={t.text} onClick={() => updatePapers([paper.id], { tasks: paper.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) })}
                    className={cn("flex size-5 items-center justify-center rounded-md border transition-colors", t.done ? "border-mint bg-mint text-white" : "border-line bg-card")}>
                    <AnimatePresence>{t.done && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring.snappy}><Check className="size-3.5" /></motion.span>}</AnimatePresence>
                  </button>
                  <span className={cn("flex-1 text-sm", t.done && "text-ink-3 line-through")}>{t.text}</span>
                  <button onClick={() => updatePapers([paper.id], { tasks: paper.tasks.filter((x) => x.id !== t.id) })} aria-label={`Delete task ${t.text}`} className="rounded p-1 text-ink-3 opacity-60 hover:text-rose group-hover:opacity-100"><X className="size-3.5" /></button>
                </li>
              ))}
            </ul>
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (task.trim()) { updatePapers([paper.id], { tasks: [...paper.tasks, { id: uid(), text: task.trim(), done: false }] }); setTask(""); } }}>
              <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Reproduce figure 3" aria-label="New task" className={cn(inputCls, "h-9")} />
              <Button size="sm" type="submit" className="h-9">Add task</Button>
            </form>
          </Card>

          {sharedCols.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-semibold"><MessageSquare className="size-4" aria-hidden />Discussion</h2>
              <p className="mb-3 text-xs text-ink-3">Visible to members of {sharedCols.map((c) => c.name).join(", ")}.</p>
              {paper.assignedTo && <p className="mb-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">Assigned for review: {paper.assignedTo}</p>}
              <ul className="space-y-3">
                {comments.map((c) => <li key={c.id} className="rounded-xl bg-paper p-3 text-sm"><p className="mb-0.5 text-xs font-semibold">{c.author} <span className="font-normal text-ink-3">· {relTime(c.createdAt)}</span></p>{c.body}</li>)}
                {comments.length === 0 && <li className="text-sm text-ink-3">No comments yet.</li>}
              </ul>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (comment.trim()) safe(() => addComment(paper.id, sharedCols[0].id, comment.trim()), "Comment posted").then(() => setComment("")); }}>
                <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment for the project" aria-label="Comment" className={cn(inputCls, "h-9")} />
                <Button size="sm" type="submit" className="h-9" variant="primary">Post</Button>
              </form>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <label htmlFor="assign" className="text-ink-2">Assign review to</label>
                <select id="assign" value={paper.assignedTo ?? ""} onChange={(e) => safe(() => updatePapers([paper.id], { assignedTo: e.target.value || null }), "Assignment updated")} className={cn(inputCls, "h-9 w-auto")}>
                  <option value="">Nobody</option>
                  {(ws.members[sharedCols[0].id] ?? []).filter((m) => m.status === "active").map((m) => <option key={m.email} value={m.name}>{m.name}</option>)}
                </select>
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <PdfPanel paper={paper} />

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Tags</h2>
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence>{paper.tags.map((t) => <motion.span key={t} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}><Tag onRemove={() => updatePapers([paper.id], { tags: paper.tags.filter((x) => x !== t) })}>{t}</Tag></motion.span>)}</AnimatePresence>
            </div>
            <form className="mt-2" onSubmit={(e) => { e.preventDefault(); addTag(); }}><input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag + Enter" aria-label="Add tag" className={cn(inputCls, "h-8 text-xs")} /></form>
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Collections</h2>
            {ws.collections.length === 0 ? <p className="text-xs text-ink-3">No collections yet. <Link href="/app/collections?new=1" className="text-accent underline">Create one</Link>.</p> : (
              <ul className="space-y-1">
                {ws.collections.map((c) => {
                  const inC = c.paperIds.includes(paper.id);
                  return (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm hover:bg-stone/60">
                        <input type="checkbox" checked={inC} onChange={() => safe(() => setCollectionPapers(c.id, inC ? [] : [paper.id], inC ? [paper.id] : []), inC ? `Removed from ${c.name}` : `Added to ${c.name}`)} className="size-4 accent-[var(--accent)]" />
                        <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden /><span className="truncate">{c.name}</span>{c.shared && <Users className="ml-auto size-3 text-ink-3" aria-label="Shared" />}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Citation</h2>
              <select value={style} onChange={(e) => setStyle(e.target.value as CitationStyle)} aria-label="Citation style" className="rounded-md border border-line bg-card px-1.5 py-0.5 text-xs">
                <option value="apa">APA</option><option value="mla">MLA</option><option value="chicago">Chicago</option><option value="bibtex">BibTeX</option>
              </select>
            </div>
            {missing.length > 0 && <p className="mb-2 flex gap-1.5 rounded-lg bg-amber-soft p-2 text-xs text-amber"><AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />Incomplete citation — missing {missing.join(", ")}. Placeholders are shown in brackets; edit details to fix.</p>}
            <p className={cn("rounded-lg bg-paper p-3 text-xs leading-relaxed text-ink-2", style === "bibtex" ? "whitespace-pre-wrap font-mono" : "font-serif")}>{citation}</p>
            <Button size="sm" className="mt-2 w-full" onClick={() => navigator.clipboard.writeText(citation).then(() => toast("Citation copied"), () => toast("Couldn't access clipboard", "error"))}><Copy className="size-3.5" aria-hidden />Copy citation</Button>
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Bell className="size-3.5" aria-hidden />Reminders</h2>
            <ul className="mb-2 space-y-1.5">
              {reminders.map((r) => (
                <li key={r.id} className="flex items-start gap-2 text-xs">
                  <input type="checkbox" checked={r.done} onChange={() => safe(() => upsertReminder({ ...r, done: !r.done }))} aria-label={`Done: ${r.text}`} className="mt-0.5 accent-[var(--accent)]" />
                  <span className={cn("flex-1", r.done && "line-through text-ink-3")}>{r.text}<br /><span className="text-ink-3">{new Date(r.due).toLocaleDateString()}</span></span>
                  <button onClick={() => safe(() => deleteReminder(r.id))} aria-label="Delete reminder" className="text-ink-3 hover:text-rose"><X className="size-3" /></button>
                </li>
              ))}
            </ul>
            {ent.customReminders ? (
              <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (!remText.trim() || !remDate) return; safe(() => upsertReminder({ paperId: paper.id, text: remText.trim(), due: new Date(remDate + "T09:00").toISOString() }), "Reminder set").then(() => { setRemText(""); setRemDate(""); }); }}>
                <input value={remText} onChange={(e) => setRemText(e.target.value)} placeholder="Remind me to…" aria-label="Reminder text" className={cn(inputCls, "h-8 text-xs")} />
                <div className="flex gap-2"><input type="date" value={remDate} onChange={(e) => setRemDate(e.target.value)} aria-label="Reminder date" className={cn(inputCls, "h-8 text-xs")} /><Button size="sm" type="submit">Set</Button></div>
                {mode === "demo" && <p className="text-[11px] text-ink-3">Demo reminders appear on the dashboard; no notifications are sent.</p>}
              </form>
            ) : <p className="text-xs text-ink-3">Custom reminders are part of <Link href="/app/plans" className="text-accent underline">Premium</Link>.</p>}
          </Card>

          {related.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-2 text-sm font-semibold">Related in your library</h2>
              <ul className="space-y-2">{related.map((p) => <li key={p.id}><Link href={`/app/papers/${p.id}`} className="line-clamp-2 text-sm hover:text-accent">{p.title}</Link></li>)}</ul>
            </Card>
          )}

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Activity</h2>
            <ol className="space-y-2 border-l border-line pl-3">
              {activity.map((a) => <li key={a.id} className="text-xs text-ink-2">{a.message}<br /><span className="text-ink-3">{relTime(a.at)}</span></li>)}
              <li className="text-xs text-ink-3">Added {relTime(paper.addedAt)}</li>
            </ol>
          </Card>
        </aside>
      </div>

      <Dialog open={edit} onClose={() => setEdit(false)} title="Edit paper details" wide>
        {draft && <PaperForm value={draft} onChange={setDraft} errors={errors} submitLabel="Save changes" onSubmit={() => {
          const e = validateDraft(draft); setErrors(e); if (Object.keys(e).length) return;
          safe(() => updatePapers([paper.id], draftToPaper(draft), `Edited details of “${draft.title}”`), "Details saved").then(() => setEdit(false));
        }} />}
      </Dialog>
      <Dialog open={confirmDel} onClose={() => setConfirmDel(false)} title="Delete this paper?" description="Its notes, tasks and any attached PDF will be removed. Collections keep their other papers. This can't be undone.">
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmDel(false)}>Keep paper</Button><Button variant="danger" onClick={() => safe(async () => { await deletePapers([paper.id]); router.push("/app/library"); }, "Paper deleted")}>Delete permanently</Button></div>
      </Dialog>
    </article>
  );
}
