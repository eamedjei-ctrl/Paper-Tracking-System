"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button, Field, inputCls } from "@/components/ui";
import { NOT_CONFIGURED } from "@/components/auth-shell";

export default function Reset() {
  const [email, setEmail] = useState(""); const [err, setErr] = useState(""); const busy = false; const done = false;
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to choose a new one." footer={<Link href="/auth/sign-in" className="text-accent hover:underline">Back to sign in</Link>}>
      {done ? <p role="status" className="text-sm">If an account exists for <strong>{email}</strong>, a reset link is on its way.</p> : (
        <form noValidate className="space-y-4" onSubmit={async (e) => {
          e.preventDefault(); setErr("");
          if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email address.");
          setErr(NOT_CONFIGURED);
        }}>
          <Field label="Email" id="email" error={err}><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
          <Button variant="primary" type="submit" disabled={busy} className="w-full">{busy ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
    </AuthShell>
  );
}
