import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

const mapStatus = (s: Stripe.Subscription.Status) =>
  s === "active" ? "active" : s === "trialing" ? "trialing" : s === "past_due" || s === "unpaid" ? "past_due" : s === "canceled" || s === "incomplete_expired" ? "canceled" : "none";

/** The ONLY place paid entitlements are granted: verified Stripe events. */
export async function POST(req: NextRequest) {
  if (!stripeConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig ?? "", process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object as Stripe.Subscription;
    const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const status = event.type === "customer.subscription.deleted" ? "canceled" : mapStatus(sub.status);
    const periodEnd = sub.items?.data?.[0]?.current_period_end;
    const admin = supabaseAdmin();
    const { error } = await admin.from("subscriptions").update({
      plan: status === "canceled" || status === "none" ? "standard" : "premium",
      status,
      stripe_subscription_id: sub.id,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("stripe_customer_id", customer);
    if (error) return NextResponse.json({ error: "DB update failed" }, { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
