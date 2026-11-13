"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { GraduationCap, Microscope, Presentation, Users, Sparkles, Plus, Upload, Compass } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button, Card, inputCls, Tag } from "@/components/ui";
import { useStore } from "@/lib/store";
import { sampleWorkspace } from "@/lib/sample";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/util";

const ROLES = [
  { id: "student", label: "Student", icon: GraduationCap }, { id: "researcher", label: "Researcher", icon: Microscope },
  { id: "lecturer", label: "Lecturer", icon: Presentation }, { id: "team", label: "Research team", icon: Users }, { id: "other", label: "Something else", icon: Sparkles },
] as const;

export default function Onboarding() {
  const { mode, ws, updateProfile, addPaper } = useStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Profile["role"]>(null);
  const [interest, setInterest] = useState(""); const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (mode === "signed_out") router.replace("/auth/sign-in"); if (mode === "demo") router.replace("/app"); }, [mode, router]);

  const finish = async (dest: string, samples = false) => {
    setBusy(true);
    try {
      await updateProfile({ role, interests, onboarded: true });
      if (samples) for (const p of sampleWorkspace().papers.slice(0, 5)) await addPaper({ ...p, title: p.title, tags: [...p.tags, "sample"] });
    } finally { router.push(dest); }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-stone/40 px-4 py-10">
      <Logo className="mb-2" />
      <a href="/PaperTrail-Workflow.pdf" target="_blank" className="mb-6 text-xs text-ink-3 underline hover:text-ink">Workflow step 4 · Onboarding</a>
      <Card className="w-full max-w-lg overflow-hidden p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Step ${step + 1} of 3`}>{[0, 1, 2].map((i) => <span key={i} className={cn("h-1.5 w-8 rounded-full transition-colors", i <= step ? "bg-accent" : "bg-line")} />)}</div>
          <button onClick={() => finish("/app")} className="text-sm text-ink-3 hover:text-ink">Skip</button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
            {step === 0 && <>
              <h1 className="font-serif text-2xl font-semibold">Welcome{ws.profile.name ? `, ${ws.profile.name.split(" ")[0]}` : ""}. What best describes you?</h1>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {ROLES.map(({ id, label, icon: Icon }) => (
                  <button key={id} aria-pressed={role === id} onClick={() => setRole(id)} className={cn("flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-medium", role === id ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-ink-3")}><Icon className="size-4" aria-hidden />{label}</button>
                ))}
              </div>
              <div className="mt-6 flex justify-end"><Button variant="primary" onClick={() => setStep(1)}>Continue</Button></div>
            </>}
            {step === 1 && <>
              <h1 className="font-serif text-2xl font-semibold">What are you researching?</h1>
              <p className="mt-1 text-sm text-ink-3">Optional — one or two topics help personalize your dashboard.</p>
              <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (interest.trim() && interests.length < 2) { setInterests([...interests, interest.trim()]); setInterest(""); } }}>
                <input value={interest} onChange={(e) => setInterest(e.target.value)} disabled={interests.length >= 2} placeholder="e.g. Human-computer interaction" aria-label="Research interest" className={inputCls} />
                <Button type="submit" disabled={interests.length >= 2}>Add</Button>
              </form>
              <div className="mt-3 flex flex-wrap gap-1.5">{interests.map((i) => <Tag key={i} onRemove={() => setInterests(interests.filter((x) => x !== i))}>{i}</Tag>)}</div>
              <div className="mt-6 flex justify-between"><Button variant="ghost" onClick={() => setStep(0)}>Back</Button><Button variant="primary" onClick={() => setStep(2)}>Continue</Button></div>
            </>}
            {step === 2 && <>
              <h1 className="font-serif text-2xl font-semibold">How would you like to start?</h1>
              <div className="mt-5 space-y-2">
                {[
                  { icon: Plus, t: "Add my first paper", b: "By DOI or by hand", go: () => finish("/app/add") },
                  { icon: Upload, t: "Import references", b: "BibTeX or RIS (Premium)", go: () => finish("/app/add?tab=import") },
                  { icon: Compass, t: "Explore with sample papers", b: "Adds 5 sample papers tagged #sample you can delete later", go: () => finish("/app", true) },
                ].map(({ icon: Icon, t, b, go }) => (
                  <button key={t} disabled={busy} onClick={go} className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left hover:border-accent hover:bg-accent-soft/40 disabled:opacity-50">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><Icon className="size-4" aria-hidden /></span>
                    <span><span className="block text-sm font-medium">{t}</span><span className="text-xs text-ink-3">{b}</span></span>
                  </button>
                ))}
              </div>
              <div className="mt-6"><Button variant="ghost" onClick={() => setStep(1)}>Back</Button></div>
            </>}
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  );
}
