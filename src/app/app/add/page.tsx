"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { PenLine, Search, FileUp, Lock, AlertTriangle, Loader2, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/shell";
import { Button, Card, inputCls, useToast } from "@/components/ui";
import { PaperForm, emptyDraft, validateDraft, draftToPaper, type Draft } from "@/components/paper-form";
import { parseBibtex, parseRis, findDuplicate, type ImportRecord } from "@/lib/importers";
import { cn, authorLine } from "@/lib/util";
import { spring } from "@/lib/motion";

type Tab = "manual" | "doi" | "import";

function AddInner() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<Tab>((sp.get("tab") as Tab) || "manual");
  const tabs: { id: Tab; label: string; icon: typeof PenLine }[] = [
    { id: "manual", label: "Manual entry", icon: PenLine }, { id: "doi", label: "DOI lookup", icon: Search }, { id: "import", label: "BibTeX / RIS import", icon: FileUp },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader step="add" title="Add papers" description="Add one paper by hand or DOI, or bring in references from another tool." />
      <div role="tablist" aria-label="Add method" className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-line bg-stone/60 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)}
            className={cn("relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium", tab === id ? "text-ink" : "text-ink-3 hover:text-ink")}>
            {tab === id && <motion.span layoutId="addtab" className="absolute inset-0 rounded-lg bg-card shadow-[var(--shadow-card)]" transition={spring.snappy} />}
            <Icon className="relative size-4" aria-hidden /><span className="relative">{label}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "manual" && <Manual />}
        {tab === "doi" && <DoiLookup />}
        {tab === "import" && <Import />}
      </div>
    </div>
  );
}

