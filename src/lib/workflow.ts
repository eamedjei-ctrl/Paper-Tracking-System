/** Mirrors docs/PaperTrail-Workflow.pdf (page 1). Keep in sync when the diagram changes. */
export type Stage = "start" | "collect" | "read" | "organize" | "output";
export interface WorkflowStep { id: string; n: number; label: string; href: string; stage: Stage; desc: string; premium?: boolean; next: string[] }

export const STAGES: Record<Stage, { label: string; color: string; soft: string }> = {
  start: { label: "Get started", color: "var(--amber)", soft: "var(--amber-soft)" },
  collect: { label: "Collect", color: "var(--accent)", soft: "var(--accent-soft)" },
  read: { label: "Read", color: "var(--mint)", soft: "var(--mint-soft)" },
  organize: { label: "Organize", color: "var(--accent)", soft: "var(--accent-soft)" },
  output: { label: "Cite & share", color: "var(--ink)", soft: "var(--stone)" },
};

export const WORKFLOW: WorkflowStep[] = [
  { id: "landing", n: 1, label: "Landing page", href: "/", stage: "start", desc: "Learn what PaperTrail does and compare plans.", next: ["demo", "auth"] },
  { id: "demo", n: 2, label: "Explore demo", href: "/app", stage: "start", desc: "Try everything with sample papers, stored only in this browser.", next: ["onboarding"] },
  { id: "auth", n: 3, label: "Sign up / Sign in", href: "/auth/sign-in", stage: "start", desc: "Create an account or sign back in; reset a forgotten password.", next: ["onboarding"] },
  { id: "onboarding", n: 4, label: "Onboarding", href: "/onboarding", stage: "start", desc: "Tell us your role and interests — or skip.", next: ["dashboard"] },
  { id: "dashboard", n: 5, label: "Dashboard", href: "/app", stage: "start", desc: "Your counts, weekly goal, what to continue and upcoming reminders.", next: ["add"] },
  { id: "add", n: 6, label: "Add papers", href: "/app/add", stage: "collect", desc: "Manual entry, DOI lookup, or BibTeX/RIS import.", next: ["review", "library"] },
  { id: "review", n: 7, label: "Review + duplicates", href: "/app/add?tab=doi", stage: "collect", desc: "Check fetched details and duplicate warnings before anything is saved.", next: ["paper"] },
  { id: "library", n: 8, label: "Library", href: "/app/library", stage: "collect", desc: "Search, filter, sort and bulk-edit every paper.", next: ["views"] },
  { id: "paper", n: 9, label: "Paper page", href: "/app/library", stage: "read", desc: "Status, progress, priority, tags and the PDF for one paper.", next: ["notes"] },
  { id: "notes", n: 10, label: "Read & take notes", href: "/app/library?status=in_progress", stage: "read", desc: "Summary, autosaved notes, takeaways, questions and tasks.", next: ["collections"] },
  { id: "views", n: 11, label: "Saved views", href: "/app/views", stage: "organize", desc: "Reusable searches and filters, plus ⌘K quick search.", premium: true, next: ["notes"] },
  { id: "collections", n: 12, label: "Collections", href: "/app/collections", stage: "organize", desc: "Group papers into projects with goals and a reading order.", next: ["reminders", "shared", "export"] },
  { id: "reminders", n: 13, label: "Reminders", href: "/app/reminders", stage: "organize", desc: "Dated nudges for papers, shown on your dashboard.", premium: true, next: ["add"] },
  { id: "shared", n: 14, label: "Shared projects", href: "/app/shared", stage: "output", desc: "Invite collaborators, comment and assign reviews. Notes stay private.", premium: true, next: ["export"] },
  { id: "export", n: 15, label: "Cite & export", href: "/app/export", stage: "output", desc: "Build a bibliography in APA, MLA, Chicago or BibTeX and export your data.", next: [] },
];

export const step = (id: string) => WORKFLOW.find((s) => s.id === id)!;
