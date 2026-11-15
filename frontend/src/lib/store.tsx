"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Workspace, Paper, Collection, Folder, Reminder, Profile, SavedView, ActivityEvent, Filters } from "./types";
import { STATUS_LABEL } from "./types";
import { sampleWorkspace, emptyWorkspace } from "./sample";
import { entitlementsFor, type Entitlements } from "./plans";
import { uid, now } from "./util";

export type Mode = "loading" | "demo" | "signed_out";
export type SaveState = "idle" | "saving" | "saved" | "error";

const DEMO_KEY = "papertrail-demo-v1";

/** Frontend-only: all data lives in this browser (demo mode). */
export class LimitError extends Error {}

/** Drop undefined keys so `{ id: undefined }` from a form never overwrites a generated id. */
const defined = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

type NewPaper = Partial<Omit<Paper, "id" | "addedAt" | "updatedAt">> & { title: string };

interface Ctx {
  mode: Mode;
  ws: Workspace;
  ent: Entitlements;
  saveState: SaveState;
  userEmail: string | null;
  enterDemo: () => void;
  resetDemo: () => void;
  exitDemo: () => void;
  addPaper: (p: NewPaper) => Promise<Paper>;
  importPapers: (ps: NewPaper[], source: "bibtex" | "ris") => Promise<number>;
  updatePapers: (ids: string[], patch: Partial<Paper>, log?: string) => Promise<void>;
  deletePapers: (ids: string[]) => Promise<void>;
  setStatus: (id: string, s: Paper["status"]) => Promise<void>;
  upsertCollection: (c: Partial<Collection> & { name: string }) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<() => void>;
  upsertFolder: (f: Partial<Folder> & { name: string }) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;
  moveCollection: (id: string, folderId: string | null) => Promise<void>;
  setCollectionPapers: (id: string, add: string[], remove: string[]) => Promise<void>;
  upsertReminder: (r: Partial<Reminder> & { text: string; due: string }) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  addComment: (paperId: string, collectionId: string, body: string) => Promise<void>;
  invite: (collectionId: string, email: string, role: "editor" | "viewer") => Promise<void>;
  respondInvite: (id: string, accept: boolean) => Promise<void>;
  updateProfile: (p: Partial<Profile>) => Promise<void>;
  saveView: (name: string, query: string, filters: Filters) => Promise<void>;
  deleteView: (id: string) => Promise<void>;
  simulatePlan: (plan: Workspace["plan"], status: Workspace["subscriptionStatus"]) => void;
  reload: () => Promise<void>;
}

const StoreCtx = createContext<Ctx | null>(null);

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

