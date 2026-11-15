"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Eye, EyeOff, FlaskConical, Info } from "lucide-react";
import { Logo } from "./logo";
import { Button, StatusPill, ProgressBar, inputCls } from "./ui";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/util";

export const NOT_CONFIGURED = "Accounts aren't available in this version of PaperTrail — it runs entirely in your browser. Use the demo to explore everything.";

function Showcase() {
  return (
    <div className="relative hidden overflow-hidden bg-ink text-paper lg:flex lg:flex-col lg:justify-between lg:p-12" aria-hidden>
      <div className="absolute -right-24 -top-24 size-96 rounded-full bg-accent/30 blur-3xl" />
      <div className="relative">
        <p className="font-serif text-3xl font-semibold leading-tight">Pick up exactly<br />where you left off.</p>
        <p className="mt-3 max-w-sm text-sm text-paper/70">Your papers, reading progress, notes and citations are waiting for you.</p>
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="relative space-y-3">
        {[["Generative Agents: Interactive Simulacra of Human Behavior", "in_progress", 45], ["Guidelines for Human-AI Interaction", "read", 100], ["Trust in Automation: Designing for Appropriate Reliance", "unread", 0]].map(([t, s, v], i) => (
          <motion.div key={t as string} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.08 }}
            className="rounded-xl border border-white/10 bg-card p-4 text-ink shadow-lg" style={{ marginLeft: i * 20 }}>
            <div className="mb-2"><StatusPill status={s as "read"} /></div>
            <p className="font-serif text-[15px] font-semibold leading-snug">{t}</p>
            <div className="mt-3"><ProgressBar value={v as number} /></div>
          </motion.div>
        ))}
        <p className="pt-2 text-xs text-paper/50">Sample papers shown for illustration.</p>
      </motion.div>
    </div>
  );
}

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const { enterDemo } = useStore();
  const router = useRouter();
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="self-start"><Logo /></Link>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-3">{subtitle}</p>}
          {(

            <div className="mt-6 flex gap-2.5 rounded-xl border border-amber/30 bg-amber-soft/70 p-3 text-[13px] text-ink-2">
              <Info className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />
              <span>Accounts aren't available in this version. <button className="font-semibold text-accent underline underline-offset-2" onClick={() => { enterDemo(); router.push("/app"); }}>Explore the demo</button> instead.</span>
            </div>
          )}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-ink-3">{footer}</div>}
        </main>
        <p className="text-center text-xs text-ink-3">Step 3 of the <a href="/PaperTrail-Workflow.pdf" target="_blank" className="underline hover:text-ink">PaperTrail workflow</a> · Your research stays yours — export it any time.</p>
      </div>
      <Showcase />
    </div>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete, invalid }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} aria-invalid={invalid} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "h-11 pr-11")} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-3 hover:bg-stone hover:text-ink">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function DemoButton() {
  const { enterDemo } = useStore();
  const router = useRouter();
  return (
    <Button type="button" className="h-11 w-full" onClick={() => { enterDemo(); router.push("/app"); }}><FlaskConical className="size-4" aria-hidden />Explore the demo</Button>
  );
}

export function Divider({ label }: { label: string }) {
  return <div className="my-5 flex items-center gap-3 text-xs text-ink-3"><span className="h-px flex-1 bg-line" />{label}<span className="h-px flex-1 bg-line" /></div>;
}

export function friendlyAuthError(msg: string) {
  if (/invalid login|invalid credentials|401/i.test(msg)) return "That email and password don't match. Check for typos or reset your password.";
  if (/already registered|already exists/i.test(msg)) return "An account with this email already exists. Try signing in instead.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox for the link.";
  if (/rate limit/i.test(msg)) return "Too many attempts. Please wait a minute and try again.";
  return msg;
}
