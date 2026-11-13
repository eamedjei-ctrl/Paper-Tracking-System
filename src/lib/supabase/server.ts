import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const supabaseConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Request-scoped client acting as the signed-in user (RLS applies). */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a Server Component */ } },
    },
  });
}

/** Service-role client. Server-only; used for webhooks, plan lookups and account deletion. */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}

export async function requireUser() {
  if (!supabaseConfigured()) return { error: "Backend not configured", status: 503 as const };
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Not signed in", status: 401 as const };
  const { data: prof } = await sb.from("profiles").select("blocked_at").eq("id", user.id).maybeSingle();
  if (prof?.blocked_at) return { error: "This account has been blocked. Contact support if you think this is a mistake.", status: 403 as const };
  return { sb, user };
}

/** Verifies the caller is a signed-in admin. Admin membership is read with the service role. */
export async function requireAdmin() {
  if (!supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: "Admin backend not configured", status: 503 as const };
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Not signed in", status: 401 as const };
  const admin = supabaseAdmin();
  const { data } = await admin.from("admins").select("role").eq("user_id", user.id).maybeSingle();
  if (!data) return { error: "This account doesn't have admin access", status: 403 as const };
  return { admin, user, role: data.role as "admin" | "owner" };
}
