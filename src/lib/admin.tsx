"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface AdminUser {
  id: string; email: string; name: string; researchRole: string | null; joinedAt: string; lastSignInAt: string | null; confirmed: boolean;
  plan: "standard" | "premium"; subStatus: string; papers: number; storageBytes: number; blockedAt: string | null; blockedReason: string | null; isAdmin: boolean;
}
export interface AdminEvent { id: string; user: string; userId: string; kind: string; at: string }
export interface AuditEntry { id: string; admin_email: string; action: "block" | "unblock" | "view_user"; target_email: string | null; target_user_id: string | null; reason: string | null; at: string }
export interface Overview { totals: { users: number; blocked: number; papers: number; collections: number; premium: number; pastDue: number; storageBytes: number }; signups: string[]; events: AdminEvent[]; audit: AuditEntry[] }

type Mode = "loading" | "demo" | "signed_out";
interface Ctx {
  mode: Mode; me: { email: string; role: "admin" | "owner" } | null;
  users: AdminUser[]; overview: Overview | null; error: string;
  refresh: () => Promise<void>;
  setBlocked: (id: string, block: boolean, reason?: string) => Promise<void>;
  enterDemo: () => void; signOut: () => Promise<void>;
}
const AdminCtx = createContext<Ctx | null>(null);
export const useAdmin = () => { const c = useContext(AdminCtx); if (!c) throw new Error("useAdmin outside provider"); return c; };
const KEY = "papertrail-admin-demo-v1";

/* ---------- Demo dataset (fictional accounts, example.* domains) ---------- */
const FIRST = ["Ama", "Kofi", "Lena", "Ravi", "Mei", "Tomas", "Zara", "Owen", "Nadia", "Yusuf", "Ines", "Daniel", "Priya", "Jonah", "Sofia", "Kwame", "Hana", "Leo", "Aisha", "Marco", "Esi", "Felix", "Noor", "Grace"];
const LAST = ["Mensah", "Boateng", "Fischer", "Iyer", "Chen", "Novak", "Ali", "Hughes", "Haddad", "Demir", "Costa", "Okafor", "Nair", "Reed", "Rossi", "Asante", "Sato", "Laurent", "Bello", "Conti", "Owusu", "Weber", "Rahman", "Adjei"];
const ROLES = ["student", "researcher", "lecturer", "team", "other"];
const KINDS = ["added", "status", "note", "collection", "import", "upload", "comment"];
function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function demoData(): { users: AdminUser[]; overview: Overview } {
  const r = rng(42); const now = Date.now(); const day = 864e5;
  const users: AdminUser[] = FIRST.map((f, i) => {
    const joined = now - Math.floor(r() * 120) * day - i * 3600e3;
    const premium = r() < 0.3;
    const papers = Math.floor(r() * (premium ? 400 : 190));
    return {
      id: `u${i + 1}`, email: `${f.toLowerCase()}.${LAST[i].toLowerCase()}@example.edu`, name: `${f} ${LAST[i]}`, researchRole: ROLES[i % 5],
      joinedAt: new Date(joined).toISOString(), lastSignInAt: r() < 0.9 ? new Date(now - Math.floor(r() * 20) * day).toISOString() : null, confirmed: r() < 0.92,
      plan: premium ? "premium" : "standard", subStatus: premium ? (r() < 0.15 ? "past_due" : "active") : "none", papers, storageBytes: Math.floor(papers * r() * 2.5e6),
      blockedAt: null, blockedReason: null, isAdmin: i === 0,
    };
  });
  users[0].email = "admin@papertrail.example"; users[0].name = "Demo Admin";
  users[7].blockedAt = new Date(now - 3 * day).toISOString(); users[7].blockedReason = "Automated bulk sign-ups from the same address";
  const events: AdminEvent[] = Array.from({ length: 60 }, (_, i) => { const u = users[1 + Math.floor(r() * (users.length - 1))]; return { id: `ev${i}`, user: u.email, userId: u.id, kind: KINDS[Math.floor(r() * KINDS.length)], at: new Date(now - i * (r() * 3 + 0.5) * 3600e3).toISOString() }; });
  const audit: AuditEntry[] = [{ id: "a1", admin_email: users[0].email, action: "block", target_email: users[7].email, target_user_id: users[7].id, reason: users[7].blockedReason, at: users[7].blockedAt! }];
  return { users, overview: { totals: { users: 0, blocked: 0, papers: 0, collections: 0, premium: 0, pastDue: 0, storageBytes: 0 }, signups: users.map((u) => u.joinedAt), events, audit } };
}
function totals(users: AdminUser[], o: Overview): Overview {
  return { ...o, totals: {
    users: users.length, blocked: users.filter((u) => u.blockedAt).length, papers: users.reduce((n, u) => n + u.papers, 0), collections: Math.round(users.reduce((n, u) => n + u.papers, 0) / 9),
    premium: users.filter((u) => u.plan === "premium" && u.subStatus !== "canceled").length, pastDue: users.filter((u) => u.subStatus === "past_due").length, storageBytes: users.reduce((n, u) => n + u.storageBytes, 0),
  } };
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [me, setMe] = useState<Ctx["me"]>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const error = "";

  const init = useCallback(async () => {
    const raw = localStorage.getItem(KEY);
    if (raw) { try { const d = JSON.parse(raw); setUsers(d.users); setOverview(totals(d.users, d.overview)); setMe({ email: "admin@papertrail.example", role: "owner" }); setMode("demo"); return; } catch { localStorage.removeItem(KEY); } }
    setMode("signed_out");
  }, []);
  useEffect(() => { init(); }, [init]);

  const persist = (u: AdminUser[], o: Overview) => { localStorage.setItem(KEY, JSON.stringify({ users: u, overview: o })); setUsers(u); setOverview(totals(u, o)); };

  const value: Ctx = {
    mode, me, users, overview, error,
    refresh: async () => {},
    setBlocked: async (id, block, reason) => {
      const target = users.find((u) => u.id === id);
      if (!target) return;
      if (target.isAdmin && block) throw new Error("You can't block your own account");
      const at = new Date().toISOString();
      const nu = users.map((u) => (u.id === id ? { ...u, blockedAt: block ? at : null, blockedReason: block ? reason ?? null : null } : u));
      const entry: AuditEntry = { id: `a${Date.now()}`, admin_email: me?.email ?? "admin", action: block ? "block" : "unblock", target_email: target.email, target_user_id: id, reason: reason ?? null, at };
      persist(nu, { ...overview!, audit: [entry, ...overview!.audit] });
    },
    enterDemo: () => { const d = demoData(); localStorage.setItem(KEY, JSON.stringify(d)); setUsers(d.users); setOverview(totals(d.users, d.overview)); setMe({ email: "admin@papertrail.example", role: "owner" }); setMode("demo"); },
    signOut: async () => {
      localStorage.removeItem(KEY);
      setMode("signed_out"); setMe(null); setUsers([]); setOverview(null);
    },
  };
  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}
