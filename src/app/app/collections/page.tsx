"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FolderPlus, FolderOpen, Folder as FolderIcon, Users, Mail, Search, X, ChevronDown, MoreHorizontal, Plus, Pencil, Trash2, FolderInput, CalendarRange } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/shell";
import { Button, Card, Dialog, EmptyState, Menu, MenuItem, ProgressBar, StatusPill, inputCls, useToast } from "@/components/ui";
import { CollectionDialog } from "@/components/collection-dialog";
import { FolderDialog } from "@/components/folder-dialog";
import { authorLine, cn } from "@/lib/util";
import { spring, stagger } from "@/lib/motion";
import type { Collection, Folder, Paper } from "@/lib/types";

type DateField = "year" | "added";

function CollectionCard({ c, onMove }: { c: Collection; onMove: (c: Collection) => void }) {
  const { ws } = useStore();
  const papers = ws.papers.filter((p) => c.paperIds.includes(p.id));
  const read = papers.filter((p) => p.status === "read").length;
  const target = c.goal ?? papers.length;
  return (
    <motion.li layout layoutId={`col-${c.id}`} variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }} transition={spring.soft} className="relative">
      <Link href={`/app/collections/${c.id}`} className="block h-full rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
        <div className="mb-3 flex items-center justify-between pr-8"><span className="h-1.5 w-10 rounded-full" style={{ background: c.color }} aria-hidden />{c.shared && <span className="inline-flex items-center gap-1 text-xs text-ink-3"><Users className="size-3.5" aria-hidden />Shared</span>}</div>
        <h3 className="font-serif text-lg font-semibold leading-snug">{c.name}</h3>
        {c.description && <p className="mt-1 line-clamp-2 text-sm text-ink-3">{c.description}</p>}
        <div className="mt-4 flex items-center justify-between text-xs text-ink-2"><span>{papers.length} papers</span><span>{read} of {target} read{c.goal ? " (goal)" : ""}</span></div>
        <div className="mt-1.5"><ProgressBar value={target ? Math.min(100, Math.round((read / target) * 100)) : 0} label={`${c.name} progress`} /></div>
      </Link>
      <div className="absolute right-3 top-3">
        <Button size="sm" variant="ghost" className="h-7 px-1.5" aria-label={`Move ${c.name} to a folder`} title="Move to folder" onClick={() => onMove(c)}><FolderInput className="size-4" /></Button>
      </div>
    </motion.li>
  );
}

