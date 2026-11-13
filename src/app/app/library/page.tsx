"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { LayoutGrid, List, Search, SlidersHorizontal, X, Plus, Tag as TagIcon, FolderPlus, Trash2, Bookmark, Lock } from "lucide-react";
import { useStore, LimitError } from "@/lib/store";
import { PageHeader } from "@/components/shell";
import { PaperCard } from "@/components/paper-card";
import { Button, Dialog, EmptyState, Menu, MenuItem, inputCls, useToast, Card } from "@/components/ui";
import { EMPTY_FILTERS, PRIORITY_LABEL, STATUS_LABEL, type Filters, type Paper, type Priority, type ReadingStatus } from "@/lib/types";
import { cn } from "@/lib/util";
import { spring } from "@/lib/motion";

type Sort = "added" | "title" | "year" | "priority";
const PRIO_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const PAGE = 24;

function matches(p: Paper, q: string) {
  if (!q) return true;
  const t = q.toLowerCase();
  return [p.title, p.doi, p.venue, p.abstract, p.notes, p.summary, ...p.tags, ...p.authors.map((a) => `${a.given} ${a.family}`)].some((s) => s.toLowerCase().includes(t));
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <motion.span layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={spring.snappy}
      className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft py-0.5 pl-2.5 pr-1 text-xs font-medium text-accent">
      {children}
      <button onClick={onRemove} aria-label={`Remove filter ${typeof children === "string" ? children : ""}`} className="rounded-full p-0.5 hover:bg-accent/15"><X className="size-3" /></button>
    </motion.span>
  );
}

function toggle<T>(arr: T[], v: T) { return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]; }

