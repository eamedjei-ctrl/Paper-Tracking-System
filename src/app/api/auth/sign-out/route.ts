import { NextResponse } from "next/server";
import { supabaseServer, supabaseConfigured } from "@/lib/supabase/server";
export async function POST() {
  if (supabaseConfigured()) await (await supabaseServer()).auth.signOut();
  return NextResponse.json({ ok: true });
}
