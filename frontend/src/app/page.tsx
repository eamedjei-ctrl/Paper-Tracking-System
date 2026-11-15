"use client";

import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useInView, useReducedMotion } from "motion/react";
import { BookOpenCheck, FolderKanban, NotebookPen, Quote, Users, Download, Search, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button, StatusPill, ProgressBar } from "@/components/ui";
import { PlanCards } from "@/components/plan-cards";
import { useStore } from "@/lib/store";

const chips = [
  { t: "Amershi et al., 2019", x: "4%", y: "12%", d: 0 }, { t: "doi:10.1145/…", x: "80%", y: "6%", d: 1.2 },
  { t: "#trust", x: "88%", y: "62%", d: 0.6 }, { t: "Horvitz, 1999", x: "2%", y: "72%", d: 1.8 },
  { t: "#llm", x: "70%", y: "88%", d: 2.4 }, { t: "Lee & See, 2004", x: "18%", y: "92%", d: 0.9 },
];

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const drift = !reduce && inView;
  return (
    <div ref={ref} className="relative mx-auto mt-14 max-w-5xl px-2 sm:px-10" aria-hidden>
      {chips.map((c) => (
        <motion.span key={c.t} className="absolute z-10 hidden rounded-full border border-line bg-card px-3 py-1 font-mono text-xs text-ink-2 shadow-[var(--shadow-card)] md:block" style={{ left: c.x, top: c.y }}
          animate={drift ? { y: [0, -10, 0], rotate: [0, 1.5, 0] } : undefined} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: c.d }}>{c.t}</motion.span>
      ))}
      {[{ r: -6, x: "-4%", y: "18%" }, { r: 5, x: "84%", y: "26%" }].map((c, i) => (
        <motion.div key={i} className="absolute hidden h-40 w-32 rounded-lg border border-line bg-card p-3 shadow-[var(--shadow-card)] lg:block" style={{ left: c.x, top: c.y, rotate: c.r }}
          animate={drift ? { y: [0, 12, 0] } : undefined} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: i * 2 }}>
          <div className="h-1.5 w-16 rounded bg-ink/70" /><div className="mt-2 space-y-1">{[...Array(7)].map((_, j) => <div key={j} className="h-1 rounded bg-line" style={{ width: `${60 + ((j * 37) % 40)}%` }} />)}</div>
        </motion.div>
      ))}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_30px_80px_-20px_rgb(27_29_38/0.25)]">
        <div className="flex h-9 items-center gap-1.5 border-b border-line bg-stone px-4">{[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full bg-line" />)}</div>
        <div className="grid grid-cols-[150px_1fr] text-left">
          <div className="hidden space-y-1 border-r border-line bg-stone/50 p-3 sm:block">{["Dashboard", "Library", "Add paper", "Collections"].map((n, i) => <div key={n} className={`rounded-md px-2 py-1.5 text-[11px] ${i === 0 ? "bg-card font-medium shadow-sm" : "text-ink-3"}`}>{n}</div>)}</div>
          <div className="col-span-2 p-4 sm:col-span-1 sm:p-5">
            <p className="font-serif text-lg font-semibold">Good morning</p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              <div className="rounded-lg bg-ink p-2 text-paper"><p className="text-[9px] uppercase opacity-70">Total</p><p className="font-serif text-xl">14</p></div>
              {(["unread", "in_progress", "read", "revisit"] as const).map((s, i) => <div key={s} className={`rounded-lg border border-line bg-card p-2 ${i > 1 ? "hidden sm:block" : ""}`}><StatusPill status={s} /><p className="mt-1 font-serif text-xl">{[6, 3, 4, 1][i]}</p></div>)}
            </div>
            <div className="mt-3 rounded-lg border border-line bg-card p-3">
              <p className="mb-2 text-xs font-semibold">Continue reading</p>
              {[["Generative Agents: Interactive Simulacra…", 45], ["Why Johnny Can't Prompt", 70]].map(([t, v]) => <div key={t} className="mb-2"><p className="mb-1 text-[11px]">{t}</p><ProgressBar value={v as number} /></div>)}
            </div>
          </div>
        </div>
      </motion.div>
      <p className="mt-3 text-center text-xs text-ink-3">Preview of the PaperTrail dashboard, showing demo content.</p>
    </div>
  );
}

