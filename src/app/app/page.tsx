"use client";

import Link from "next/link";
import { motion, useInView, useReducedMotion, animate } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Upload, FolderPlus, ArrowRight, Bell, BookOpen } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/shell";
import { Button, Card, DemoBadge, EmptyState, ProgressBar, StatusPill } from "@/components/ui";
import { authorLine, cn, relTime } from "@/lib/util";
import { STATUS_LABEL, type ReadingStatus } from "@/lib/types";
import { stagger } from "@/lib/motion";

const sectionV = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } } };

function Counter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView || !ref.current) return;
    if (reduce) { ref.current.textContent = String(to); return; }
    const c = animate(0, to, { duration: 0.8, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => { if (ref.current) ref.current.textContent = String(Math.round(v)); } });
    return () => c.stop();
  }, [inView, to, reduce]);
  return <span ref={ref}>{to}</span>;
}

function Ring({ value, goal }: { value: number; goal: number }) {
  const pct = Math.min(1, goal ? value / goal : 0);
  const r = 42, c = 2 * Math.PI * r;
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <svg ref={ref} viewBox="0 0 100 100" className="size-32 -rotate-90" role="img" aria-label={`${value} of ${goal} papers read this week`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--stone)" strokeWidth="9" />
      <motion.circle cx="50" cy="50" r={r} fill="none" stroke={pct >= 1 ? "var(--mint)" : "var(--accent)"} strokeWidth="9" strokeLinecap="round" strokeDasharray={c}
        initial={{ strokeDashoffset: c }} animate={inView ? { strokeDashoffset: c * (1 - pct) } : undefined} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }} />
    </svg>
  );
}

