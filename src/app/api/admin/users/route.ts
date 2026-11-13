import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const a = await requireAdmin();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
  const { data, error } = await a.admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) return NextResponse.json({ error: "Couldn't list users" }, { status: 500 });
  const ids = data.users.map((u) => u.id);
  const [profiles, subs, papers, admins] = await Promise.all([
    a.admin.from("profiles").select("id,name,role,blocked_at,blocked_reason,last_seen_at").in("id", ids),
    a.admin.from("subscriptions").select("user_id,plan,status").in("user_id", ids),
    a.admin.from("papers").select("owner_id,pdf_size").in("owner_id", ids),
    a.admin.from("admins").select("user_id").in("user_id", ids),
  ]);
  const by = <T extends Record<string, unknown>>(rows: T[] | null, k: keyof T) => new Map((rows ?? []).map((r) => [r[k] as string, r]));
  const prof = by(profiles.data, "id"), sub = by(subs.data, "user_id"), adm = new Set((admins.data ?? []).map((r) => r.user_id));
  const counts = new Map<string, { papers: number; bytes: number }>();
  (papers.data ?? []).forEach((p) => { const c = counts.get(p.owner_id) ?? { papers: 0, bytes: 0 }; c.papers++; c.bytes += p.pdf_size ?? 0; counts.set(p.owner_id, c); });
  return NextResponse.json({
    users: data.users.map((u) => {
      const p = prof.get(u.id), s = sub.get(u.id), c = counts.get(u.id);
      return {
        id: u.id, email: u.email ?? "", name: (p?.name as string) ?? "", researchRole: p?.role ?? null,
        joinedAt: u.created_at, lastSignInAt: u.last_sign_in_at ?? null, confirmed: !!u.email_confirmed_at,
        plan: s?.plan ?? "standard", subStatus: s?.status ?? "none", papers: c?.papers ?? 0, storageBytes: c?.bytes ?? 0,
        blockedAt: p?.blocked_at ?? null, blockedReason: p?.blocked_reason ?? null, isAdmin: adm.has(u.id),
      };
    }),
  });
}