function LibraryInner() {
  const { ws, ent, setStatus, updatePapers, deletePapers, setCollectionPapers, saveView, deleteView } = useStore();
  const sp = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [filters, setFilters] = useState<Filters>(() => ({
    ...EMPTY_FILTERS,
    status: (sp.get("status")?.split(",").filter(Boolean) as ReadingStatus[]) ?? [],
    collection: sp.get("collection"),
    tags: sp.get("tag") ? [sp.get("tag")!] : [],
  }));
  const [sort, setSort] = useState<Sort>((sp.get("sort") as Sort) || "added");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [panel, setPanel] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);
  const [tagDialog, setTagDialog] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [viewName, setViewName] = useState("");
  const [saveDialog, setSaveDialog] = useState(false);

  useEffect(() => { const v = localStorage.getItem("pt-view"); if (v === "list" || v === "grid") setView(v); }, []);
  useEffect(() => { localStorage.setItem("pt-view", view); }, [view]);
  useEffect(() => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (filters.status.length) s.set("status", filters.status.join(","));
    if (filters.collection) s.set("collection", filters.collection);
    if (sort !== "added") s.set("sort", sort);
    router.replace(`/app/library${s.size ? "?" + s : ""}`, { scroll: false });
  }, [q, filters.status, filters.collection, sort, router]);

  const allTags = useMemo(() => [...new Set(ws.papers.flatMap((p) => p.tags))].sort(), [ws.papers]);
  const years = ws.papers.map((p) => p.year).filter(Boolean) as number[];

  const list = useMemo(() => {
    const col = filters.collection ? ws.collections.find((c) => c.id === filters.collection) : null;
    const r = ws.papers.filter((p) =>
      matches(p, q) &&
      (!filters.status.length || filters.status.includes(p.status)) &&
      (!filters.priority.length || filters.priority.includes(p.priority)) &&
      (!filters.tags.length || filters.tags.every((t) => p.tags.includes(t))) &&
      (!col || col.paperIds.includes(p.id)) &&
      (!filters.yearFrom || (p.year ?? 0) >= filters.yearFrom) &&
      (!filters.yearTo || (p.year ?? 9999) <= filters.yearTo));
    return r.sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "year" ? (b.year ?? 0) - (a.year ?? 0) : sort === "priority" ? PRIO_RANK[a.priority] - PRIO_RANK[b.priority] : b.addedAt.localeCompare(a.addedAt));
  }, [ws.papers, ws.collections, q, filters, sort]);

  const activeCount = filters.status.length + filters.priority.length + filters.tags.length + (filters.collection ? 1 : 0) + (filters.yearFrom ? 1 : 0) + (filters.yearTo ? 1 : 0);
  const clearAll = () => { setFilters(EMPTY_FILTERS); setQ(""); };
  const sel = [...selected];
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast(msg); setSelected(new Set()); } catch (e) { toast(e instanceof Error ? e.message : "Something went wrong", "error"); }
  };

  return (
    <div>
      <PageHeader title="Library" description={`${ws.papers.length} papers${list.length !== ws.papers.length ? ` · ${list.length} shown` : ""}`}
        actions={<Link href="/app/add"><Button variant="primary"><Plus className="size-4" aria-hidden />Add paper</Button></Link>} />

      {/* Search + controls */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Search title, author, DOI, venue, abstract, notes or tag" aria-label="Search library" className={cn(inputCls, "h-10 pl-9")} />
          {q && <button onClick={() => setQ("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 hover:text-ink"><X className="size-4" /></button>}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPanel((o) => !o)} aria-expanded={panel} aria-controls="filters" className="flex-1 sm:flex-none">
            <SlidersHorizontal className="size-4" aria-hidden />Filters{activeCount > 0 && <span className="rounded-full bg-accent px-1.5 text-[11px] text-accent-ink">{activeCount}</span>}
          </Button>
          <label className="sr-only" htmlFor="sort">Sort by</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={cn(inputCls, "h-10 w-auto flex-1 sm:flex-none")}>
            <option value="added">Date added</option><option value="title">Title</option><option value="year">Publication year</option><option value="priority">Priority</option>
          </select>
          <div className="flex rounded-[10px] border border-line bg-card p-0.5" role="group" aria-label="View mode">
            {(["grid", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} aria-label={`${v} view`} className={cn("relative rounded-lg px-2.5", view === v ? "text-accent" : "text-ink-3 hover:text-ink")}>
                {view === v && <motion.span layoutId="viewmode" className="absolute inset-0 rounded-lg bg-accent-soft" transition={spring.snappy} />}
                {v === "grid" ? <LayoutGrid className="relative size-4" /> : <List className="relative size-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {panel && (
          <motion.div id="filters" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <Card className="mt-3 grid gap-5 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <fieldset><legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Status</legend>
                <div className="flex flex-wrap gap-1.5">{(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((s) => (
                  <button key={s} aria-pressed={filters.status.includes(s)} onClick={() => setFilters((f) => ({ ...f, status: toggle(f.status, s) }))} className={cn("rounded-full border px-2.5 py-1 text-xs", filters.status.includes(s) ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-ink-3")}>{STATUS_LABEL[s]}</button>
                ))}</div>
              </fieldset>
              <fieldset><legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Priority</legend>
                <div className="flex flex-wrap gap-1.5">{(["high", "medium", "low"] as Priority[]).map((s) => (
                  <button key={s} aria-pressed={filters.priority.includes(s)} onClick={() => setFilters((f) => ({ ...f, priority: toggle(f.priority, s) }))} className={cn("rounded-full border px-2.5 py-1 text-xs", filters.priority.includes(s) ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-ink-3")}>{PRIORITY_LABEL[s]}</button>
                ))}</div>
              </fieldset>
              <div><label htmlFor="fcol" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-3">Collection</label>
                <select id="fcol" value={filters.collection ?? ""} onChange={(e) => setFilters((f) => ({ ...f, collection: e.target.value || null }))} className={inputCls}>
                  <option value="">Any collection</option>{ws.collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <fieldset>
                <legend className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-3">Year range {!ent.advancedFilters && <Lock className="size-3" aria-label="Premium" />}</legend>
                <div className="flex items-center gap-2">
                  <input type="number" disabled={!ent.advancedFilters} aria-label="From year" placeholder={String(Math.min(...years, 2000))} value={filters.yearFrom ?? ""} onChange={(e) => setFilters((f) => ({ ...f, yearFrom: e.target.value ? +e.target.value : null }))} className={inputCls} />
                  <span className="text-ink-3">–</span>
                  <input type="number" disabled={!ent.advancedFilters} aria-label="To year" placeholder={String(Math.max(...years, 2025))} value={filters.yearTo ?? ""} onChange={(e) => setFilters((f) => ({ ...f, yearTo: e.target.value ? +e.target.value : null }))} className={inputCls} />
                </div>
                {!ent.advancedFilters && <p className="mt-1 text-xs text-ink-3">Year filters are part of <Link className="text-accent underline" href="/app/plans">Premium</Link>.</p>}
              </fieldset>
              <fieldset className="sm:col-span-2 lg:col-span-4"><legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Tags</legend>
                <div className="flex flex-wrap gap-1.5">{allTags.length === 0 ? <span className="text-xs text-ink-3">No tags yet.</span> : allTags.map((t) => (
                  <button key={t} aria-pressed={filters.tags.includes(t)} onClick={() => setFilters((f) => ({ ...f, tags: toggle(f.tags, t) }))} className={cn("rounded-md border px-2 py-0.5 text-xs", filters.tags.includes(t) ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-ink-3")}>#{t}</button>
                ))}</div>
              </fieldset>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved views */}
      {(ws.savedViews.length > 0 || activeCount > 0 || q) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AnimatePresence mode="popLayout">
            {filters.status.map((s) => <Chip key={"s" + s} onRemove={() => setFilters((f) => ({ ...f, status: f.status.filter((x) => x !== s) }))}>{STATUS_LABEL[s]}</Chip>)}
            {filters.priority.map((s) => <Chip key={"p" + s} onRemove={() => setFilters((f) => ({ ...f, priority: f.priority.filter((x) => x !== s) }))}>{PRIORITY_LABEL[s]} priority</Chip>)}
            {filters.tags.map((s) => <Chip key={"t" + s} onRemove={() => setFilters((f) => ({ ...f, tags: f.tags.filter((x) => x !== s) }))}>#{s}</Chip>)}
            {filters.collection && <Chip key="col" onRemove={() => setFilters((f) => ({ ...f, collection: null }))}>{ws.collections.find((c) => c.id === filters.collection)?.name ?? "Collection"}</Chip>}
            {(filters.yearFrom || filters.yearTo) && <Chip key="yr" onRemove={() => setFilters((f) => ({ ...f, yearFrom: null, yearTo: null }))}>{filters.yearFrom ?? "…"}–{filters.yearTo ?? "…"}</Chip>}
          </AnimatePresence>
          {(activeCount > 0 || q) && <>
            <button onClick={clearAll} className="text-xs font-medium text-ink-3 underline-offset-2 hover:text-ink hover:underline">Clear all</button>
            <button onClick={() => ent.savedSearches ? setSaveDialog(true) : toast("Saved searches are a Premium feature", "info")} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"><Bookmark className="size-3" aria-hidden />Save view{!ent.savedSearches && <Lock className="size-3" aria-label="Premium" />}</button>
          </>}
          {ws.savedViews.length > 0 && <span className="mx-1 h-4 w-px bg-line" aria-hidden />}
          {ws.savedViews.map((v) => (
            <span key={v.id} className="inline-flex items-center rounded-full border border-line bg-card text-xs">
              <button className="py-0.5 pl-2.5 pr-1 hover:text-accent" onClick={() => { setFilters({ ...EMPTY_FILTERS, ...v.filters }); setQ(v.query); }}><Bookmark className="mr-1 inline size-3" aria-hidden />{v.name}</button>
              <button className="rounded-full p-1 text-ink-3 hover:text-rose" aria-label={`Delete saved view ${v.name}`} onClick={() => deleteView(v.id)}><X className="size-3" /></button>
            </span>
          ))}
        </div>
      )}

      {/* Bulk bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={spring.snappy}
            className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-line bg-card p-2 pl-4 shadow-[var(--shadow-lift)] lg:bottom-6" role="region" aria-label="Bulk actions">
            <span className="mr-auto text-sm font-medium">{selected.size} selected</span>
            <Menu label="Set status" trigger={(t) => <Button size="sm" {...t}>Set status</Button>}>
              {(close) => (Object.keys(STATUS_LABEL) as ReadingStatus[]).map((s) => <MenuItem key={s} onClick={() => { close(); run(() => Promise.all(sel.map((id) => setStatus(id, s))), `Marked ${sel.length} as ${STATUS_LABEL[s]}`); }}>{STATUS_LABEL[s]}</MenuItem>)}
            </Menu>
            <Button size="sm" onClick={() => setTagDialog(true)}><TagIcon className="size-3.5" aria-hidden />Tag</Button>
            <Menu label="Add to collection" trigger={(t) => <Button size="sm" {...t}><FolderPlus className="size-3.5" aria-hidden />Collect</Button>}>
              {(close) => ws.collections.length ? ws.collections.map((c) => <MenuItem key={c.id} onClick={() => { close(); run(() => setCollectionPapers(c.id, sel, []), `Added to ${c.name}`); }}><span className="size-2 rounded-full" style={{ background: c.color }} />{c.name}</MenuItem>) : <p className="p-2 text-xs text-ink-3">No collections yet.</p>}
            </Menu>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDel(true)} aria-label="Delete selected"><Trash2 className="size-3.5 text-rose" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Cancel</Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5">
        {ws.papers.length === 0 ? (
          <EmptyState title="No papers yet" body="Start by adding a paper by DOI or importing your existing references." action={<Link href="/app/add"><Button variant="primary"><Plus className="size-4" />Add a paper</Button></Link>} />
        ) : list.length === 0 ? (
          <EmptyState title="No papers match" body="Try a different search term or remove some filters." action={<Button onClick={clearAll}>Clear search and filters</Button>} />
        ) : (
          <>
            <div className="mb-2 flex items-center gap-3 text-xs text-ink-3">
              <button className="hover:text-ink" onClick={() => setSelected(selected.size === list.length ? new Set() : new Set(list.map((p) => p.id)))}>{selected.size === list.length ? "Deselect all" : `Select all ${list.length}`}</button>
            </div>
            <LayoutGroup>
              <motion.ul layout className={view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "overflow-hidden rounded-[var(--radius-card)] border border-line bg-card"}>
                <AnimatePresence mode="popLayout">
                  {list.slice(0, limit).map((p) => <PaperCard key={p.id} p={p} view={view} selected={selected.has(p.id)} onSelect={(v) => setSelected((s) => { const n = new Set(s); if (v) n.add(p.id); else n.delete(p.id); return n; })} />)}
                </AnimatePresence>
              </motion.ul>
            </LayoutGroup>
            {list.length > limit && <div className="mt-6 text-center"><Button onClick={() => setLimit((l) => l + PAGE)}>Show more ({list.length - limit} remaining)</Button></div>}
          </>
        )}
      </div>

      <Dialog open={tagDialog} onClose={() => setTagDialog(false)} title={`Tag ${selected.size} papers`}>
        <form onSubmit={(e) => { e.preventDefault(); const t = newTag.trim().toLowerCase().replace(/\s+/g, "-"); if (!t) return; setTagDialog(false); setNewTag("");
          run(async () => { for (const p of ws.papers.filter((p) => selected.has(p.id) && !p.tags.includes(t))) await updatePapers([p.id], { tags: [...p.tags, t] }); }, `Tagged with #${t}`); }} className="space-y-4">
          <input list="alltags" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="e.g. methods" aria-label="Tag name" className={inputCls} />
          <datalist id="alltags">{allTags.map((t) => <option key={t} value={t} />)}</datalist>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setTagDialog(false)}>Cancel</Button><Button variant="primary" type="submit">Apply tag</Button></div>
        </form>
      </Dialog>

      <Dialog open={confirmDel} onClose={() => setConfirmDel(false)} title={`Delete ${selected.size} paper${selected.size > 1 ? "s" : ""}?`} description="This removes the papers, their notes and attached PDFs. It cannot be undone.">
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmDel(false)}>Keep papers</Button><Button variant="danger" onClick={() => { setConfirmDel(false); run(() => deletePapers(sel), `Deleted ${sel.length} paper${sel.length > 1 ? "s" : ""}`); }}>Delete permanently</Button></div>
      </Dialog>

      <Dialog open={saveDialog} onClose={() => setSaveDialog(false)} title="Save this view" description="Saved views keep your current search and filters.">
        <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (!viewName.trim()) return; try { await saveView(viewName.trim(), q, filters); toast("View saved"); setSaveDialog(false); setViewName(""); } catch (err) { toast(err instanceof LimitError || err instanceof Error ? err.message : "Couldn't save", "error"); } }}>
          <input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="e.g. Methods papers to read" aria-label="View name" className={inputCls} />
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setSaveDialog(false)}>Cancel</Button><Button variant="primary" type="submit">Save view</Button></div>
        </form>
      </Dialog>
    </div>
  );
}

export default function LibraryPage() {
  return <Suspense><LibraryInner /></Suspense>;
}
