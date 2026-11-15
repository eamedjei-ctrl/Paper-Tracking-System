"use client";
import Link from "next/link";
import { Bookmark, Trash2, Lock, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/shell";
import { Button, Card, EmptyState, useToast } from "@/components/ui";
import { PRIORITY_LABEL, STATUS_LABEL, EMPTY_FILTERS, type Paper, type SavedView } from "@/lib/types";

function count(v: SavedView, papers: Paper[], cols: { id: string; paperIds: string[] }[]) {
  const f = { ...EMPTY_FILTERS, ...v.filters };
  const col = f.collection ? cols.find((c) => c.id === f.collection) : null;
  const q = v.query.toLowerCase();
  return papers.filter((p) => (!q || [p.title, p.notes, p.abstract, ...p.tags].some((s) => s.toLowerCase().includes(q))) && (!f.status.length || f.status.includes(p.status)) && (!f.priority.length || f.priority.includes(p.priority)) && (!f.tags.length || f.tags.every((t) => p.tags.includes(t))) && (!col || col.paperIds.includes(p.id))).length;
}

function href(v: SavedView) {
  const s = new URLSearchParams();
  if (v.query) s.set("q", v.query);
  if (v.filters.status?.length) s.set("status", v.filters.status.join(","));
  if (v.filters.collection) s.set("collection", v.filters.collection);
  if (v.filters.tags?.length) s.set("tag", v.filters.tags[0]);
  return `/app/library?${s}`;
}

export default function ViewsPage() {
  const { ws, ent, deleteView } = useStore();
  const toast = useToast();
  return (
    <div>
      <PageHeader step="views" title="Saved views" description="Searches and filters you come back to, one click away." actions={<Link href="/app/library"><Button variant="primary"><Search className="size-4" aria-hidden />Build a view in Library</Button></Link>} />
      {!ent.savedSearches && <Card className="mb-6 flex items-center gap-3 p-4 text-sm"><Lock className="size-4 text-ink-3" aria-hidden />Saved views are part of Premium. <Link href="/app/plans" className="text-accent underline">See plans</Link></Card>}
      {ws.savedViews.length === 0 ? (
        <EmptyState title="No saved views yet" body="In the Library, set a search or filters, then choose “Save view”." action={<Link href="/app/library"><Button>Go to Library</Button></Link>} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {ws.savedViews.map((v) => {
            const f = { ...EMPTY_FILTERS, ...v.filters };
            const chips = [v.query && `“${v.query}”`, ...f.status.map((s) => STATUS_LABEL[s]), ...f.priority.map((p) => `${PRIORITY_LABEL[p]} priority`), ...f.tags.map((t) => `#${t}`), f.collection && ws.collections.find((c) => c.id === f.collection)?.name].filter(Boolean) as string[];
            return (
              <li key={v.id}>
                <Card className="flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="flex items-center gap-2 font-semibold"><Bookmark className="size-4 text-accent" aria-hidden />{v.name}</h2>
                    <button onClick={() => deleteView(v.id).then(() => toast("View deleted"), (e) => toast(e.message, "error"))} aria-label={`Delete ${v.name}`} className="rounded p-1 text-ink-3 hover:text-rose"><Trash2 className="size-4" /></button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">{chips.length ? chips.map((c) => <span key={c} className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">{c}</span>) : <span className="text-xs text-ink-3">All papers</span>}</div>
                  <div className="mt-auto flex items-center justify-between pt-4 text-sm"><span className="text-ink-3">{count(v, ws.papers, ws.collections)} papers match</span><Link href={href(v)} className="font-medium text-accent hover:underline">Open in Library →</Link></div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-xs text-ink-3">Tip: press ⌘K anywhere to jump straight to a paper.</p>
    </div>
  );
}
