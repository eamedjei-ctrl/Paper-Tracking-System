"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LayoutDashboard, Users, Activity, CreditCard, ScrollText, LogOut, ShieldCheck, FlaskConical, Menu as MenuIcon, X, RefreshCw } from "lucide-react";
import { useAdmin } from "@/lib/admin";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/util";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

function Nav({ onNav }: { onNav?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link key={href} href={href} onClick={onNav} aria-current={active ? "page" : undefined} className={cn("relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium", active ? "text-ink" : "text-ink-3 hover:bg-stone hover:text-ink")}>
            {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-lg bg-card ring-1 ring-line" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <Icon className={cn("relative size-[18px]", active && "text-accent")} aria-hidden /><span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { mode, me, signOut, refresh } = useAdmin();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { if (mode === "signed_out") router.replace("/admin/login"); }, [mode, router]);

  if (mode === "loading" || mode === "signed_out") return <div className="dark min-h-dvh bg-paper p-8"><Skeleton className="h-8 w-48" /><div className="mt-8 grid gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div></div>;

  const footer = (
    <div className="border-t border-line pt-4">
      <div className="flex items-center gap-3 px-1">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><ShieldCheck className="size-4" aria-hidden /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{me?.email}</p><p className="text-xs capitalize text-ink-3">{me?.role}</p></div>
        <button onClick={async () => { await signOut(); router.push("/admin/login"); }} aria-label="Sign out of admin" title="Sign out" className="rounded-md p-2 text-ink-3 hover:bg-stone hover:text-ink"><LogOut className="size-4" /></button>
      </div>
    </div>
  );

  return (
    <div className="dark flex min-h-dvh bg-paper text-ink">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-stone/60 p-4 lg:flex">
        <div className="mb-1 px-2"><Logo /></div>
        <p className="mb-6 px-2 text-[11px] font-semibold uppercase tracking-widest text-accent">Admin</p>
        <Nav />
        <div className="mt-auto">{footer}</div>
      </aside>
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setDrawer(true)} aria-label="Open admin navigation" className="-ml-2 rounded-md p-2 hover:bg-stone"><MenuIcon className="size-5" /></button>
        <span className="flex items-center gap-2"><Logo /><span className="text-[11px] font-semibold uppercase tracking-widest text-accent">Admin</span></span>
        <span className="w-9" />
      </div>
      <AnimatePresence>{drawer && (
        <div className="dark fixed inset-0 z-50 lg:hidden">
          <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
          <motion.aside role="dialog" aria-modal="true" aria-label="Admin navigation" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.22 }} className="absolute inset-y-0 left-0 flex w-72 flex-col bg-paper p-4">
            <div className="mb-6 flex items-center justify-between"><Logo /><button onClick={() => setDrawer(false)} aria-label="Close" className="rounded-md p-1.5 hover:bg-stone"><X className="size-5" /></button></div>
            <Nav onNav={() => setDrawer(false)} /><div className="mt-auto">{footer}</div>
          </motion.aside>
        </div>)}</AnimatePresence>
      <main className="min-w-0 flex-1 px-4 pb-12 pt-20 sm:px-6 lg:px-10 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          {mode === "demo" ? (
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-amber/30 bg-amber-soft px-4 py-2 text-[13px] text-ink-2"><FlaskConical className="size-4 text-amber" aria-hidden /><span><strong className="text-ink">Admin demo.</strong> Fictional accounts and activity stored only in this browser. Blocking here doesn't affect real users.</span></div>
          ) : (
            <div className="mb-5 flex justify-end"><button onClick={refresh} className="inline-flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink"><RefreshCw className="size-3.5" aria-hidden />Refresh data</button></div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
