import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/server";
import { opSchema, type Op, paperFields } from "@/lib/ops";
import { getEntitlements, EntitlementError } from "@/lib/plan-service";
import type { Entitlements } from "@/lib/plans";

const body = z.object({ ops: z.array(opSchema).min(1).max(20) });
type PaperData = z.infer<typeof paperFields>;

function paperRow(d: Partial<PaperData>) {
  const r: Record<string, unknown> = {};
  for (const k of ["title", "authors", "year", "venue", "abstract", "doi", "url", "status", "priority", "progress"] as const) if (d[k] !== undefined) r[k] = d[k];
  if (d.metadataSource !== undefined) r.metadata_source = d.metadataSource;
  if (d.assignedTo !== undefined) r.assigned_to = d.assignedTo;
  return r;
}
function noteRow(d: Partial<PaperData>) {
  const r: Record<string, unknown> = {};
  for (const k of ["summary", "notes", "takeaways", "questions"] as const) if (d[k] !== undefined) r[k] = d[k];
  return r;
}

async function setTags(sb: SupabaseClient, uid: string, paperId: string, names: string[]) {
  await sb.from("paper_tags").delete().eq("paper_id", paperId);
  if (!names.length) return;
  const { data } = await sb.from("tags").upsert(names.map((name) => ({ owner_id: uid, name })), { onConflict: "owner_id,name" }).select("id");
  if (data?.length) await sb.from("paper_tags").insert(data.map((t) => ({ paper_id: paperId, tag_id: t.id })));
}
async function setTasks(sb: SupabaseClient, uid: string, paperId: string, tasks: PaperData["tasks"]) {
  await sb.from("tasks").delete().eq("paper_id", paperId);
  if (tasks.length) await sb.from("tasks").insert(tasks.map((t, i) => ({ id: /^[0-9a-f-]{36}$/.test(t.id) ? t.id : undefined, paper_id: paperId, owner_id: uid, text: t.text, done: t.done, position: i })));
}

async function createPapers(sb: SupabaseClient, uid: string, ent: Entitlements, items: { id: string; data: PaperData }[]) {
  if (ent.maxPapers !== null) {
    const { count } = await sb.from("papers").select("id", { count: "exact", head: true }).eq("owner_id", uid);
    if ((count ?? 0) + items.length > ent.maxPapers) throw new EntitlementError(`Your plan allows up to ${ent.maxPapers} papers.`);
  }
  const { error } = await sb.from("papers").insert(items.map(({ id, data }) => ({ id, owner_id: uid, ...paperRow(data) })));
  if (error) throw error;
  await sb.from("paper_notes").insert(items.map(({ id, data }) => ({ paper_id: id, owner_id: uid, ...noteRow(data) })));
  for (const { id, data } of items) {
    if (data.tags.length) await setTags(sb, uid, id, data.tags);
    if (data.tasks.length) await setTasks(sb, uid, id, data.tasks);
  }
}