function fill(p: NewPaper, id = uid()): Paper {
  const t = now();
  return {
    id, title: p.title.trim(), authors: p.authors ?? [], year: p.year ?? null, venue: p.venue ?? "", abstract: p.abstract ?? "",
    doi: p.doi ?? "", url: p.url ?? "", tags: p.tags ?? [], status: p.status ?? "unread", priority: p.priority ?? "medium",
    progress: p.progress ?? (p.status === "read" ? 100 : 0), summary: p.summary ?? "", notes: p.notes ?? "", takeaways: p.takeaways ?? [],
    questions: p.questions ?? [], tasks: p.tasks ?? [], pdf: p.pdf ?? null, metadataSource: p.metadataSource ?? "manual",
    addedAt: t, updatedAt: t, assignedTo: p.assignedTo ?? null,
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [ws, setWs] = useState<Workspace>(() => emptyWorkspace());
  // Light is the default theme; dark is opt-in from Settings.
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const userEmail = null as string | null;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const wsRef = useRef(ws);
  wsRef.current = ws;

  const load = useCallback(async () => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(DEMO_KEY) : null;
    if (raw) {
      try { const w = JSON.parse(raw) as Workspace; if (w.profile.theme === "system") w.profile.theme = "light"; w.folders ??= []; setWs(w); setMode("demo"); return; } catch { localStorage.removeItem(DEMO_KEY); }
    }
    setMode("signed_out");
  }, []);

  useEffect(() => { load(); }, [load]);

  // persist demo
  useEffect(() => {
    if (mode === "demo") localStorage.setItem(DEMO_KEY, JSON.stringify(ws));
  }, [ws, mode]);

  // theme + motion prefs
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = ws.profile.theme === "dark" || (ws.profile.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    root.classList.toggle("reduce-motion", ws.profile.reduceMotion);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [ws.profile.theme, ws.profile.reduceMotion]);

  const ent = useMemo(() => entitlementsFor(ws.plan, ws.subscriptionStatus), [ws.plan, ws.subscriptionStatus]);

  /** Apply a change to the workspace (persisted to localStorage by the effect above). */
  const commit = useCallback(async (mut: (w: Workspace) => Workspace) => {
    const next = mut(wsRef.current);
    wsRef.current = next;
    setWs(next);
    setSaveState("saved");
  }, []);

  const log = (w: Workspace, ev: Omit<ActivityEvent, "id" | "at">): Workspace => ({ ...w, activity: [{ ...ev, id: uid(), at: now() }, ...w.activity].slice(0, 500) });

  const api: Ctx = {
    mode, ws, ent, saveState, userEmail,
    enterDemo: () => { const s = sampleWorkspace(); setWs(s); wsRef.current = s; setMode("demo"); localStorage.setItem(DEMO_KEY, JSON.stringify(s)); },
    resetDemo: () => { const s = sampleWorkspace(); setWs(s); wsRef.current = s; },
    exitDemo: () => { localStorage.removeItem(DEMO_KEY); setWs(emptyWorkspace()); setMode("signed_out"); },
    reload: load,

    addPaper: async (input) => {
      const w = wsRef.current;
      if (ent.maxPapers !== null && w.papers.length >= ent.maxPapers) throw new LimitError(`Your plan allows up to ${ent.maxPapers} papers.`);
      const p = fill(input);
      await commit((w) => log({ ...w, papers: [p, ...w.papers] }, { paperId: p.id, kind: "added", message: `Added “${p.title}”` }));
      return p;
    },
    importPapers: async (inputs, source) => {
      if (!ent.bulkImport) throw new LimitError("Bulk import is a Premium feature.");
      const w = wsRef.current;
      if (ent.maxPapers !== null && w.papers.length + inputs.length > ent.maxPapers) throw new LimitError("Import would exceed your paper limit.");
      const ps = inputs.map((i) => fill({ ...i, metadataSource: source }));
      await commit((w) => log({ ...w, papers: [...ps, ...w.papers] }, { paperId: null, kind: "import", message: `Imported ${ps.length} papers from ${source.toUpperCase()}` }));
      return ps.length;
    },
    updatePapers: async (ids, patch, message) => {
      const set = new Set(ids);
      const t = now();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _i, addedAt: _a, updatedAt: _u, pdf: _p, ...data } = patch as Paper;
      await commit((w) => {
        const nw = { ...w, papers: w.papers.map((p) => (set.has(p.id) ? { ...p, ...patch, updatedAt: t } : p)) };
        return message ? log(nw, { paperId: ids.length === 1 ? ids[0] : null, kind: "note", message }) : nw;
      });
    },
    setStatus: async (id, s) => {
      const p = wsRef.current.papers.find((x) => x.id === id);
      if (!p || p.status === s) return;
      const progress = s === "read" ? 100 : s === "unread" ? 0 : s === "in_progress" ? Math.max(p.progress, 10) : p.progress;
      await commit((w) => log({ ...w, papers: w.papers.map((x) => (x.id === id ? { ...x, status: s, progress, updatedAt: now() } : x)) },
        { paperId: id, kind: "status", message: `Marked “${p.title}” as ${STATUS_LABEL[s]}` }));
    },
    deletePapers: async (ids) => {
      const set = new Set(ids);
      await commit((w) => ({ ...w, papers: w.papers.filter((p) => !set.has(p.id)), collections: w.collections.map((c) => ({ ...c, paperIds: c.paperIds.filter((x) => !set.has(x)) })) }));
    },

    upsertCollection: async (c) => {
      const w = wsRef.current;
      const existing = c.id ? w.collections.find((x) => x.id === c.id) : undefined;
      if (!existing && ent.maxCollections !== null && w.collections.length >= ent.maxCollections) throw new LimitError(`Your plan allows up to ${ent.maxCollections} collections.`);
      if (c.shared && !ent.sharedProjects) throw new LimitError("Shared projects are a Premium feature.");
      const full: Collection = { id: uid(), description: "", color: "#3048d6", paperIds: [], shared: false, goal: null, folderId: null, createdAt: now(), ...existing, ...defined(c) } as Collection;
      await commit((w) => ({ ...w, collections: existing ? w.collections.map((x) => (x.id === full.id ? full : x)) : [...w.collections, full],
        members: !existing && full.shared ? { ...w.members, [full.id]: [{ email: userEmail ?? "you@example.com", name: "You", role: "owner", status: "active" }] } : w.members }));
      return full;
    },
    deleteCollection: async (id) => {
      const removed = wsRef.current.collections.find((c) => c.id === id);
      await commit((w) => ({ ...w, collections: w.collections.filter((c) => c.id !== id) }));
      return () => {
        if (!removed) return;
        commit((w) => ({ ...w, collections: [...w.collections, removed] })).catch(() => {});
      };
    },
    upsertFolder: async (f) => {
      const existing = f.id ? wsRef.current.folders.find((x) => x.id === f.id) : undefined;
      const full: Folder = { id: uid(), color: "#3048d6", createdAt: now(), ...existing, ...defined(f) } as Folder;
      await commit((w) => ({ ...w, folders: existing ? w.folders.map((x) => (x.id === full.id ? full : x)) : [...w.folders, full] }));
      return full;
    },
    deleteFolder: async (id) => {
      // Collections inside are kept and moved to "Not in a folder"
      await commit((w) => ({ ...w, folders: w.folders.filter((f) => f.id !== id), collections: w.collections.map((c) => (c.folderId === id ? { ...c, folderId: null } : c)) }));
    },
    moveCollection: async (id, folderId) => {
      const c = wsRef.current.collections.find((x) => x.id === id);
      if (!c) return;
      await commit((w) => ({ ...w, collections: w.collections.map((x) => (x.id === id ? { ...x, folderId } : x)) }));
    },
    setCollectionPapers: async (id, add, remove) => {
      const c = wsRef.current.collections.find((x) => x.id === id);
      await commit((w) => log({ ...w, collections: w.collections.map((x) => x.id === id ? { ...x, paperIds: [...new Set([...x.paperIds.filter((p) => !remove.includes(p)), ...add])] } : x) },
        { paperId: add.length === 1 ? add[0] : remove.length === 1 ? remove[0] : null, kind: "collection", message: add.length ? `Added ${add.length} paper${add.length > 1 ? "s" : ""} to ${c?.name}` : `Removed ${remove.length} paper${remove.length > 1 ? "s" : ""} from ${c?.name}` }));
    },

    upsertReminder: async (r) => {
      const full: Reminder = { id: uid(), paperId: null, done: false, ...wsRef.current.reminders.find((x) => x.id === r.id), ...defined(r) } as Reminder;
      const isNew = !wsRef.current.reminders.some((x) => x.id === full.id);
      if (isNew && !ent.customReminders) throw new LimitError("Custom reminders are a Premium feature.");
      await commit((w) => ({ ...w, reminders: isNew ? [...w.reminders, full] : w.reminders.map((x) => (x.id === full.id ? full : x)) }));
    },
    deleteReminder: async (id) => commit((w) => ({ ...w, reminders: w.reminders.filter((r) => r.id !== id) })),

    addComment: async (paperId, collectionId, body) => {
      const c = { id: uid(), paperId, author: wsRef.current.profile.name || "You", body, createdAt: now() };
      await commit((w) => log({ ...w, comments: [...w.comments, c] }, { paperId, kind: "comment", message: "Commented on a shared paper" }));
    },
    invite: async (collectionId, email, role) => {
      if (!ent.sharedProjects) throw new LimitError("Shared projects are a Premium feature.");
      await commit((w) => ({ ...w, members: { ...w.members, [collectionId]: [...(w.members[collectionId] ?? []), { email, name: email.split("@")[0], role, status: "invited" }] } }));
    },
    respondInvite: async (id, accept) => {
      await commit((w) => ({ ...w, invitations: w.invitations.map((i) => (i.id === id ? { ...i, status: accept ? "accepted" : "declined" } : i)) }));
    },
    updateProfile: async (p) => commit((w) => ({ ...w, profile: { ...w.profile, ...p } })),
    saveView: async (name, query, filters) => {
      if (!ent.savedSearches) throw new LimitError("Saved searches are a Premium feature.");
      const v: SavedView = { id: uid(), name, query, filters };
      await commit((w) => ({ ...w, savedViews: [...w.savedViews, v] }));
    },
    deleteView: async (id) => commit((w) => ({ ...w, savedViews: w.savedViews.filter((v) => v.id !== id) })),
    simulatePlan: (plan, subscriptionStatus) => {
      setWs((w) => ({ ...w, plan, subscriptionStatus }));
    },
  };

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}
