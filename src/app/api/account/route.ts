import { NextResponse } from "next/server";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { stripe, stripeConfigured } from "@/lib/stripe";

export async function DELETE() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let admin;
  try { admin = supabaseAdmin(); } catch { return NextResponse.json({ error: "Account deletion requires SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 }); }
  const uid = auth.user.id;
  // 1. Remove stored PDFs
  const { data: files } = await admin.storage.from("papers").list(uid, { limit: 1000 });
  if (files?.length) await admin.storage.from("papers").remove(files.map((f) => `${uid}/${f.name}`));
  // 2. Cancel any subscription
  const { data: sub } = await admin.from("subscriptions").select("stripe_subscription_id").eq("user_id", uid).maybeSingle();
  if (sub?.stripe_subscription_id && stripeConfigured()) await stripe().subscriptions.cancel(sub.stripe_subscription_id).catch(() => {});
  // 3. Delete auth user — cascades to all owned rows
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return NextResponse.json({ error: "Couldn't delete account" }, { status: 500 });
  await auth.sb.auth.signOut().catch(() => {});
  return NextResponse.json({ ok: true });
}
