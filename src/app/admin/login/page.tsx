"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { ShieldCheck, AlertCircle, Loader2, FlaskConical, Lock, Activity, UserX } from "lucide-react";
import { Logo } from "@/components/logo";
import { PasswordInput } from "@/components/auth-shell";
import { Button, inputCls } from "@/components/ui";
import { useAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/store";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/util";

export default function AdminLogin() {
  const { mode, enterDemo } = useAdmin();
  const router = useRouter();
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (mode === "demo" || mode === "cloud") router.replace("/admin"); }, [mode, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!/^\S+@\S+\.\S+$/.test(email) || !pw) return setErr("Enter your admin email and password.");
    if (!isSupabaseConfigured) return setErr("Accounts aren't connected on this deployment, so admin sign-in isn't available. Use the admin demo below.");
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) { setBusy(false); return setErr(/invalid login/i.test(error.message) ? "That email and password don't match." : error.message); }
    const r = await fetch("/api/admin/me", { cache: "no-store" });
    if (!r.ok) { await sb.auth.signOut(); setBusy(false); return setErr(r.status === 403 ? "This account doesn't have admin access." : "Admin backend isn't configured (needs SUPABASE_SERVICE_ROLE_KEY)."); }
    window.location.href = "/admin";
  };

  return (
    <div className="dark grid min-h-dvh bg-paper text-ink lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12" aria-hidden>
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <Logo className="relative" />
        <div className="relative max-w-md">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-accent"><ShieldCheck className="size-3.5" />Restricted area</p>
          <h2 className="font-serif text-4xl font-semibold leading-tight">PaperTrail<br />Control Center</h2>
          <p className="mt-3 text-sm text-ink-3">Monitor accounts, activity and subscriptions across the platform.</p>
          <ul className="mt-8 space-y-3 text-sm text-ink-2">
            {[[Activity, "Live system activity and sign-ups"], [UserX, "Block and unblock accounts, with a required reason"], [Lock, "Every admin action is recorded in the audit log"]].map(([I, t], i) => {
              const Icon = I as typeof Lock;
              return <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent"><Icon className="size-4" /></span>{t as string}</motion.li>;
            })}
          </ul>
        </div>
        <p className="relative text-xs text-ink-3">Admins can see account details and activity, not the text of users' private notes.</p>
      </div>

      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="lg:hidden"><Logo /></div>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent"><ShieldCheck className="size-6" aria-hidden /></span>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="mt-1.5 text-sm text-ink-3">For PaperTrail administrators only.</p>
          <form noValidate onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5"><label htmlFor="aemail" className="text-[13px] font-medium">Admin email</label>
              <input id="aemail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={cn(inputCls, "h-11")} placeholder="admin@yourdomain.com" /></div>
            <div className="space-y-1.5"><label htmlFor="apw" className="text-[13px] font-medium">Password</label>
              <PasswordInput id="apw" value={pw} onChange={setPw} autoComplete="current-password" /></div>
            {err && <p role="alert" className="flex gap-2 rounded-xl bg-rose-soft p-3 text-sm text-rose"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />{err}</p>}
            <Button variant="primary" type="submit" disabled={busy} className="h-11 w-full">{busy ? <><Loader2 className="size-4 animate-spin" aria-hidden />Verifying…</> : <><Lock className="size-4" aria-hidden />Sign in to admin</>}</Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-ink-3"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <Button className="h-11 w-full" onClick={() => { enterDemo(); router.push("/admin"); }}><FlaskConical className="size-4" aria-hidden />Open admin demo</Button>
          <p className="mt-2 text-center text-xs text-ink-3">Demo uses fictional accounts, stored only in this browser.</p>
        </main>
        <Link href="/" className="text-center text-xs text-ink-3 hover:text-ink">← Back to PaperTrail</Link>
      </div>
    </div>
  );
}
