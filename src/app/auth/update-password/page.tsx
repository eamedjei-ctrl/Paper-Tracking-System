"use client";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button, Field, inputCls } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/store";
import { NOT_CONFIGURED } from "@/components/auth-shell";

export default function UpdatePassword() {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  return (
    <AuthShell title="Choose a new password">
      <form noValidate className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setErr("");
        if (pw.length < 8) return setErr("Use at least 8 characters.");
        if (!isSupabaseConfigured) { setErr(NOT_CONFIGURED); return; }
          setBusy(true);
        const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
        setBusy(false);
        if (error) return setErr("This reset link has expired. Request a new one.");
        window.location.href = "/app";
      }}>
        <Field label="New password" id="pw" error={err}><input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} /></Field>
        <Button variant="primary" type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : "Save password"}</Button>
      </form>
    </AuthShell>
  );
}
