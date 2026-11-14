"use client";
import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button, Field, inputCls } from "@/components/ui";
import { NOT_CONFIGURED } from "@/components/auth-shell";

export default function SignUp() {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({}); const busy = false; const sent = false;
  return (
    <AuthShell title={sent ? "Check your email" : "Start your library"} subtitle={sent ? undefined : "Free to start on the Standard plan."} footer={<>Already have an account? <Link href="/auth/sign-in" className="text-accent hover:underline">Sign in</Link></>}>
      {sent ? (
        <div className="text-center text-sm"><MailCheck className="mx-auto mb-3 size-8 text-mint" aria-hidden /><p>We sent a confirmation link to <strong>{email}</strong>. Open it to finish creating your account.</p></div>
      ) : (
        <form noValidate className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          const v: Record<string, string> = {};
          if (!/^\S+@\S+\.\S+$/.test(email)) v.email = "Enter a valid email address.";
          if (pw.length < 8) v.pw = "Use at least 8 characters.";
          setErrs(v); if (Object.keys(v).length) return;
          setErrs({ form: NOT_CONFIGURED });
        }}>
          <Field label="Name (optional)" id="name"><input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
          <Field label="Email" id="email" error={errs.email}><input id="email" type="email" autoComplete="email" aria-invalid={!!errs.email} value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
          <Field label="Password" id="pw" error={errs.pw} hint="At least 8 characters"><input id="pw" type="password" autoComplete="new-password" aria-invalid={!!errs.pw} value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} /></Field>
          {errs.form && <p role="alert" className="text-sm text-rose">{errs.form}</p>}
          <Button variant="primary" type="submit" disabled={busy} className="w-full">{busy ? "Creating account…" : "Create account"}</Button>
        </form>
      )}
    </AuthShell>
  );
}
