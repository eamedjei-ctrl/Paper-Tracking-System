"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { AuthShell, DemoButton, Divider, PasswordInput, friendlyAuthError, NOT_CONFIGURED } from "@/components/auth-shell";
import { Button, inputCls } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/store";
import { cn } from "@/lib/util";

function Form() {
  const sp = useSearchParams();
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [errs, setErrs] = useState<{ email?: string; pw?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const next = sp.get("next")?.startsWith("/") && !sp.get("next")?.startsWith("//") ? sp.get("next")! : "/app";
  const linkError = sp.get("error") === "link";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: typeof errs = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) v.email = "Enter the email you signed up with.";
    if (!pw) v.pw = "Enter your password.";
    setErrs(v);
    if (Object.keys(v).length) return;
    if (!isSupabaseConfigured) return setErrs({ form: NOT_CONFIGURED });
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) { setErrs({ form: friendlyAuthError(error.message) }); setBusy(false); return; }
    window.location.href = next;
  };

  return (
    <>
      {linkError && <p role="alert" className="mb-4 rounded-xl bg-rose-soft p-3 text-sm text-rose">That sign-in link has expired or was already used. Sign in below, or request a new link.</p>}
      <form noValidate onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-[13px] font-medium">Email</label>
          <input id="email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errs.email} aria-describedby={errs.email ? "email-err" : undefined} placeholder="you@university.edu" className={cn(inputCls, "h-11")} />
          {errs.email && <p id="email-err" className="text-xs text-rose">{errs.email}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="pw" className="text-[13px] font-medium">Password</label>
            <Link href="/auth/reset" className="text-xs font-medium text-accent hover:underline">Forgot password?</Link>
          </div>
          <PasswordInput id="pw" value={pw} onChange={setPw} autoComplete="current-password" invalid={!!errs.pw} />
          {errs.pw && <p className="text-xs text-rose">{errs.pw}</p>}
        </div>
        {errs.form && <p role="alert" className="flex gap-2 rounded-xl bg-rose-soft p-3 text-sm text-rose"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />{errs.form}</p>}
        <Button variant="primary" type="submit" disabled={busy} className="h-11 w-full text-[15px]">{busy ? <><Loader2 className="size-4 animate-spin" aria-hidden />Signing in…</> : "Sign in"}</Button>
      </form>
      <Divider label="or" />
      <DemoButton />
    </>
  );
}

export default function SignIn() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to your library."
      footer={<>New to PaperTrail? <Link href="/auth/sign-up" className="font-medium text-accent hover:underline">Create an account</Link></>}>
      <Suspense><Form /></Suspense>
    </AuthShell>
  );
}