function FolderSection({ folder, cols, onNew, onMove, onEdit, onDelete }: { folder: Folder | null; cols: Collection[]; onNew: () => void; onMove: (c: Collection) => void; onEdit?: () => void; onDelete?: () => void }) {
  const [open, setOpen] = useState(true);
  const Icon = open ? FolderOpen : FolderIcon;
  return (
    <section aria-labelledby={`fold-${folder?.id ?? "none"}`} className="rounded-2xl border border-line bg-stone/40 p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-stone">
          <ChevronDown className={cn("size-4 shrink-0 text-ink-3 transition-transform", !open && "-rotate-90")} aria-hidden />
          <Icon className="size-5 shrink-0" style={{ color: folder?.color ?? "var(--ink-3)" }} aria-hidden />
          <h2 id={`fold-${folder?.id ?? "none"}`} className="truncate font-serif text-lg font-semibold">{folder?.name ?? "Not in a folder"}</h2>
          <span className="shrink-0 text-xs text-ink-3">{cols.length} collection{cols.length === 1 ? "" : "s"}</span>
        </button>
        <Button size="sm" variant="ghost" onClick={onNew} aria-label={`New collection in ${folder?.name ?? "no folder"}`}><Plus className="size-4" aria-hidden /><span className="hidden sm:inline">Collection</span></Button>
        {folder && (
          <Menu label={`${folder.name} options`} trigger={(t) => <Button size="sm" variant="ghost" className="px-2" aria-label={`${folder.name} options`} {...t}><MoreHorizontal className="size-4" /></Button>}>
            {(close) => <>
              <MenuItem onClick={() => { close(); onEdit?.(); }}><Pencil className="size-3.5" />Rename folder</MenuItem>
              <MenuItem danger onClick={() => { close(); onDelete?.(); }}><Trash2 className="size-3.5" />Delete folder</MenuItem>
            </>}
          </Menu>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            {cols.length === 0 ? (
              <button onClick={onNew} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-4 py-8 text-sm text-ink-3 hover:border-accent hover:text-accent"><Plus className="size-4" aria-hidden />Add a collection to this folder</button>
            ) : (
              <motion.ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: stagger } } }}>
                {cols.map((c) => <CollectionCard key={c.id} c={c} onMove={onMove} />)}
              </motion.ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function PaperSearch() {
  const { ws } = useStore();
  const [q, setQ] = useState("");
  const [field, setField] = useState<DateField>("year");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [scope, setScope] = useState<"collections" | "all">("collections");
  const active = q.trim() || from || to;

  const inCollections = useMemo(() => {
    const m = new Map<string, Collection[]>();
    ws.collections.forEach((c) => c.paperIds.forEach((id) => m.set(id, [...(m.get(id) ?? []), c])));
    return m;
  }, [ws.collections]);

  const results = useMemo(() => {
    if (!active) return [];
    const t = q.trim().toLowerCase();
    return ws.papers.filter((p: Paper) => {
      if (scope === "collections" && !inCollections.has(p.id)) return false;
      if (t && !p.title.toLowerCase().includes(t)) return false;
      if (field === "year") {
        if (from && (p.year ?? 0) < +from) return false;
        if (to && (p.year ?? 99999) > +to) return false;
        if ((from || to) && !p.year) return false;
      } else {
        const d = p.addedAt.slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    }).sort((a, b) => field === "year" ? (b.year ?? 0) - (a.year ?? 0) : b.addedAt.localeCompare(a.addedAt));
  }, [ws.papers, q, field, from, to, scope, inCollections, active]);

  const clear = () => { setQ(""); setFrom(""); setTo(""); };

  return (
    <Card className="mb-6 p-4" role="search" aria-label="Search papers in collections">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search papers by name…" aria-label="Paper name" className={cn(inputCls, "h-10 pl-9")} />
        </div>
        <div className="flex items-center gap-2">
          <CalendarRange className="size-4 shrink-0 text-ink-3" aria-hidden />
          <label htmlFor="dfield" className="sr-only">Date type</label>
          <select id="dfield" value={field} onChange={(e) => { setField(e.target.value as DateField); setFrom(""); setTo(""); }} className={cn(inputCls.replace("w-full ", ""), "h-10 w-auto")}>
            <option value="year">Published</option><option value="added">Date added</option>
          </select>
          {field === "year" ? <>
            <input type="number" inputMode="numeric" min={1000} max={2100} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" aria-label="Published from year" className={cn(inputCls.replace("w-full ", ""), "h-10 w-20")} />
            <span className="text-ink-3" aria-hidden>–</span>
            <input type="number" inputMode="numeric" min={1000} max={2100} value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" aria-label="Published to year" className={cn(inputCls.replace("w-full ", ""), "h-10 w-20")} />
          </> : <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Added from date" className={cn(inputCls.replace("w-full ", ""), "h-10 w-36")} />
            <span className="text-ink-3" aria-hidden>–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Added to date" className={cn(inputCls.replace("w-full ", ""), "h-10 w-36")} />
          </>}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="scope" className="sr-only">Search in</label>
          <select id="scope" value={scope} onChange={(e) => setScope(e.target.value as "collections")} className={cn(inputCls.replace("w-full ", ""), "h-10 w-auto")}>
            <option value="collections">In collections</option><option value="all">Whole library</option>
          </select>
          {active && <Button variant="ghost" onClick={clear} aria-label="Clear search"><X className="size-4" /></Button>}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {active && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="mt-4 text-xs text-ink-3" aria-live="polite">{results.length} paper{results.length === 1 ? "" : "s"} found{field === "year" && (from || to) ? " · papers without a year are hidden" : ""}</p>
            {results.length === 0 ? <p className="py-6 text-center text-sm text-ink-3">No papers match. Try a wider date range or {scope === "collections" ? "search the whole library" : "a different name"}.</p> : (
              <ul className="mt-2 max-h-[45vh] divide-y divide-line overflow-y-auto rounded-xl border border-line">
                {results.map((p) => {
                  const cols = inCollections.get(p.id) ?? [];
                  return (
                    <li key={p.id} className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <Link href={`/app/papers/${p.id}`} className="line-clamp-1 font-medium hover:text-accent">{p.title}</Link>
                        <p className="text-xs text-ink-3">{authorLine(p.authors, 2)} · Published {p.year ?? "n.d."} · Added {new Date(p.addedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {cols.length ? cols.map((c) => <Link key={c.id} href={`/app/collections/${c.id}`} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] hover:border-ink-3"><span className="size-1.5 rounded-full" style={{ background: c.color }} aria-hidden />{c.name}</Link>) : <span className="text-[11px] text-ink-3">Not in a collection</span>}
                        <StatusPill status={p.status} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function Inner() {
  const { ws, ent, respondInvite, deleteFolder, moveCollection } = useStore();
  const sp = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [newCol, setNewCol] = useState<{ open: boolean; folderId: string | null }>({ open: false, folderId: null });
  const [folderDlg, setFolderDlg] = useState<{ open: boolean; existing?: Folder }>({ open: false });
  const [delFolder, setDelFolder] = useState<Folder | null>(null);
  const [moving, setMoving] = useState<Collection | null>(null);
  useEffect(() => { if (sp.get("new")) { setNewCol({ open: true, folderId: null }); router.replace("/app/collections"); } }, [sp, router]);
  const pending = ws.invitations.filter((i) => i.status === "pending");
  const loose = ws.collections.filter((c) => !c.folderId || !ws.folders.some((f) => f.id === c.folderId));

  return (
    <div>
      <PageHeader step="collections" title="Collections & projects" description={`${ws.folders.length} folder${ws.folders.length === 1 ? "" : "s"} · ${ws.collections.length}${ent.maxCollections ? ` of ${ent.maxCollections}` : ""} collections`}
        actions={<>
          <Button onClick={() => setFolderDlg({ open: true })}><FolderPlus className="size-4" aria-hidden />New project folder</Button>
          <Button variant="primary" onClick={() => setNewCol({ open: true, folderId: null })}><Plus className="size-4" aria-hidden />New collection</Button>
        </>} />

      <PaperSearch />

      {pending.length > 0 && (
        <Card className="mb-6 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Mail className="size-4" aria-hidden />Invitations</h2>
          <ul className="space-y-2">{pending.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-paper p-3 text-sm">
              <span><strong>{i.from}</strong> invited you to <strong>{i.collectionName}</strong></span>
              <span className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => respondInvite(i.id, false).then(() => toast("Invitation declined"), (e) => toast(e.message, "error"))}>Decline</Button>
                <Button size="sm" variant="primary" onClick={() => respondInvite(i.id, true).then(() => toast("Invitation accepted"), (e) => toast(e.message, "error"))}>Accept</Button>
              </span>
            </li>))}
          </ul>
        </Card>
      )}

      {ws.collections.length === 0 && ws.folders.length === 0 ? (
        <EmptyState title="No collections yet" body="Create a project folder for a thesis or course, then add collections inside it." action={<div className="flex gap-2"><Button onClick={() => setFolderDlg({ open: true })}><FolderPlus className="size-4" />New folder</Button><Button variant="primary" onClick={() => setNewCol({ open: true, folderId: null })}>New collection</Button></div>} />
      ) : (
        <div className="space-y-5">
          {ws.folders.map((f) => (
            <FolderSection key={f.id} folder={f} cols={ws.collections.filter((c) => c.folderId === f.id)}
              onNew={() => setNewCol({ open: true, folderId: f.id })} onMove={setMoving}
              onEdit={() => setFolderDlg({ open: true, existing: f })} onDelete={() => setDelFolder(f)} />
          ))}
          {(loose.length > 0 || ws.folders.length === 0) && <FolderSection folder={null} cols={loose} onNew={() => setNewCol({ open: true, folderId: null })} onMove={setMoving} />}
        </div>
      )}

      <CollectionDialog open={newCol.open} defaultFolderId={newCol.folderId} onClose={() => setNewCol({ open: false, folderId: null })} onSaved={(c) => router.push(`/app/collections/${c.id}`)} />
      <FolderDialog open={folderDlg.open} existing={folderDlg.existing} onClose={() => setFolderDlg({ open: false })} />

      <Dialog open={!!delFolder} onClose={() => setDelFolder(null)} title={`Delete folder “${delFolder?.name}”?`} description="The collections inside are kept and moved to “Not in a folder”. No papers are deleted.">
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDelFolder(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { const f = delFolder!; setDelFolder(null); deleteFolder(f.id).then(() => toast("Folder deleted — its collections were kept"), (e) => toast(e.message, "error")); }}>Delete folder</Button></div>
      </Dialog>

      <Dialog open={!!moving} onClose={() => setMoving(null)} title={`Move “${moving?.name}”`} description="Choose a project folder for this collection.">
        <ul className="space-y-1">
          {[{ id: null as string | null, name: "Not in a folder", color: "var(--ink-3)" }, ...ws.folders].map((f) => {
            const current = (moving?.folderId ?? null) === f.id;
            return (
              <li key={f.id ?? "none"}>
                <button disabled={current} onClick={() => { const c = moving!; setMoving(null); moveCollection(c.id, f.id).then(() => toast(`Moved to ${f.name}`), (e) => toast(e.message, "error")); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-stone disabled:opacity-60">
                  <FolderIcon className="size-4" style={{ color: f.color }} aria-hidden /><span className="flex-1">{f.name}</span>{current && <span className="text-xs text-ink-3">Current</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 border-t border-line pt-3"><Button size="sm" variant="ghost" onClick={() => { setMoving(null); setFolderDlg({ open: true }); }}><FolderPlus className="size-4" aria-hidden />New folder</Button></div>
      </Dialog>
    </div>
  );
}
export default function Page() { return <Suspense><Inner /></Suspense>; }
