import { NextResponse } from "next/server";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { stripe, stripeConfigured, appUrl } from "@/lib/stripe";

export async function POST() {
  if (!stripeConfigured()) return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data } = await supabaseAdmin().from("subscriptions").select("stripe_customer_id").eq("user_id", auth.user.id).maybeSingle();
  if (!data?.stripe_customer_id) return NextResponse.json({ error: "No billing account yet" }, { status: 404 });
  const s = await stripe().billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${appUrl()}/app/plans` });
  return NextResponse.json({ url: s.url });
}
