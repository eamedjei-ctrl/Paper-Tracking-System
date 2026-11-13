import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/server";
export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  return NextResponse.json({ email: a.user.email, role: a.role });
}
