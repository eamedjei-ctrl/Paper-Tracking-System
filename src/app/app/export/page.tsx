"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Download, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/shell";
import { Button, Card, inputCls, useToast } from "@/components/ui";
import { formatCitation, missingCitationFields, toBibtex, toRis, type CitationStyle } from "@/lib/citations";
import { STATUS_LABEL, type ReadingStatus } from "@/lib/types";
import { cn, download } from "@/lib/util";

export default function ExportPage() {
  const { ws } = useStore();
  const toast = useToast();
  const [style, setStyle] = useState<CitationStyle>("apa");
  const [scope, setScope] = useState<string>("all");
  const [status, setStatus] = useState<ReadingStatus | "">("");
  const papers = useMemo(() => {
    const col = ws.collections.find((c) => c.id === scope);
    return ws.papers.filter((p) => (!col || col.paperIds.includes(p.id)) && (!status || p.status === status));
  }, [ws, scope, status]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const chosen = papers.filter((p) => !excluded.has(p.id));
  const entries = chosen.map((p) => formatCitation(p, style));
  const text = style === "bibtex" ? entries.join("\n\n") : [...entries].sort((a, b) => a.localeCompare(b)).join("\n\n");
  const incomplete = chosen.filter((p) => missingCitationFields(p).length);

  return (
    <div>
      <PageHeader step="export" title="Cite & export" description="Build a bibliography from your library, then copy or download it." />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <div><label htmlFor="sc" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-3">Papers from</label>
              <select id="sc" value={scope} onChange={(e) => { setScope(e.target.value); setExcluded(new Set()); }} className={inputCls}><option value="all">Whole library</option>{ws.collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label htmlFor="st" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-3">Status</label>
              <select id="st" value={status} onChange={(e) => setStatus(e.target.value as ReadingStatus | "")} className={inputCls}><option value="">Any status</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <fieldset><legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-3">Style</legend>
              <div className="grid grid-cols-4 gap-1 rounded-xl bg-stone p-1">{(["apa", "mla", "chicago", "bibtex"] as CitationStyle[]).map((s) => <button key={s} aria-pressed={style === s} onClick={() => setStyle(s)} className={cn("rounded-lg py-1.5 text-xs font-semibold uppercase", style === s ? "bg-card shadow-sm" : "text-ink-3")}>{s === "bibtex" ? "Bib" : s}</button>)}</div>
            </fieldset>
          </Card>
          <Card className="max-h-[50vh] overflow-y-auto p-2">
            <p className="px-2 py-1 text-xs text-ink-3">{chosen.length} of {papers.length} included</p>
            <ul>{papers.map((p) => (
              <li key={p.id}><label className="flex cursor-pointer gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-stone/60">
                <input type="checkbox" checked={!excluded.has(p.id)} onChange={() => setExcluded((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} className="mt-0.5 accent-[var(--accent)]" />
                <span className="line-clamp-2">{p.title}{missingCitationFields(p).length > 0 && <AlertTriangle className="ml-1 inline size-3 text-amber" aria-label="Incomplete metadata" />}</span>
              </label></li>))}</ul>
          </Card>
        </div>
        <div>
          {incomplete.length > 0 && <p className="mb-3 flex gap-2 rounded-xl bg-amber-soft p-3 text-sm text-amber"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /><span>{incomplete.length} citation{incomplete.length > 1 ? "s are" : " is"} incomplete — missing details show in [brackets]. Fix: {incomplete.slice(0, 3).map((p, i) => <span key={p.id}>{i > 0 && ", "}<Link href={`/app/papers/${p.id}`} className="underline">{p.title.slice(0, 30)}…</Link></span>)}</span></p>}
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold">Bibliography <span className="text-sm font-normal text-ink-3">({chosen.length})</span></h2>
              <div className="flex gap-2">
                <Button size="sm" disabled={!chosen.length} onClick={() => navigator.clipboard.writeText(text).then(() => toast("Bibliography copied"), () => toast("Couldn't access clipboard", "error"))}><Copy className="size-3.5" aria-hidden />Copy</Button>
                <Button size="sm" variant="primary" disabled={!chosen.length} onClick={() => download(style === "bibtex" ? "bibliography.bib" : `bibliography-${style}.txt`, text)}><Download className="size-3.5" aria-hidden />Download</Button>
              </div>
            </div>
            {chosen.length === 0 ? <p className="py-10 text-center text-sm text-ink-3">No papers selected.</p> : (
              <div className={cn("max-h-[60vh] space-y-3 overflow-y-auto rounded-xl bg-paper p-4 text-sm leading-relaxed", style === "bibtex" ? "whitespace-pre-wrap font-mono text-xs" : "font-serif")}>
                {style === "bibtex" ? text : text.split("\n\n").map((t) => <p key={t} className="pl-6 -indent-6">{t}</p>)}
              </div>
            )}
          </Card>
          <Card className="mt-4 p-4">
            <h2 className="mb-2 text-sm font-semibold">Export everything</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => download("papertrail.bib", ws.papers.map(toBibtex).join("\n\n"))}>BibTeX</Button>
              <Button size="sm" onClick={() => download("papertrail.ris", ws.papers.map(toRis).join("\n\n"))}>RIS</Button>
              <Button size="sm" onClick={() => download("papertrail-export.json", JSON.stringify({ exportedAt: new Date().toISOString(), papers: ws.papers, collections: ws.collections, reminders: ws.reminders }, null, 2), "application/json")}>Full JSON</Button>
              <Link href="/app/settings"><Button size="sm" variant="ghost">More in Settings</Button></Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
