import "server-only";
import Stripe from "stripe";
export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PREMIUM_PRICE_ID && process.env.STRIPE_WEBHOOK_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY);
let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe not configured");
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY));
}
export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
