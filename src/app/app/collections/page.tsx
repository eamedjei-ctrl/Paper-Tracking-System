"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { FolderPlus, Users, Mail } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/shell";
import { Button, Card, EmptyState, ProgressBar, useToast } from "@/components/ui";
import { CollectionDialog } from "@/components/collection-dialog";
import { stagger } from "@/lib/motion";

function Inner() {
  const { ws, ent, respondInvite } = useStore();
  const sp = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (sp.get("new")) { setOpen(true); router.replace("/app/collections"); } }, [sp, router]);
  const pending = ws.invitations.filter((i) => i.status === "pending");
  return (
    <div>
      <PageHeader step="collections" title="Collections & projects" description={`${ws.collections.length}${ent.maxCollections ? ` of ${ent.maxCollections}` : ""} collections`} actions={<Button variant="primary" onClick={() => setOpen(true)}><FolderPlus className="size-4" aria-hidden />New collection</Button>} />
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
      {ws.collections.length === 0 ? (
        <EmptyState title="No collections yet" body="Collections group papers for a thesis chapter, a course, or a reading group." action={<Button variant="primary" onClick={() => setOpen(true)}>Create a collection</Button>} />
      ) : (
        <motion.ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: stagger } } }}>
          {ws.collections.map((c) => {
            const papers = ws.papers.filter((p) => c.paperIds.includes(p.id));
            const read = papers.filter((p) => p.status === "read").length;
            const target = c.goal ?? papers.length;
            return (
              <motion.li key={c.id} layoutId={`col-${c.id}`} variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }}>
                <Link href={`/app/collections/${c.id}`} className="block h-full rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                  <div className="mb-3 flex items-center justify-between"><span className="h-1.5 w-10 rounded-full" style={{ background: c.color }} aria-hidden />{c.shared && <span className="inline-flex items-center gap-1 text-xs text-ink-3"><Users className="size-3.5" aria-hidden />Shared · {(ws.members[c.id] ?? []).filter((m) => m.status === "active").length} members</span>}</div>
                  <h2 className="font-serif text-lg font-semibold leading-snug">{c.name}</h2>
                  {c.description && <p className="mt-1 line-clamp-2 text-sm text-ink-3">{c.description}</p>}
                  <div className="mt-4 flex items-center justify-between text-xs text-ink-2"><span>{papers.length} papers</span><span>{read} of {target} read{c.goal ? " (goal)" : ""}</span></div>
                  <div className="mt-1.5"><ProgressBar value={target ? Math.min(100, Math.round((read / target) * 100)) : 0} label={`${c.name} progress`} /></div>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
      <CollectionDialog open={open} onClose={() => setOpen(false)} onSaved={(c) => router.push(`/app/collections/${c.id}`)} />
    </div>
  );
}
export default function Page() { return <Suspense><Inner /></Suspense>; }
