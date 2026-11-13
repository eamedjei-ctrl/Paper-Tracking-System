import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { entitlementsFor, type Entitlements } from "./plans";
import type { PlanId, SubscriptionStatus } from "./types";

/** Authoritative entitlement lookup. Reads the webhook-maintained subscriptions row only. */
export async function getEntitlements(sb: SupabaseClient, userId: string): Promise<{ plan: PlanId; status: SubscriptionStatus; ent: Entitlements }> {
  const { data } = await sb.from("subscriptions").select("plan,status").eq("user_id", userId).maybeSingle();
  const plan = (data?.plan ?? "standard") as PlanId;
  const status = (data?.status ?? "none") as SubscriptionStatus;
  const ent = { ...entitlementsFor(plan, status), aiFeatures: false };
  return { plan, status, ent };
}

export class EntitlementError extends Error { status = 402; }
