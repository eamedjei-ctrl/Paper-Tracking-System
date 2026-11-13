import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/server";

const body = z.object({ action: z.enum(["block", "unblock"]), reason: z.string().trim().max(500).optional() });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad user id" }, { status: 400 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { action, reason } = parsed.data;
  if (id === a.user.id) return NextResponse.json({ error: "You can't block your own account" }, { status: 400 });
  if (action === "block" && !reason) return NextResponse.json({ error: "Give a reason for blocking" }, { status: 400 });
  const { data: target } = await a.admin.from("admins").select("role").eq("user_id", id).maybeSingle();
  if (target && a.role !== "owner") return NextResponse.json({ error: "Only the owner can block another admin" }, { status: 403 });

  // 1. Ban at the auth layer (stops new sign-ins and token refresh)
  const { data: u, error } = await a.admin.auth.admin.updateUserById(id, { ban_duration: action === "block" ? "876000h" : "none" });
  if (error) return NextResponse.json({ error: "Couldn't update the account" }, { status: 500 });
  // 2. Flag the profile (API routes refuse blocked users immediately)
  await a.admin.from("profiles").update(action === "block" ? { blocked_at: new Date().toISOString(), blocked_reason: reason } : { blocked_at: null, blocked_reason: null }).eq("id", id);
  // 3. Audit
  await a.admin.from("admin_audit").insert({ admin_id: a.user.id, admin_email: a.user.email ?? "", action, target_user_id: id, target_email: u.user?.email ?? null, reason: reason ?? null });
  return NextResponse.json({ ok: true });
}