function ActivityGrid({ dates }: { dates: string[] }) {
  const weeks = 12;
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    dates.forEach((d) => { const k = d.slice(0, 10); m.set(k, (m.get(k) ?? 0) + 1); });
    return m;
  }, [dates]);
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate() - (weeks * 7 - 1) - today.getDay());
  const cells = [...Array(weeks * 7)].map((_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); const k = d.toISOString().slice(0, 10); return { k, n: counts.get(k) ?? 0, future: d > today }; });
  const total = cells.reduce((s, c) => s + c.n, 0);
  return (
    <div>
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" role="img" aria-label={`${total} reading activities in the last ${weeks} weeks`}>
        {cells.map((c) => (
          <div key={c.k} title={`${c.k}: ${c.n} activit${c.n === 1 ? "y" : "ies"}`}
            className={cn("aspect-square w-full min-w-2 rounded-[3px]", c.future ? "bg-transparent" : c.n === 0 ? "bg-stone" : c.n === 1 ? "bg-accent/35" : c.n === 2 ? "bg-accent/60" : "bg-accent")} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-ink-3"><span>{weeks} weeks ago</span><span>{total} activities · Today</span></div>
    </div>
  );
}

export default function Dashboard() {
  const { ws, mode } = useStore();
  const [firstVisit] = useState(() => typeof window !== "undefined" && !sessionStorage.getItem("pt-dash-seen"));
  useEffect(() => { sessionStorage.setItem("pt-dash-seen", "1"); }, []);

  const counts = useMemo(() => {
    const c: Record<ReadingStatus, number> = { unread: 0, in_progress: 0, read: 0, revisit: 0 };
    ws.papers.forEach((p) => c[p.status]++);
    return c;
  }, [ws.papers]);

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const readThisWeek = ws.activity.filter((e) => e.kind === "status" && /as Read$/.test(e.message) && new Date(e.at) > weekStart).length;
  const continueReading = ws.papers.filter((p) => p.status === "in_progress").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  const recent = [...ws.papers].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 5);
  const reminders = ws.reminders.filter((r) => !r.done).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = (ws.profile.name || "").split(" ")[0];

  return (
    <motion.div initial={firstVisit ? "hidden" : false} animate="show" variants={{ show: { transition: { staggerChildren: stagger * 1.6 } } }}>
      <motion.div variants={sectionV}>
        <PageHeader eyebrow={mode === "demo" ? <DemoBadge /> : undefined} title={`${greet}${first ? `, ${first}` : ""}`}
          description={ws.papers.length ? `You have ${counts.unread} papers waiting and ${counts.in_progress} in progress.` : "Let's start your library."}
          actions={<>
            <Link href="/app/add"><Button variant="primary"><Plus className="size-4" aria-hidden />Add paper</Button></Link>
            <Link href="/app/add?tab=import"><Button><Upload className="size-4" aria-hidden />Import</Button></Link>
            <Link href="/app/collections?new=1"><Button><FolderPlus className="size-4" aria-hidden />New collection</Button></Link>
          </>} />
      </motion.div>

      {ws.papers.length === 0 ? (
        <motion.div variants={sectionV}>
          <EmptyState title="Your library is empty" body="Add a paper by DOI or by hand, or import a BibTeX/RIS file from your reference manager." action={<Link href="/app/add"><Button variant="primary"><Plus className="size-4" />Add your first paper</Button></Link>} />
        </motion.div>
      ) : (
        <>
          <motion.section variants={sectionV} aria-label="Library summary" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Link href="/app/library" className="col-span-2 rounded-[var(--radius-card)] bg-ink p-4 text-paper shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 sm:col-span-1">
              <p className="text-xs uppercase tracking-wider opacity-70">Total papers</p>
              <p className="mt-2 font-serif text-4xl font-semibold"><Counter to={ws.papers.length} /></p>
            </Link>
            {(Object.keys(counts) as ReadingStatus[]).map((s) => (
              <Link key={s} href={`/app/library?status=${s}`} className="rounded-[var(--radius-card)] border border-line bg-card p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                <StatusPill status={s} />
                <p className="mt-2 font-serif text-3xl font-semibold"><Counter to={counts[s]} /></p>
              </Link>
            ))}
          </motion.section>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <motion.section variants={sectionV} className="lg:col-span-2" aria-labelledby="cont">
              <Card className="h-full p-5">
                <div className="mb-4 flex items-center justify-between"><h2 id="cont" className="font-serif text-lg font-semibold">Continue reading</h2><BookOpen className="size-4 text-ink-3" aria-hidden /></div>
                {continueReading.length === 0 ? <p className="text-sm text-ink-3">Nothing in progress. Pick something from your <Link className="text-accent underline" href="/app/library?status=unread">to-read list</Link>.</p> : (
                  <ul className="space-y-4">
                    {continueReading.map((p) => (
                      <li key={p.id}>
                        <Link href={`/app/papers/${p.id}`} className="group block rounded-xl p-2 -m-2 hover:bg-stone/60">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0"><p className="line-clamp-1 font-medium group-hover:text-accent">{p.title}</p><p className="text-xs text-ink-3">{authorLine(p.authors, 2)} · updated {relTime(p.updatedAt)}</p></div>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-2">{p.progress}%</span>
                          </div>
                          <div className="mt-2"><ProgressBar value={p.progress} /></div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </motion.section>

            <motion.section variants={sectionV} aria-labelledby="goal">
              <Card className="flex h-full flex-col items-center p-5 text-center">
                <h2 id="goal" className="self-start font-serif text-lg font-semibold">Weekly goal</h2>
                <div className="relative my-3"><Ring value={readThisWeek} goal={ws.profile.weeklyGoal} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-serif text-3xl font-semibold">{readThisWeek}</span><span className="text-xs text-ink-3">of {ws.profile.weeklyGoal} read</span></div>
                </div>
                <p className="text-sm text-ink-2">{readThisWeek >= ws.profile.weeklyGoal ? "Goal met — nicely done." : `${ws.profile.weeklyGoal - readThisWeek} more to reach this week's goal.`}</p>
                <Link href="/app/settings#goals" className="mt-1 text-xs text-accent hover:underline">Adjust goal</Link>
              </Card>
            </motion.section>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <motion.section variants={sectionV} className="lg:col-span-2" aria-labelledby="recent">
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between"><h2 id="recent" className="font-serif text-lg font-semibold">Recently added</h2><Link href="/app/library?sort=added" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">View library<ArrowRight className="size-3.5" aria-hidden /></Link></div>
                <ul className="divide-y divide-line">
                  {recent.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0"><Link href={`/app/papers/${p.id}`} className="line-clamp-1 text-sm font-medium hover:text-accent">{p.title}</Link><p className="text-xs text-ink-3">Added {relTime(p.addedAt)}</p></div>
                      <StatusPill status={p.status} />
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.section>
            <motion.section variants={sectionV} aria-labelledby="rem">
              <Card className="h-full p-5">
                <div className="mb-3 flex items-center justify-between"><h2 id="rem" className="font-serif text-lg font-semibold">Upcoming reminders</h2><Bell className="size-4 text-ink-3" aria-hidden /></div>
                {reminders.length === 0 ? <p className="text-sm text-ink-3">No upcoming reminders. Add one from a paper's page.</p> : (
                  <ul className="space-y-3">
                    {reminders.map((r) => {
                      const d = new Date(r.due);
                      const p = ws.papers.find((x) => x.id === r.paperId);
                      return (
                        <li key={r.id} className="flex gap-3">
                          <div className="w-11 shrink-0 rounded-lg border border-line bg-paper py-1 text-center"><p className="text-[10px] uppercase text-ink-3">{d.toLocaleDateString("en", { month: "short" })}</p><p className="font-serif text-lg font-semibold leading-none">{d.getDate()}</p></div>
                          <div className="min-w-0 text-sm"><p className="line-clamp-2">{r.text}</p>{p && <Link href={`/app/papers/${p.id}`} className="line-clamp-1 text-xs text-accent hover:underline">{p.title}</Link>}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </motion.section>
          </div>

          <motion.section variants={sectionV} className="mt-6" aria-labelledby="act">
            <Card className="grid gap-6 p-5 md:grid-cols-[1fr_280px]">
              <div><h2 id="act" className="mb-3 font-serif text-lg font-semibold">Reading activity</h2><ActivityGrid dates={ws.activity.map((a) => a.at)} /></div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Latest</h3>
                <ul className="space-y-2">{ws.activity.slice(0, 4).map((e) => <li key={e.id} className="text-xs text-ink-2"><span className="line-clamp-2">{e.message}</span><span className="text-ink-3">{relTime(e.at)}</span></li>)}</ul>
                {ws.activity.length === 0 && <p className="text-xs text-ink-3">Status changes and notes will appear here.</p>}
              </div>
            </Card>
          </motion.section>
          <p className="sr-only">Status counts: {(Object.keys(counts) as ReadingStatus[]).map((s) => `${STATUS_LABEL[s]} ${counts[s]}`).join(", ")}</p>
        </>
      )}
    </motion.div>
  );
}
