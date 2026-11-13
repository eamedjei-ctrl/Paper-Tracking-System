"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { LayoutDashboard, Library, Plus, FolderKanban, Settings, Sparkles, Bell, Bookmark, Users, Quote, Workflow, Menu as MenuIcon, X, Search, LogOut, Cloud, CloudOff, Loader2, Check, FlaskConical } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/util";
import { dur, ease, pop } from "@/lib/motion";
import { Logo } from "./logo";
import { PLANS, effectivePlan } from "@/lib/plans";
import { StatusPill, Skeleton } from "./ui";
import { WorkflowBadge } from "./workflow-badge";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/library", label: "Library", icon: Library },
  { href: "/app/add", label: "Add paper", icon: Plus },
  { href: "/app/collections", label: "Collections", icon: FolderKanban },
  { href: "/app/views", label: "Saved views", icon: Bookmark },
  { href: "/app/reminders", label: "Reminders", icon: Bell },
  { href: "/app/shared", label: "Shared projects", icon: Users },
  { href: "/app/export", label: "Cite & export", icon: Quote },
  { href: "/app/workflow", label: "Workflow", icon: Workflow },
  { href: "/app/plans", label: "Plans & billing", icon: Sparkles },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));

function SaveIndicator() {
  const { saveState, mode } = useStore();
  if (mode === "demo") return <span className="inline-flex items-center gap-1.5 text-xs text-ink-3"><FlaskConical className="size-3.5" aria-hidden />Saved in this browser</span>;
  const map = {
    idle: [Cloud, "All changes saved"], saving: [Loader2, "Saving…"], saved: [Check, "Saved"], error: [CloudOff, "Couldn't save"],
  } as const;
  const [Icon, label] = map[saveState];
  return (
    <span role="status" className={cn("inline-flex items-center gap-1.5 text-xs", saveState === "error" ? "text-rose" : "text-ink-3")}>
      <Icon className={cn("size-3.5", saveState === "saving" && "animate-spin")} aria-hidden />{label}
    </span>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(path, href);
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={cn("relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "text-ink" : "text-ink-2 hover:bg-stone hover:text-ink")}>
            {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg border border-line bg-card shadow-[var(--shadow-card)]" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <Icon className={cn("relative size-[18px]", active && "text-accent")} aria-hidden />
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const { ws, mode, exitDemo, userEmail, ent, saveState } = useStore();
  const router = useRouter();
  const plan = effectivePlan(ws.plan, ws.subscriptionStatus);
  void saveState;
  const signOut = async () => {
    if (mode === "demo") { exitDemo(); router.push("/"); return; }
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/";
  };
  return (
    <div className="space-y-3 border-t border-line pt-4">
      <div className="rounded-xl border border-line bg-card p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">{PLANS[plan].name}{mode === "demo" && <span className="font-normal text-ink-3"> · simulated</span>}</span>
          <span className="text-ink-3">{ws.papers.length}{ent.maxPapers ? ` / ${ent.maxPapers}` : ""} papers</span>
        </div>
        {ent.maxPapers && <div className="mt-2 h-1 rounded-full bg-stone"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (ws.papers.length / ent.maxPapers) * 100)}%` }} /></div>}
      </div>
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{ws.profile.name || userEmail || "Researcher"}</p>
          <SaveIndicator />
        </div>
        <button onClick={signOut} className="rounded-md p-2 text-ink-3 hover:bg-stone hover:text-ink" aria-label={mode === "demo" ? "Leave demo" : "Sign out"} title={mode === "demo" ? "Leave demo" : "Sign out"}><LogOut className="size-4" /></button>
      </div>
    </div>
  );
}

function CommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ws } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const results = useMemo(() => {
    const t = q.toLowerCase().trim();
    const papers = ws.papers.filter((p) => !t || p.title.toLowerCase().includes(t) || p.authors.some((a) => a.family.toLowerCase().includes(t)) || p.tags.some((g) => g.includes(t))).slice(0, 7)
      .map((p) => ({ key: p.id, label: p.title, hint: p.status, href: `/app/papers/${p.id}` }));
    const pages = NAV.filter((n) => !t || n.label.toLowerCase().includes(t)).map((n) => ({ key: n.href, label: n.label, hint: null, href: n.href }));
    return [...papers, ...pages];
  }, [q, ws.papers]);
  useEffect(() => { if (open) { setQ(""); setIdx(0); } }, [open]);
  const go = (href: string) => { onClose(); router.push(href); };
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-ink/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" aria-label="Search papers and pages" {...pop} className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-card shadow-[var(--shadow-lift)]">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 text-ink-3" aria-hidden />
              <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} placeholder="Search papers, authors, tags or pages…" aria-label="Search"
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
                  if (e.key === "Enter" && results[idx]) go(results[idx].href);
                }}
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3" role="combobox" aria-expanded aria-controls="cmd-results" aria-activedescendant={results[idx] ? `cmd-${idx}` : undefined} />
              <kbd className="rounded border border-line px-1.5 text-[11px] text-ink-3">Esc</kbd>
            </div>
            <ul id="cmd-results" role="listbox" className="max-h-80 overflow-y-auto p-1.5">
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-3">No matches for “{q}”</li>}
              {results.map((r, i) => (
                <li key={r.key} id={`cmd-${i}`} role="option" aria-selected={i === idx}>
                  <button onMouseEnter={() => setIdx(i)} onClick={() => go(r.href)} className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm", i === idx && "bg-stone")}>
                    <span className="truncate">{r.label}</span>
                    {r.hint ? <StatusPill status={r.hint as "unread"} /> : <span className="text-xs text-ink-3">Page</span>}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mode, ws } = useStore();
  const router = useRouter();
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [cmd, setCmd] = useState(false);

  useEffect(() => {
    if (mode === "signed_out") router.replace("/auth/sign-in?next=" + encodeURIComponent(path));
    if (mode === "cloud" && !ws.profile.onboarded) router.replace("/onboarding");
  }, [mode, ws.profile.onboarded, router, path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((c) => !c); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  if (mode === "loading" || mode === "signed_out") {
    return (
      <div className="flex min-h-dvh" aria-busy="true" aria-label="Loading your workspace">
        <div className="hidden w-64 border-r border-line p-4 lg:block"><Skeleton className="h-8 w-32" /><div className="mt-8 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div></div>
        <div className="flex-1 p-8"><Skeleton className="h-10 w-72" /><div className="mt-6 grid gap-4 sm:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">Skip to content</a>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-stone/50 p-4 lg:flex">
        <Link href="/app" className="mb-6 px-2"><Logo /></Link>
        <button onClick={() => setCmd(true)} className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink-3 hover:text-ink">
          <Search className="size-4" aria-hidden /> Search<kbd className="ml-auto rounded border border-line px-1 text-[11px]">⌘K</kbd>
        </button>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1"><NavList /></div>
        <div className="mt-3"><SidebarFooter /></div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setDrawer(true)} aria-label="Open navigation" aria-expanded={drawer} className="-ml-2 rounded-md p-2 hover:bg-stone"><MenuIcon className="size-5" /></button>
        <Link href="/app"><Logo /></Link>
        <button onClick={() => setCmd(true)} aria-label="Search" className="-mr-2 rounded-md p-2 hover:bg-stone"><Search className="size-5" /></button>
      </div>

      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside role="dialog" aria-modal="true" aria-label="Navigation" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: dur.base, ease: ease.out }}
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-paper p-4 shadow-[var(--shadow-lift)]">
              <div className="mb-6 flex items-center justify-between px-2"><Logo /><button onClick={() => setDrawer(false)} aria-label="Close navigation" className="rounded-md p-1.5 hover:bg-stone"><X className="size-5" /></button></div>
              <NavList onNavigate={() => setDrawer(false)} />
              <div className="mt-auto"><SidebarFooter /></div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main id="main" className="min-w-0 flex-1 px-4 pb-24 pt-20 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        {mode === "demo" && (
          <div className="mx-auto mb-5 flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber/25 bg-amber-soft/60 px-4 py-2 text-[13px] text-ink-2">
            <FlaskConical className="size-4 text-amber" aria-hidden />
            <span><strong className="text-ink">Demo mode.</strong> Sample papers and a simulated Premium plan, stored only in this browser. Nothing is sent to a server.</span>
          </div>
        )}
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {[NAV[0], NAV[1], NAV[2], NAV[3]].map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-accent" : "text-ink-3")}>
              <Icon className="size-5" aria-hidden />{label.replace(" paper", "")}
            </Link>
          );
        })}
      </nav>

      <CommandSearch open={cmd} onClose={() => setCmd(false)} />
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow, step }: { title: string; description?: string; actions?: React.ReactNode; eyebrow?: React.ReactNode; step?: string }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {(eyebrow || step) && <div className="mb-2 flex flex-wrap items-center gap-2">{step && <WorkflowBadge id={step} />}{eyebrow}</div>}
        <h1 className="font-serif text-[28px] font-semibold leading-tight tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
