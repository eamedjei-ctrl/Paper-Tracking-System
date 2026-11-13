import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/plan-service";
import type { Workspace, Paper, Collection, Member } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { sb, user } = auth;

  const [prof, sub, papers, notes, tasks, tags, cols, cps, members, comments, reminders, views, activity, invites] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    getEntitlements(sb, user.id),
    sb.from("papers").select("*").order("created_at", { ascending: false }),
    sb.from("paper_notes").select("*"),
    sb.from("tasks").select("*").order("position"),
    sb.from("paper_tags").select("paper_id, tags(name)"),
    sb.from("collections").select("*").order("created_at"),
    sb.from("collection_papers").select("*").order("position"),
    sb.from("collection_members").select("collection_id,user_id,role"),
    sb.from("comments").select("*").order("created_at"),
    sb.from("reminders").select("*"),
    sb.from("saved_views").select("*"),
    sb.from("activity_events").select("*").order("at", { ascending: false }).limit(500),
    sb.from("invitations").select("id,collection_id,email,role,status,collections(name)"),
  ]);
  const err = [papers, notes, cols].find((r) => r.error);
  if (err?.error) return NextResponse.json({ error: "Couldn't load your library" }, { status: 500 });

  const noteBy = new Map((notes.data ?? []).map((n) => [n.paper_id, n]));
  const tagBy = new Map<string, string[]>();
  (tags.data ?? []).forEach((r: { paper_id: string; tags: { name: string } | { name: string }[] | null }) => {
    const t = Array.isArray(r.tags) ? r.tags[0] : r.tags;
    if (t) tagBy.set(r.paper_id, [...(tagBy.get(r.paper_id) ?? []), t.name]);
  });

  const ws: Workspace = {
    profile: {
      name: prof.data?.name ?? "", role: prof.data?.role ?? null, interests: prof.data?.interests ?? [], onboarded: prof.data?.onboarded ?? false,
      weeklyGoal: prof.data?.weekly_goal ?? 3, theme: prof.data?.theme ?? "system", reduceMotion: prof.data?.reduce_motion ?? false,
      notifyReminders: prof.data?.notify_reminders ?? true, notifyComments: prof.data?.notify_comments ?? true,
    },
    plan: sub.plan, subscriptionStatus: sub.status,
    papers: (papers.data ?? []).map((p): Paper => {
      const n = p.owner_id === user.id ? noteBy.get(p.id) : undefined; // collaborators never get notes
      return {
        id: p.id, title: p.title, authors: p.authors, year: p.year, venue: p.venue, abstract: p.abstract, doi: p.doi, url: p.url,
        tags: tagBy.get(p.id) ?? [], status: p.status, priority: p.priority, progress: p.progress,
        summary: n?.summary ?? "", notes: n?.notes ?? "", takeaways: n?.takeaways ?? [], questions: n?.questions ?? [],
        tasks: (tasks.data ?? []).filter((t) => t.paper_id === p.id).map((t) => ({ id: t.id, text: t.text, done: t.done })),
        pdf: p.pdf_path ? { name: p.pdf_name, size: p.pdf_size, path: p.pdf_path } : null,
        metadataSource: p.metadata_source, addedAt: p.created_at, updatedAt: p.updated_at, assignedTo: p.assigned_to,
      };
    }),
    collections: (cols.data ?? []).map((c): Collection => ({
      id: c.id, name: c.name, description: c.description, color: c.color, goal: c.goal, shared: c.shared, createdAt: c.created_at,
      paperIds: (cps.data ?? []).filter((x) => x.collection_id === c.id).map((x) => x.paper_id),
    })),
    members: {},
    comments: (comments.data ?? []).map((c) => ({ id: c.id, paperId: c.paper_id, author: c.author_name || "Member", body: c.body, createdAt: c.created_at })),
    activity: (activity.data ?? []).map((a) => ({ id: a.id, paperId: a.paper_id, kind: a.kind, message: a.message, at: a.at })),
    reminders: (reminders.data ?? []).map((r) => ({ id: r.id, paperId: r.paper_id, text: r.text, due: r.due, done: r.done })),
    savedViews: (views.data ?? []).map((v) => ({ id: v.id, name: v.name, query: v.query, filters: v.filters })),
    invitations: (invites.data ?? []).filter((i) => i.email.toLowerCase() === (user.email ?? "").toLowerCase()).map((i) => ({
      id: i.id, collectionName: (Array.isArray(i.collections) ? i.collections[0]?.name : (i.collections as { name: string } | null)?.name) ?? "Shared project", from: "A collaborator", status: i.status,
    })),
  };
  for (const c of ws.collections.filter((c) => c.shared)) {
    const m: Member[] = (members.data ?? []).filter((x) => x.collection_id === c.id).map((x) => ({ email: x.user_id === user.id ? user.email ?? "" : "member", name: x.user_id === user.id ? "You" : `Member (${x.role})`, role: x.role, status: "active" }));
    const ownerRow = cols.data?.find((x) => x.id === c.id);
    if (ownerRow?.owner_id === user.id && !m.some((x) => x.role === "owner")) m.unshift({ email: user.email ?? "", name: "You", role: "owner", status: "active" });
    (invites.data ?? []).filter((i) => i.collection_id === c.id && i.status === "pending").forEach((i) => m.push({ email: i.email, name: i.email.split("@")[0], role: i.role, status: "invited" }));
    ws.members[c.id] = m;
  }
  return NextResponse.json({ workspace: ws, email: user.email });
}
