"use client";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button, Field, inputCls } from "@/components/ui";
import { NOT_CONFIGURED } from "@/components/auth-shell";

export default function UpdatePassword() {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const busy = false;
  return (
    <AuthShell title="Choose a new password">
      <form noValidate className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setErr("");
        if (pw.length < 8) return setErr("Use at least 8 characters.");
        setErr(NOT_CONFIGURED);
      }}>
        <Field label="New password" id="pw" error={err}><input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} /></Field>
        <Button variant="primary" type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : "Save password"}</Button>
      </form>
    </AuthShell>
  );
}
