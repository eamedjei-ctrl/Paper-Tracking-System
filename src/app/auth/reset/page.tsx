"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button, Field, inputCls } from "@/components/ui";
import { api, backendEnabled } from "@/lib/api";
import { NOT_CONFIGURED } from "@/components/auth-shell";

export default function Reset() {
  const [email, setEmail] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to choose a new one." footer={<Link href="/auth/sign-in" className="text-accent hover:underline">Back to sign in</Link>}>
      {done ? <p role="status" className="text-sm">If an account exists for <strong>{email}</strong>, a reset link is on its way.</p> : (
        <form noValidate className="space-y-4" onSubmit={async (e) => {
          e.preventDefault(); setErr("");
          if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email address.");
          if (!backendEnabled) { setErr(NOT_CONFIGURED); return; }
          setBusy(true);
          try { await api("/auth/reset-password", { method: "POST", json: { email, redirectTo: `${location.origin}/auth/update-password` } }); }
          catch (err) { if (err instanceof Error && /rate|429/i.test(err.message)) { setBusy(false); return setErr("Too many requests. Please wait a minute."); } }
          setBusy(false);
          setDone(true);
        }}>
          <Field label="Email" id="email" error={err}><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
          <Button variant="primary" type="submit" disabled={busy} className="w-full">{busy ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
    </AuthShell>
  );
}
