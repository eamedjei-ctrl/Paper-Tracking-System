import { NextResponse } from "next/server";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { stripe, stripeConfigured, appUrl } from "@/lib/stripe";

export async function POST() {
  if (!stripeConfigured()) return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = supabaseAdmin();
  const { data: sub } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", auth.user.id).maybeSingle();
  let customer = sub?.stripe_customer_id as string | undefined;
  if (!customer) {
    const c = await stripe().customers.create({ email: auth.user.email, metadata: { user_id: auth.user.id } });
    customer = c.id;
    await admin.from("subscriptions").upsert({ user_id: auth.user.id, stripe_customer_id: customer });
  }
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: auth.user.id,
    line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
    subscription_data: { metadata: { user_id: auth.user.id } },
    success_url: `${appUrl()}/app/plans?checkout=success`,
    cancel_url: `${appUrl()}/app/plans?checkout=cancel`,
  });
  return NextResponse.json({ url: session.url });
}