const features = [
  { icon: FolderKanban, t: "Organize without effort", b: "Tags, collections and research projects keep every paper findable. Search spans titles, authors, DOIs, abstracts and your own notes." },
  { icon: BookOpenCheck, t: "Know where you left off", b: "Track each paper from to-read to read, set priorities and weekly goals, and pick up exactly where you stopped." },
  { icon: NotebookPen, t: "Notes that stay with the paper", b: "Summaries, takeaways, open questions and follow-up tasks live beside the PDF, autosaved as you type." },
  { icon: Quote, t: "Citations, ready to paste", b: "Copy APA, MLA, Chicago or BibTeX. Missing metadata is flagged instead of invented." },
  { icon: Users, t: "Read together", b: "Share a project with your lab, assign papers for review and discuss them — personal notes stay private." },
  { icon: Search, t: "Bring your library", b: "Look up papers by DOI or import BibTeX and RIS from your current reference manager, with duplicate checks." },
];

export default function Landing() {
  const { enterDemo, mode } = useStore();
  const router = useRouter();
  const demo = () => { if (mode !== "demo") enterDemo(); router.push("/app"); };
  return (
    <div className="overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
            <a href="#features" className="hidden px-3 text-sm text-ink-2 hover:text-ink sm:inline">Features</a>
            <a href="#plans" className="hidden px-3 text-sm text-ink-2 hover:text-ink sm:inline">Plans</a>
            {mode === "demo" ? <Link href="/app"><Button size="sm" variant="primary">Open app</Button></Link> : <>
              <Link href="/auth/sign-in"><Button size="sm" variant="ghost">Sign in</Button></Link>
              <Link href="/auth/sign-up"><Button size="sm" variant="primary">Start your library</Button></Link>
            </>}
          </nav>
        </div>
      </header>

      <main>
        <section className="px-4 pb-20 pt-16 text-center sm:pt-24">
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs text-ink-2">For graduate students, researchers, lecturers and labs</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mx-auto max-w-3xl font-serif text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            A calm home for every paper you <em className="text-accent">mean</em> to read.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mx-auto mt-5 max-w-xl text-lg text-ink-2">
            PaperTrail collects your papers, tracks your reading, keeps your notes beside the source, and turns it all into clean citations when it's time to write.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/auth/sign-up"><Button variant="primary" className="h-12 w-full px-6 text-base sm:w-auto">Start your library</Button></Link>
            <Button onClick={demo} className="h-12 px-6 text-base">Explore demo</Button>
          </motion.div>
          <p className="mt-3 text-xs text-ink-3">The demo runs entirely in your browser with sample papers — no account needed.</p>
          <Hero />
        </section>

        <section id="features" className="border-y border-line bg-stone/50 px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-xl font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Everything a literature review needs, nothing it doesn't.</h2>
            <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, t, b }, i) => (
                <motion.div key={t} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: (i % 3) * 0.06 }}>
                  <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon className="size-5" aria-hidden /></div>
                  <h3 className="font-serif text-lg font-semibold">{t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{b}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
            <div>
              <ShieldCheck className="mb-3 size-8 text-mint" aria-hidden />
              <h2 className="font-serif text-3xl font-semibold tracking-tight">Your research stays yours.</h2>
              <p className="mt-3 text-ink-2">Export your papers, notes and citations at any time — as JSON, CSV, BibTeX or RIS — on every plan, including after you downgrade. Private notes are never shown to collaborators, and uploaded PDFs are served only through short-lived, access-controlled links.</p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-5 font-mono text-xs leading-relaxed text-ink-2 shadow-[var(--shadow-card)]">
              <p className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold text-ink"><Download className="size-4" aria-hidden />papertrail.bib</p>
              @inproceedings&#123;amershi2019guidelines,<br />&nbsp;&nbsp;title = &#123;Guidelines for Human-AI Interaction&#125;,<br />&nbsp;&nbsp;year = &#123;2019&#125;,<br />&nbsp;&nbsp;doi = &#123;10.1145/3290605.3300233&#125;<br />&#125;
            </div>
          </div>
        </section>

        <section id="plans" className="border-t border-line bg-stone/50 px-4 py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center font-serif text-3xl font-semibold tracking-tight">Standard and Premium</h2>
            <p className="mx-auto mb-10 mt-2 max-w-lg text-center text-ink-2">Start with everything one researcher needs. Upgrade for bulk import, unlimited papers and shared projects.</p>
            <PlanCards />
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-ink-3 sm:flex-row">
          <Logo />
          <nav aria-label="Footer" className="flex gap-5"><a href="#features" className="hover:text-ink">Features</a><a href="#plans" className="hover:text-ink">Plans</a><a href="/PaperTrail-Workflow.pdf" target="_blank" className="hover:text-ink">How it works (PDF)</a><Link href="/auth/sign-in" className="hover:text-ink">Sign in</Link><button onClick={demo} className="hover:text-ink">Demo</button></nav>
        </div>
      </footer>
    </div>
  );
}
