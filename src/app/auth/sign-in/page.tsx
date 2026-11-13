"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell, friendlyAuthError } from "@/components/auth-shell";
import { Button, Field, inputCls } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/browser";

function Form() {
  const sp = useSearchParams();
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const next = sp.get("next")?.startsWith("/") ? sp.get("next")! : "/app";
  return (
    <form noValidate className="space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setErr("");
      if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email address.");
      if (!pw) return setErr("Enter your password.");
      setBusy(true);
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password: pw });
      if (error) { setErr(friendlyAuthError(error.message)); setBusy(false); return; }
      window.location.href = next;
    }}>
      <Field label="Email" id="email"><input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
      <Field label="Password" id="pw"><input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} /></Field>
      {err && <p role="alert" className="text-sm text-rose">{err}</p>}
      <Button variant="primary" type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
      <Link href="/auth/reset" className="block text-center text-sm text-accent hover:underline">Forgot your password?</Link>
    </form>
  );
}
export default function SignIn() {
  return <AuthShell title="Welcome back" subtitle="Sign in to your library." footer={<>New to PaperTrail? <Link href="/auth/sign-up" className="text-accent hover:underline">Create an account</Link></>}><Suspense><Form /></Suspense></AuthShell>;
}
