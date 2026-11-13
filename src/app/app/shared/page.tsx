"use client";
import Link from "next/link";
import { useState } from "react";
import { Users, Mail, MessageSquare, UserCheck, Lock, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/shell";
import { Button, Card, EmptyState, useToast } from "@/components/ui";
import { CollectionDialog } from "@/components/collection-dialog";
import { relTime } from "@/lib/util";

export default function SharedPage() {
  const { ws, ent, respondInvite, mode } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const shared = ws.collections.filter((c) => c.shared);
  const pending = ws.invitations.filter((i) => i.status === "pending");
  const sharedPaperIds = new Set(shared.flatMap((c) => c.paperIds));
  const comments = ws.comments.filter((c) => sharedPaperIds.has(c.paperId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const assigned = ws.papers.filter((p) => p.assignedTo && sharedPaperIds.has(p.id));

  return (
    <div>
      <PageHeader step="shared" title="Shared projects" description="Read together. Collaborators see papers and comments — never your private notes."
        actions={ent.sharedProjects ? <Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden />New shared project</Button> : undefined} />
      {!ent.sharedProjects && <Card className="mb-6 flex items-center gap-3 p-4 text-sm"><Lock className="size-4 text-ink-3" aria-hidden />Shared projects are part of Premium. <Link href="/app/plans" className="text-accent underline">See plans</Link></Card>}
      {mode === "demo" && <p className="mb-4 text-xs text-ink-3">Demo: members, invitations and comments are simulated and no emails are sent.</p>}

      {pending.length > 0 && (
        <Card className="mb-6 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Mail className="size-4" aria-hidden />Invitations for you</h2>
          <ul className="space-y-2">{pending.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-paper p-3 text-sm">
              <span><strong>{i.from}</strong> invited you to <strong>{i.collectionName}</strong></span>
              <span className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => respondInvite(i.id, false).then(() => toast("Declined"), (e) => toast(e.message, "error"))}>Decline</Button>
                <Button size="sm" variant="primary" onClick={() => respondInvite(i.id, true).then(() => toast("Joined project"), (e) => toast(e.message, "error"))}>Accept</Button>
              </span>
            </li>))}</ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {shared.length === 0 ? <EmptyState title="No shared projects" body="Make a collection shared to invite your lab or reading group." /> : (
            <ul className="space-y-3">
              {shared.map((c) => {
                const members = ws.members[c.id] ?? [];
                const papers = ws.papers.filter((p) => c.paperIds.includes(p.id));
                return (
                  <li key={c.id}>
                    <Link href={`/app/collections/${c.id}`} className="block rounded-[var(--radius-card)] border border-line bg-card p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                      <div className="flex items-center justify-between gap-2"><h2 className="font-serif text-lg font-semibold">{c.name}</h2><span className="h-1.5 w-8 rounded-full" style={{ background: c.color }} aria-hidden /></div>
                      <p className="mt-1 text-sm text-ink-3">{c.description}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-2">
                        <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden />{members.filter((m) => m.status === "active").length} members{members.some((m) => m.status === "invited") && ` · ${members.filter((m) => m.status === "invited").length} invited`}</span>
                        <span>{papers.length} papers</span>
                        <span>{papers.filter((p) => p.status === "read").length} read</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <aside className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><UserCheck className="size-4" aria-hidden />Assigned for review</h2>
            {assigned.length ? <ul className="space-y-2">{assigned.map((p) => <li key={p.id} className="text-sm"><Link href={`/app/papers/${p.id}`} className="line-clamp-1 hover:text-accent">{p.title}</Link><span className="text-xs text-ink-3">{p.assignedTo}</span></li>)}</ul> : <p className="text-xs text-ink-3">Assign a reviewer from a shared paper's page.</p>}
          </Card>
          <Card className="p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><MessageSquare className="size-4" aria-hidden />Recent discussion</h2>
            {comments.length ? <ul className="space-y-3">{comments.map((c) => { const p = ws.papers.find((x) => x.id === c.paperId); return <li key={c.id} className="text-sm"><p className="text-xs font-semibold">{c.author} <span className="font-normal text-ink-3">· {relTime(c.createdAt)}</span></p><p className="line-clamp-2">{c.body}</p>{p && <Link href={`/app/papers/${p.id}`} className="line-clamp-1 text-xs text-accent hover:underline">{p.title}</Link>}</li>; })}</ul> : <p className="text-xs text-ink-3">No comments yet.</p>}
          </Card>
        </aside>
      </div>
      <CollectionDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
