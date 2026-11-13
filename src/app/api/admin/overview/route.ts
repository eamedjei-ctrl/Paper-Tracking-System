import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** System-wide stats. Returns counts and event metadata only — never note or paper text. */
export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const db = a.admin;
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [users, blocked, papers, cols, subs, storage, events, audit] = await Promise.all([
    db.from("profiles").select("id,created_at", { count: "exact" }).gte("created_at", since),
    db.from("profiles").select("id", { count: "exact", head: true }).not("blocked_at", "is", null),
    db.from("papers").select("id", { count: "exact", head: true }),
    db.from("collections").select("id", { count: "exact", head: true }),
    db.from("subscriptions").select("plan,status"),
    db.from("papers").select("pdf_size").not("pdf_size", "is", null),
    db.from("activity_events").select("id,owner_id,kind,at").order("at", { ascending: false }).limit(50),
    db.from("admin_audit").select("*").order("at", { ascending: false }).limit(50),
  ]);
  const { count: totalUsers } = await db.from("profiles").select("id", { count: "exact", head: true });
  const ids = [...new Set((events.data ?? []).map((e) => e.owner_id))];
  const emails = new Map<string, string>();
  for (const id of ids) { const { data } = await db.auth.admin.getUserById(id); if (data.user?.email) emails.set(id, data.user.email); }
  return NextResponse.json({
    totals: {
      users: totalUsers ?? 0, blocked: blocked.count ?? 0, papers: papers.count ?? 0, collections: cols.count ?? 0,
      premium: (subs.data ?? []).filter((s) => s.plan === "premium" && ["active", "trialing", "past_due"].includes(s.status)).length,
      pastDue: (subs.data ?? []).filter((s) => s.status === "past_due").length,
      storageBytes: (storage.data ?? []).reduce((n, r) => n + (r.pdf_size ?? 0), 0),
    },
    signups: (users.data ?? []).map((u) => u.created_at),
    events: (events.data ?? []).map((e) => ({ id: e.id, user: emails.get(e.owner_id) ?? "unknown", userId: e.owner_id, kind: e.kind, at: e.at })),
    audit: audit.data ?? [],
  });
}
