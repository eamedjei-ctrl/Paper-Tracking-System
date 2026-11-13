import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/plan-service";
import { MAX_PDF_BYTES } from "@/lib/plans";

const idOk = (s: string | null): s is string => !!s && /^[0-9a-f-]{36}$/i.test(s);

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { sb, user } = auth;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const paperId = form?.get("paperId") as string | null;
  if (!(file instanceof File) || !idOk(paperId)) return NextResponse.json({ error: "Missing file or paper" }, { status: 400 });
  if (file.size > MAX_PDF_BYTES) return NextResponse.json({ error: "PDF is larger than 50 MB" }, { status: 413 });
  // Check content, not just extension or declared type
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...head) !== "%PDF-") return NextResponse.json({ error: "That file isn't a valid PDF" }, { status: 415 });

  const { data: paper } = await sb.from("papers").select("id,pdf_path,pdf_size").eq("id", paperId).eq("owner_id", user.id).maybeSingle();
  if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  const { ent } = await getEntitlements(sb, user.id);
  const { data: sizes } = await sb.from("papers").select("pdf_size").eq("owner_id", user.id);
  const used = (sizes ?? []).reduce((s, r) => s + (r.pdf_size ?? 0), 0) - (paper.pdf_size ?? 0);
  if (used + file.size > ent.storageBytes) return NextResponse.json({ error: "This upload would exceed your storage allowance" }, { status: 402 });

  const path = `${user.id}/${paperId}.pdf`;
  const { error } = await sb.storage.from("papers").upload(path, file, { contentType: "application/pdf", upsert: true });
  if (error) return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  const name = file.name.slice(0, 200);
  await sb.from("papers").update({ pdf_path: path, pdf_name: name, pdf_size: file.size }).eq("id", paperId);
  await sb.from("activity_events").insert({ owner_id: user.id, paper_id: paperId, kind: "upload", message: "Attached a PDF" });
  return NextResponse.json({ pdf: { name, size: file.size, path } });
}

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const paperId = req.nextUrl.searchParams.get("paperId");
  if (!idOk(paperId)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { data: p } = await auth.sb.from("papers").select("pdf_path").eq("id", paperId).eq("owner_id", auth.user.id).maybeSingle();
  if (!p?.pdf_path) return NextResponse.json({ error: "No PDF attached" }, { status: 404 });
  const { data, error } = await auth.sb.storage.from("papers").createSignedUrl(p.pdf_path, 300);
  if (error || !data) return NextResponse.json({ error: "Couldn't open PDF" }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const paperId = req.nextUrl.searchParams.get("paperId");
  if (!idOk(paperId)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { data: p } = await auth.sb.from("papers").select("pdf_path").eq("id", paperId).eq("owner_id", auth.user.id).maybeSingle();
  if (p?.pdf_path) await auth.sb.storage.from("papers").remove([p.pdf_path]);
  await auth.sb.from("papers").update({ pdf_path: null, pdf_name: null, pdf_size: null }).eq("id", paperId).eq("owner_id", auth.user.id);
  return NextResponse.json({ ok: true });
}
