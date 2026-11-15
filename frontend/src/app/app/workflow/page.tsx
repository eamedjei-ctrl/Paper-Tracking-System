"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Download, FileText, Star } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Button, Card } from "@/components/ui";
import { STAGES, WORKFLOW, step, type Stage } from "@/lib/workflow";
import { cn } from "@/lib/util";
import { stagger } from "@/lib/motion";

export default function WorkflowPage() {
  const [hash, setHash] = useState("");
  const [pdf, setPdf] = useState(false);
  useEffect(() => {
    const read = () => setHash(location.hash.slice(1));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => { if (hash) document.getElementById(hash)?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [hash]);

  return (
    <div>
      <PageHeader title="Workflow" description="Every page in PaperTrail is one step in this flow. It matches the diagram in PaperTrail-Workflow.pdf."
        actions={<>
          <Button onClick={() => setPdf((v) => !v)} aria-expanded={pdf}><FileText className="size-4" aria-hidden />{pdf ? "Hide diagram" : "View diagram"}</Button>
          <a href="/PaperTrail-Workflow.pdf" download><Button variant="primary"><Download className="size-4" aria-hidden />Download PDF</Button></a>
        </>} />

      {pdf && (
        <Card className="mb-6 overflow-hidden">
          <object data="/PaperTrail-Workflow.pdf#view=FitH" type="application/pdf" className="h-[70vh] w-full" aria-label="Workflow diagram PDF">
            <p className="p-6 text-sm">Your browser can't show PDFs inline. <a className="text-accent underline" href="/PaperTrail-Workflow.pdf">Open the diagram</a>.</p>
          </object>
        </Card>
      )}

      <div className="space-y-8">
        {(Object.keys(STAGES) as Stage[]).map((stage) => {
          const steps = WORKFLOW.filter((s) => s.stage === stage);
          const st = STAGES[stage];
          return (
            <section key={stage} aria-labelledby={`stage-${stage}`}>
              <h2 id={`stage-${stage}`} className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold"><span className="h-2 w-6 rounded-full" style={{ background: st.color }} aria-hidden />{st.label}</h2>
              <motion.ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: stagger } } }}>
                {steps.map((s) => (
                  <motion.li key={s.id} id={s.id} variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }}
                    className={cn("scroll-mt-24 rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-card)] transition-colors", hash === s.id ? "border-accent ring-2 ring-accent-soft" : "border-line")}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: st.soft, color: st.color }}>Step {s.n}</span>
                      {s.premium && <span className="inline-flex items-center gap-1 text-[11px] text-ink-3"><Star className="size-3" aria-hidden />Premium</span>}
                    </div>
                    <h3 className="font-semibold">{s.label}</h3>
                    <p className="mt-1 text-sm text-ink-3">{s.desc}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Link href={s.href} className="inline-flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-paper hover:opacity-90">Open<ArrowRight className="size-3" aria-hidden /></Link>
                      {s.next.map((n) => <a key={n} href={`#${n}`} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-2 hover:border-ink-3">→ {step(n).label}</a>)}
                    </div>
                  </motion.li>
                ))}
              </motion.ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
