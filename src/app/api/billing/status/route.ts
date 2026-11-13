import { NextResponse } from "next/server";
import { stripeConfigured } from "@/lib/stripe";
export async function GET() { return NextResponse.json({ configured: stripeConfigured() }); }
