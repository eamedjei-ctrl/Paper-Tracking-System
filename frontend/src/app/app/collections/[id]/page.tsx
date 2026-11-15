"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, Reorder, LayoutGroup } from "motion/react";
import { ArrowLeft, Pencil, Trash2, Plus, Users, GripVertical, X, UserPlus, Search, Folder } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/shell";
import { Button, Card, Dialog, EmptyState, ProgressBar, StatusPill, inputCls, useToast } from "@/components/ui";
import { CollectionDialog } from "@/components/collection-dialog";
import { authorLine, cn } from "@/lib/util";

export default function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { ws, mode, deleteCollection, setCollectionPapers, invite } = useStore();
  const router = useRouter();
  const toast = useToast();
  const c = ws.collections.find((x) => x.id === id);
  const [edit, setEdit] = useState(false);
  const [del, setDel] = useState(false);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [email, setEmail] = useState(""); const [role, setRole] = useState<"editor" | "viewer">("editor"); const [inviteErr, setInviteErr] = useState("");
  const [order, setOrder] = useState<string[] | null>(null);
  const [fq, setFq] = useState(""); const [yFrom, setYFrom] = useState(""); const [yTo, setYTo] = useState("");

  if (!c) return <EmptyState title="Collection not found" body="It may have been deleted." action={<Link href="/app/collections"><Button>All collections</Button></Link>} />;
  const ids = order && order.length === c.paperIds.length && order.every((x) => c.paperIds.includes(x)) ? order : c.paperIds;
  const allPapers = ids.map((pid) => ws.papers.find((p) => p.id === pid)).filter((p): p is NonNullable<typeof p> => !!p);
  const filtering = !!(fq.trim() || yFrom || yTo);
  const papers = allPapers.filter((p) => (!fq.trim() || p.title.toLowerCase().includes(fq.trim().toLowerCase())) && (!yFrom || (p.year ?? 0) >= +yFrom) && (!yTo || (p.year ?? 99999) <= +yTo) && (!(yFrom || yTo) || !!p.year));
  const folder = ws.folders.find((f) => f.id === c.folderId);
  const read = allPapers.filter((p) => p.status === "read").length;
  const target = c.goal ?? allPapers.length;
  const members = ws.members[c.id] ?? [];
  const candidates = ws.papers.filter((p) => !c.paperIds.includes(p.id) && p.title.toLowerCase().includes(q.toLowerCase())).slice(0, 30);

  return (
    <div>
      <Link href="/app/collections" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ArrowLeft className="size-4" aria-hidden />Collections</Link>{folder && <span className="mb-4 ml-2 inline-flex items-center gap-1 text-sm text-ink-3">/ <Folder className="size-3.5" style={{ color: folder.color }} aria-hidden />{folder.name}</span>}
      <PageHeader step={c.shared ? "shared" : "collections"} eyebrow={<span className="flex items-center gap-2 text-xs text-ink-3"><span className="h-1.5 w-8 rounded-full" style={{ background: c.color }} aria-hidden />{c.shared ? "Shared project" : "Private collection"}</span>}
        title={c.name} description={c.description}
        actions={<>
          <Button onClick={() => setAdding(true)} variant="primary"><Plus className="size-4" aria-hidden />Add papers</Button>
          <Button onClick={() => setEdit(true)}><Pencil className="size-4" aria-hidden />Edit</Button>
          <Button variant="ghost" onClick={() => setDel(true)} aria-label="Delete collection"><Trash2 className="size-4 text-rose" /></Button>
        </>} />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <Card className="mb-4 p-4">
            <div className="flex items-center justify-between text-sm"><span className="font-medium">Progress</span><span className="text-ink-2">{read} of {target} read{c.goal ? " · goal" : ""}</span></div>
            <div className="mt-2"><ProgressBar value={target ? Math.min(100, Math.round((read / target) * 100)) : 0} /></div>
            <Link href={`/app/library?collection=${c.id}`} className="mt-2 inline-block text-xs text-accent hover:underline">Filter in library →</Link>
          </Card>
          {allPapers.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2" role="search" aria-label="Search this collection">
              <div className="relative min-w-48 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden /><input value={fq} onChange={(e) => setFq(e.target.value)} placeholder="Find a paper by name" aria-label="Find a paper by name" className={cn(inputCls, "h-9 pl-9")} /></div>
              <input type="number" value={yFrom} onChange={(e) => setYFrom(e.target.value)} placeholder="Year from" aria-label="Published from year" className={cn(inputCls.replace("w-full ", ""), "h-9 w-28")} />
              <input type="number" value={yTo} onChange={(e) => setYTo(e.target.value)} placeholder="Year to" aria-label="Published to year" className={cn(inputCls.replace("w-full ", ""), "h-9 w-28")} />
              {filtering && <Button size="sm" variant="ghost" onClick={() => { setFq(""); setYFrom(""); setYTo(""); }}>Clear</Button>}
            </div>
          )}
          {filtering && papers.length === 0 ? <p className="rounded-xl border border-dashed border-line py-8 text-center text-sm text-ink-3">No papers in this collection match.</p> : allPapers.length === 0 ? <EmptyState title="This collection is empty" body="Add papers from your library to start tracking progress here." action={<Button variant="primary" onClick={() => setAdding(true)}>Add papers</Button>} /> : (
            <>
              <p className="mb-2 text-xs text-ink-3">{filtering ? `${papers.length} of ${allPapers.length} papers shown · clear the search to reorder` : `Drag to set your reading order.`}</p>
              <LayoutGroup>
                <Reorder.Group axis="y" values={filtering ? papers.map((p) => p.id) : ids} onReorder={(v) => !filtering && setOrder(v)} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
                  {papers.map((p) => (
                    <Reorder.Item key={p.id} value={p.id} className="flex cursor-grab items-center gap-3 border-b border-line bg-card px-3 py-3 last:border-0 active:cursor-grabbing" whileDrag={{ scale: 1.015, boxShadow: "var(--shadow-lift)", zIndex: 10 }}>
                      <GripVertical className="size-4 shrink-0 text-ink-3" aria-hidden />
                      <div className="min-w-0 flex-1"><Link href={`/app/papers/${p.id}`} className="line-clamp-1 font-medium hover:text-accent">{p.title}</Link><p className="truncate text-xs text-ink-3">{authorLine(p.authors, 2)} · {p.year ?? "n.d."}{p.assignedTo && ` · assigned to ${p.assignedTo}`}</p></div>
                      <StatusPill status={p.status} />
                      <button onClick={() => setCollectionPapers(c.id, [], [p.id]).then(() => toast("Removed from collection", "success", { label: "Undo", run: () => setCollectionPapers(c.id, [p.id], []) }))} aria-label={`Remove ${p.title} from collection`} className="rounded p-1 text-ink-3 hover:text-rose"><X className="size-4" /></button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </LayoutGroup>
            </>
          )}
        </div>
        {c.shared && (
          <aside>
            <Card className="p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="size-4" aria-hidden />Members</h2>
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.email} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0"><span className="block truncate font-medium">{m.name}</span><span className="block truncate text-xs text-ink-3">{m.email}</span></span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px]", m.status === "invited" ? "bg-amber-soft text-amber" : "bg-stone text-ink-2")}>{m.status === "invited" ? "Invited" : m.role}</span>
                  </li>
                ))}
              </ul>
              <form className="mt-4 space-y-2 border-t border-line pt-4" noValidate onSubmit={async (e) => {
                e.preventDefault(); setInviteErr("");
                if (!/^\S+@\S+\.\S+$/.test(email)) return setInviteErr("Enter a valid email address.");
                if (members.some((m) => m.email === email)) return setInviteErr("That person is already a member or invited.");
                try { await invite(c.id, email, role); toast(mode === "demo" ? "Invitation recorded (demo — no email sent)" : "Invitation created"); setEmail(""); } catch (err) { setInviteErr(err instanceof Error ? err.message : "Couldn't invite"); }
              }}>
                <label htmlFor="inv" className="text-xs font-medium">Invite by email</label>
                <input id="inv" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@university.edu" className={cn(inputCls, "h-9")} aria-invalid={!!inviteErr} />
                <div className="flex gap-2">
                  <select value={role} onChange={(e) => setRole(e.target.value as "editor")} aria-label="Access level" className={cn(inputCls, "h-9")}><option value="editor">Can edit & comment</option><option value="viewer">Can view & comment</option></select>
                  <Button size="sm" type="submit" className="h-9"><UserPlus className="size-4" aria-label="Send invite" /></Button>
                </div>
                {inviteErr && <p role="alert" className="text-xs text-rose">{inviteErr}</p>}
                <p className="text-[11px] text-ink-3">{mode === "demo" ? "Demo: invitations are simulated and no email is sent." : "Invitees see the invitation when they sign in with this email. Email delivery requires configuring Supabase SMTP."}</p>
              </form>
            </Card>
          </aside>
        )}
      </div>

      <CollectionDialog open={edit} onClose={() => setEdit(false)} existing={c} />
      <Dialog open={del} onClose={() => setDel(false)} title={`Delete “${c.name}”?`} description="The collection is removed but every paper stays in your library.">
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDel(false)}>Cancel</Button>
          <Button variant="danger" onClick={async () => { try { const undo = await deleteCollection(c.id); router.push("/app/collections"); toast("Collection deleted", "success", { label: "Undo", run: undo }); } catch (e) { toast(e instanceof Error ? e.message : "Couldn't delete", "error"); } }}>Delete collection</Button></div>
      </Dialog>
      <Dialog open={adding} onClose={() => setAdding(false)} title={`Add papers to ${c.name}`}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your library" aria-label="Search papers" className={cn(inputCls, "mb-3")} />
        <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
          <AnimatePresence>
            {candidates.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-stone/60">
                <span className="min-w-0 text-sm"><span className="line-clamp-1">{p.title}</span><span className="text-xs text-ink-3">{authorLine(p.authors, 2)}</span></span>
                <Button size="sm" onClick={() => setCollectionPapers(c.id, [p.id], []).then(() => toast("Added"), (e) => toast(e.message, "error"))}><Plus className="size-3.5" aria-hidden />Add</Button>
              </li>
            ))}
          </AnimatePresence>
          {candidates.length === 0 && <li className="py-6 text-center text-sm text-ink-3">No other papers match.</li>}
        </ul>
      </Dialog>
    </div>
  );
}