async function apply(sb: SupabaseClient, uid: string, email: string, name: string, ent: Entitlements, op: Op) {
  switch (op.type) {
    case "paper.create": {
      await createPapers(sb, uid, ent, [op]);
      return sb.from("activity_events").insert({ owner_id: uid, paper_id: op.id, kind: "added", message: `Added “${op.data.title.slice(0, 200)}”` });
    }
    case "paper.import": {
      if (!ent.bulkImport) throw new EntitlementError("Bulk import is a Premium feature.");
      await createPapers(sb, uid, ent, op.items);
      return sb.from("activity_events").insert({ owner_id: uid, kind: "import", message: `Imported ${op.items.length} papers from ${op.source.toUpperCase()}` });
    }
    case "paper.update": {
      const pr = paperRow(op.data);
      if (Object.keys(pr).length) {
        const { error } = await sb.from("papers").update({ ...pr, updated_at: new Date().toISOString() }).in("id", op.ids).eq("owner_id", uid);
        if (error) throw error;
        if (op.data.status) await sb.from("activity_events").insert(op.ids.map((id) => ({ owner_id: uid, paper_id: id, kind: "status", message: `Changed status to ${op.data.status}${op.data.status === "read" ? " — as Read" : ""}` })));
      }
      const nr = noteRow(op.data);
      if (Object.keys(nr).length) for (const id of op.ids) {
        const { error } = await sb.from("paper_notes").upsert({ paper_id: id, owner_id: uid, ...nr, updated_at: new Date().toISOString() });
        if (error) throw error;
      }
      if (op.data.tags) for (const id of op.ids) await setTags(sb, uid, id, op.data.tags);
      if (op.data.tasks) for (const id of op.ids) await setTasks(sb, uid, id, op.data.tasks);
      return;
    }
    case "paper.delete": {
      const { data } = await sb.from("papers").select("id,pdf_path").in("id", op.ids).eq("owner_id", uid);
      const paths = (data ?? []).map((p) => p.pdf_path).filter(Boolean) as string[];
      if (paths.length) await sb.storage.from("papers").remove(paths);
      return sb.from("papers").delete().in("id", op.ids).eq("owner_id", uid);
    }
    case "collection.upsert": {
      const { data: existing } = await sb.from("collections").select("id").eq("id", op.id).maybeSingle();
      if (!existing && ent.maxCollections !== null) {
        const { count } = await sb.from("collections").select("id", { count: "exact", head: true }).eq("owner_id", uid);
        if ((count ?? 0) >= ent.maxCollections) throw new EntitlementError(`Your plan allows up to ${ent.maxCollections} collections.`);
      }
      if (op.data.shared && !ent.sharedProjects) throw new EntitlementError("Shared projects are a Premium feature.");
      const { folderId, ...rest } = op.data;
      const { error } = await sb.from("collections").upsert({ id: op.id, owner_id: uid, ...rest, ...(folderId !== undefined ? { folder_id: folderId } : {}), updated_at: new Date().toISOString() });
      if (error) throw error;
      return;
    }
    case "folder.upsert": {
      const { error } = await sb.from("folders").upsert({ id: op.id, owner_id: uid, ...op.data });
      if (error) throw error;
      return;
    }
    case "folder.delete": return sb.from("folders").delete().eq("id", op.id).eq("owner_id", uid);
    case "collection.delete": return sb.from("collections").delete().eq("id", op.id).eq("owner_id", uid);
    case "collection.papers": {
      if (op.remove.length) await sb.from("collection_papers").delete().eq("collection_id", op.id).in("paper_id", op.remove);
      if (op.add.length) { const { error } = await sb.from("collection_papers").upsert(op.add.map((paper_id) => ({ collection_id: op.id, paper_id }))); if (error) throw error; }
      return;
    }
    case "reminder.upsert": {
      const { data: existing } = await sb.from("reminders").select("id").eq("id", op.id).maybeSingle();
      if (!existing && !ent.customReminders) throw new EntitlementError("Custom reminders are a Premium feature.");
      return sb.from("reminders").upsert({ id: op.id, owner_id: uid, paper_id: op.data.paperId, text: op.data.text, due: op.data.due, done: op.data.done });
    }
    case "reminder.delete": return sb.from("reminders").delete().eq("id", op.id);
    case "comment.create": return sb.from("comments").insert({ id: op.id, paper_id: op.paperId, collection_id: op.collectionId, author_id: uid, author_name: name || email.split("@")[0], body: op.body });
    case "invite.create": {
      if (!ent.sharedProjects) throw new EntitlementError("Shared projects are a Premium feature.");
      return sb.from("invitations").insert({ collection_id: op.collectionId, email: op.email.toLowerCase(), role: op.role, invited_by: uid });
    }
    case "invite.respond": return sb.rpc("accept_invitation", { inv: op.id, accept: op.accept });
    case "profile.update": {
      const d = op.data; const r: Record<string, unknown> = { updated_at: new Date().toISOString() };
      const map = { name: "name", role: "role", interests: "interests", onboarded: "onboarded", weeklyGoal: "weekly_goal", theme: "theme", reduceMotion: "reduce_motion", notifyReminders: "notify_reminders", notifyComments: "notify_comments" } as const;
      for (const [k, col] of Object.entries(map)) if (d[k as keyof typeof d] !== undefined) r[col] = d[k as keyof typeof d];
      return sb.from("profiles").update(r).eq("id", uid);
    }
    case "view.upsert":
      if (!ent.savedSearches) throw new EntitlementError("Saved searches are a Premium feature.");
      return sb.from("saved_views").upsert({ id: op.id, owner_id: uid, name: op.name, query: op.query, filters: op.filters });
    case "view.delete": return sb.from("saved_views").delete().eq("id", op.id);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { sb, user } = auth;
  const { ent } = await getEntitlements(sb, user.id);
  const { data: prof } = await sb.from("profiles").select("name").eq("id", user.id).maybeSingle();
  try {
    for (const op of parsed.data.ops) {
      const res = await apply(sb, user.id, user.email ?? "", prof?.name ?? "", ent, op);
      if (res && "error" in res && res.error) throw res.error;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EntitlementError) return NextResponse.json({ error: e.message }, { status: 402 });
    console.error("ops failed", { user: user.id, type: parsed.data.ops.map((o) => o.type) }); // no content logged
    return NextResponse.json({ error: "Couldn't save your change" }, { status: 500 });
  }
}
