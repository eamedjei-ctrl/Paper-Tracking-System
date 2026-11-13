"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Logo } from "./logo";
import { Button, Card } from "./ui";
import { useStore, isSupabaseConfigured } from "@/lib/store";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const { enterDemo } = useStore();
  const router = useRouter();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-stone/40 px-4 py-10">
      <Link href="/" className="mb-8"><Logo /></Link>
      <Card className="w-full max-w-sm p-6">
        <h1 className="font-serif text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
        <div className="mt-6">
          {isSupabaseConfigured ? children : (
            <div className="space-y-4 text-sm">
              <p className="rounded-xl bg-amber-soft p-3 text-ink-2"><strong className="text-ink">Accounts aren't configured on this deployment.</strong> Add Supabase credentials (see README) to enable sign-up and sign-in. You can explore the full product in demo mode meanwhile.</p>
              <Button variant="primary" className="w-full" onClick={() => { enterDemo(); router.push("/app"); }}><FlaskConical className="size-4" aria-hidden />Explore demo</Button>
            </div>
          )}
        </div>
      </Card>
      {footer && <div className="mt-5 text-sm text-ink-3">{footer}</div>}
    </div>
  );
}

export function friendlyAuthError(msg: string) {
  if (/invalid login/i.test(msg)) return "That email and password don't match. Check for typos or reset your password.";
  if (/already registered|already exists/i.test(msg)) return "An account with this email already exists. Try signing in instead.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox for the link.";
  if (/rate limit/i.test(msg)) return "Too many attempts. Please wait a minute and try again.";
  return msg;
}