function useSave() {
  const { addPaper, ws } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const save = async (d: Draft, source: "manual" | "crossref") => {
    setBusy(true);
    try {
      const p = await addPaper({ ...draftToPaper(d), metadataSource: source });
      toast("Paper added to your library");
      router.push(`/app/papers/${p.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't add paper — your entry is still here.", "error");
    } finally { setBusy(false); }
  };
  return { save, busy, ws };
}

function DuplicateWarning({ d }: { d: Draft }) {
  const { ws } = useStore();
  const dup = d.title || d.doi ? findDuplicate({ doi: d.doi, title: d.title }, ws.papers) : undefined;
  if (!dup) return null;
  return (
    <div role="alert" className="flex gap-2 rounded-xl border border-amber/30 bg-amber-soft p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />
      <p>This looks like a paper already in your library: <Link href={`/app/papers/${dup.id}`} className="font-medium underline">{dup.title}</Link>. You can still save it as a separate entry.</p>
    </div>
  );
}

function Manual() {
  const [d, setD] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const { save, busy } = useSave();
  return (
    <Card className="p-5">
      <PaperForm value={d} onChange={setD} errors={errors} busy={busy} submitLabel="Add to library" extra={<DuplicateWarning d={d} />}
        onSubmit={() => { const e = validateDraft(d); setErrors(e); if (!Object.keys(e).length) save(d, "manual"); }} />
    </Card>
  );
}

function DoiLookup() {
  const [doi, setDoi] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "found" | "error">("idle");
  const [err, setErr] = useState("");
  const [d, setD] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const { save, busy } = useSave();
  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
    if (!/^10\.\S+\/\S+$/.test(clean)) { setState("error"); setErr("That doesn't look like a DOI. DOIs start with 10. and contain a slash."); return; }
    setState("loading");
    try {
      const r = await fetch(`/api/doi?doi=${encodeURIComponent(clean)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Lookup failed");
      // Merge: fetched values only fill fields the user hasn't typed into
      setD((cur) => ({ ...cur, doi: clean, title: cur.title || j.title, authors: cur.authors || j.authors.map((a: { given: string; family: string }) => `${a.given} ${a.family}`.trim()).join(" and "), year: cur.year || (j.year ? String(j.year) : ""), venue: cur.venue || j.venue, abstract: cur.abstract || j.abstract, url: cur.url || j.url }));
      setState("found");
    } catch (e) {
      setState("error");
      setErr(`${e instanceof Error ? e.message : "Lookup failed"}. You can fill in the details manually below — the DOI has been kept.`);
      setD((cur) => ({ ...cur, doi: clean }));
    }
  };
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form onSubmit={lookup} className="flex flex-col gap-2 sm:flex-row" noValidate>
          <label htmlFor="doi" className="sr-only">DOI</label>
          <input id="doi" value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.1145/3290605.3300233 or https://doi.org/…" className={cn(inputCls, "h-10 flex-1")} />
          <Button variant="primary" type="submit" disabled={state === "loading"} className="h-10">{state === "loading" ? <><Loader2 className="size-4 animate-spin" aria-hidden />Looking up…</> : "Look up"}</Button>
        </form>
        <p className="mt-2 text-xs text-ink-3">Metadata comes from Crossref. You'll review everything before it's saved.</p>
        {state === "error" && <p role="alert" className="mt-3 flex gap-2 text-sm text-rose"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />{err}</p>}
      </Card>
      <AnimatePresence>
        {(state === "found" || state === "error") && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5">
              {state === "found" && <p className="mb-4 flex items-center gap-2 text-sm text-mint"><Check className="size-4" aria-hidden />Found it. Review and edit before saving — fields you'd already typed were kept.</p>}
              <PaperForm value={d} onChange={setD} errors={errors} busy={busy} submitLabel="Save to library" extra={<DuplicateWarning d={d} />}
                onSubmit={() => { const e = validateDraft(d); setErrors(e); if (!Object.keys(e).length) save(d, state === "found" ? "crossref" : "manual"); }} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Import() {
  const { ent, ws, importPapers } = useStore();
  const toast = useToast();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<(ImportRecord & { dup?: string })[] | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [fmt, setFmt] = useState<"bibtex" | "ris">("bibtex");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (f: File | undefined) => {
    setErr(""); setRecords(null);
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setErr("That file is larger than 5 MB. Split it into smaller exports and try again."); return; }
    const text = await f.text();
    const isRis = /\.ris$/i.test(f.name) || /^TY  - /m.test(text);
    const recs = isRis ? parseRis(text) : parseBibtex(text);
    if (!recs.length) { setErr("We couldn't find any references in that file. Check that it's a BibTeX (.bib) or RIS (.ris) export."); return; }
    const withDup = recs.map((r) => ({ ...r, dup: findDuplicate(r, ws.papers)?.title }));
    setFmt(isRis ? "ris" : "bibtex");
    setRecords(withDup);
    setChosen(new Set(withDup.map((r, i) => (r.dup ? -1 : i)).filter((i) => i >= 0)));
  };

  const doImport = async () => {
    if (!records) return;
    setBusy(true);
    try {
      const n = await importPapers(records.filter((_, i) => chosen.has(i)).map(({ dup: _d, ...r }) => r), fmt);
      toast(`Imported ${n} paper${n === 1 ? "" : "s"}`);
      router.push("/app/library?sort=added");
    } catch (e) { toast(e instanceof Error ? e.message : "Import failed", "error"); } finally { setBusy(false); }
  };

  const dupCount = useMemo(() => records?.filter((r) => r.dup).length ?? 0, [records]);

  if (!ent.bulkImport) {
    return (
      <Card className="p-8 text-center">
        <Lock className="mx-auto size-6 text-ink-3" aria-hidden />
        <h2 className="mt-3 font-serif text-lg font-semibold">Bulk import is part of Premium</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-3">On Standard you can still add papers one at a time by DOI or by hand.</p>
        <Link href="/app/plans" className="mt-4 inline-block"><Button variant="primary">See plans</Button></Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <button onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-line px-6 py-10 text-center hover:border-accent hover:bg-accent-soft/30"
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
          <FileUp className="size-7 text-accent" aria-hidden />
          <span className="mt-2 font-medium">Choose a .bib or .ris file</span>
          <span className="text-sm text-ink-3">or drop it here · up to 5 MB</span>
        </button>
        <input ref={inputRef} type="file" accept=".bib,.ris,.txt,text/plain,application/x-bibtex,application/x-research-info-systems" className="sr-only" aria-label="Reference file" onChange={(e) => onFile(e.target.files?.[0])} />
        {err && <p role="alert" className="mt-3 flex gap-2 text-sm text-rose"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />{err}</p>}
      </Card>
      {records && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
            <p className="text-sm"><strong>{records.length}</strong> references found · {dupCount > 0 && <span className="text-amber">{dupCount} likely duplicate{dupCount > 1 ? "s" : ""} unchecked</span>}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setChosen(chosen.size === records.length ? new Set() : new Set(records.map((_, i) => i)))}>{chosen.size === records.length ? "Select none" : "Select all"}</Button>
              <Button size="sm" variant="primary" disabled={!chosen.size || busy} onClick={doImport}>{busy ? "Importing…" : `Import ${chosen.size}`}</Button>
            </div>
          </div>
          <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto">
            {records.map((r, i) => (
              <li key={i} className="flex gap-3 p-3">
                <input type="checkbox" checked={chosen.has(i)} onChange={(e) => setChosen((s) => { const n = new Set(s); if (e.target.checked) n.add(i); else n.delete(i); return n; })} aria-label={`Import ${r.title}`} className="mt-1 size-4 accent-[var(--accent)]" />
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-ink-3">{authorLine(r.authors)} · {r.year ?? "n.d."}{r.venue && ` · ${r.venue}`}{r.doi && ` · ${r.doi}`}</p>
                  {r.dup && <p className="mt-1 flex items-center gap-1 text-xs text-amber"><AlertTriangle className="size-3" aria-hidden />Possible duplicate of “{r.dup}”</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default function AddPage() { return <Suspense><AddInner /></Suspense>; }
