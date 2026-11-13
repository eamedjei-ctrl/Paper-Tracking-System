"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { X, Check, AlertCircle, Circle, CircleDashed, CircleCheck, RotateCcw, Info } from "lucide-react";
import { cn } from "@/lib/util";
import { dur, ease, pop, spring } from "@/lib/motion";
import type { ReadingStatus, Priority } from "@/lib/types";
import { STATUS_LABEL, PRIORITY_LABEL } from "@/lib/types";

/* ---------- Button ---------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" };
export function Button({ variant = "secondary", size = "md", className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-[background,box-shadow,color,transform] duration-150 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-accent text-accent-ink shadow-sm hover:brightness-110",
        variant === "secondary" && "bg-card text-ink border border-line hover:bg-stone shadow-[var(--shadow-card)]",
        variant === "ghost" && "text-ink-2 hover:bg-stone hover:text-ink",
        variant === "danger" && "bg-rose text-white hover:brightness-110",
        className,
      )}
    />
  );
}

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cn("rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)]", className)} />;
}

/* ---------- Status & priority ---------- */
const statusStyle: Record<ReadingStatus, string> = {
  unread: "bg-stone text-ink-2 border-line",
  in_progress: "bg-accent-soft text-accent border-transparent",
  read: "bg-mint-soft text-mint border-transparent",
  revisit: "bg-amber-soft text-amber border-transparent",
};
const StatusIcon = ({ s }: { s: ReadingStatus }) =>
  s === "read" ? <CircleCheck className="size-3.5" aria-hidden /> : s === "in_progress" ? <CircleDashed className="size-3.5" aria-hidden /> : s === "revisit" ? <RotateCcw className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />;

export function StatusPill({ status, layoutId }: { status: ReadingStatus; layoutId?: string }) {
  return (
    <motion.span layout layoutId={layoutId} transition={spring.snappy} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", statusStyle[status])}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: dur.fast }} className="inline-flex items-center gap-1">
          <StatusIcon s={status} />
          {STATUS_LABEL[status]}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

export function PriorityBadge({ p }: { p: Priority }) {
  const bars = p === "high" ? 3 : p === "medium" ? 2 : 1;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", p === "high" ? "text-amber" : "text-ink-3")} title={`${PRIORITY_LABEL[p]} priority`}>
      <span className="flex items-end gap-px" aria-hidden>
        {[1, 2, 3].map((i) => <span key={i} className={cn("w-[3px] rounded-sm", i <= bars ? "bg-current" : "bg-line")} style={{ height: 4 + i * 3 }} />)}
      </span>
      {PRIORITY_LABEL[p]}
    </span>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Reading progress"} className="h-1.5 w-full overflow-hidden rounded-full bg-stone">
      <motion.div className={cn("h-full rounded-full", value >= 100 ? "bg-mint" : "bg-accent")} initial={false} animate={{ width: `${value}%` }} transition={spring.soft} />
    </div>
  );
}

export function Tag({ children, onRemove, active, onClick }: { children: React.ReactNode; onRemove?: () => void; active?: boolean; onClick?: () => void }) {
  const C = onClick ? "button" : "span";
  return (
    <C onClick={onClick} className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs", active ? "border-accent bg-accent-soft text-accent" : "border-line bg-paper text-ink-2", onClick && "hover:border-ink-3")}>
      #{children}
      {onRemove && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label={`Remove tag ${children}`} className="rounded hover:text-rose"><X className="size-3" /></button>
      )}
    </C>
  );
}

/* ---------- Form fields ---------- */
export function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: string; children: React.ReactNode; id: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-ink-3">{hint}</p>}
      {error && <p id={`${id}-err`} className="flex items-center gap-1 text-xs text-rose"><AlertCircle className="size-3.5" aria-hidden />{error}</p>}
    </div>
  );
}
export const inputCls = "w-full rounded-[10px] border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft aria-[invalid=true]:border-rose";

/* ---------- Dialog ---------- */
export function Dialog({ open, onClose, title, description, children, wide }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>("[autofocus], input, textarea, select, button:not([data-close])");
      el?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus(); };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur.base }} onClick={onClose} />
          <motion.div
            ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId}
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: dur.base, ease: ease.out }}
            className={cn("relative flex max-h-[min(90dvh,820px)] w-full flex-col rounded-t-2xl border border-line bg-card shadow-[var(--shadow-lift)] sm:rounded-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2 id={titleId} className="font-serif text-lg font-semibold">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
              </div>
              <button data-close onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-ink-3 hover:bg-stone hover:text-ink"><X className="size-5" /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Menu ---------- */
export function Menu({ trigger, children, align = "end", label }: { trigger: (p: { onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu" }) => React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "start" | "end"; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = [...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
        const i = items.indexOf(document.activeElement as HTMLElement);
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    setTimeout(() => ref.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus(), 20);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger({ onClick: () => setOpen((o) => !o), "aria-expanded": open, "aria-haspopup": "menu" })}
      <AnimatePresence>
        {open && (
          <motion.div role="menu" aria-label={label} {...pop} style={{ transformOrigin: align === "end" ? "top right" : "top left" }}
            className={cn("absolute z-40 mt-1 min-w-48 rounded-xl border border-line bg-card p-1 shadow-[var(--shadow-lift)]", align === "end" ? "right-0" : "left-0")}>
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick} className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm focus:bg-stone focus:outline-none hover:bg-stone", danger ? "text-rose" : "text-ink")}>
      {children}
    </button>
  );
}

/* ---------- Toasts ---------- */
type Toast = { id: number; msg: string; kind: "success" | "error" | "info"; action?: { label: string; run: () => void } };
const ToastCtx = createContext<(msg: string, kind?: Toast["kind"], action?: Toast["action"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((msg: string, kind: Toast["kind"] = "success", action?: Toast["action"]) => {
    const id = Date.now() + Math.random();
    setItems((t) => [...t.slice(-2), { id, msg, kind, action }]);
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), action ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={spring.snappy}
              className="pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-ink px-4 py-2.5 text-sm text-paper shadow-[var(--shadow-lift)]" role={t.kind === "error" ? "alert" : "status"}>
              {t.kind === "success" ? <Check className="size-4 text-mint" aria-hidden /> : t.kind === "error" ? <AlertCircle className="size-4 text-rose" aria-hidden /> : <Info className="size-4" aria-hidden />}
              <span>{t.msg}</span>
              {t.action && <button className="font-semibold underline underline-offset-2" onClick={() => { t.action!.run(); setItems((x) => x.filter((y) => y.id !== t.id)); }}>{t.action.label}</button>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <div className="relative mb-5 h-16 w-20" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="absolute inset-x-2 h-12 rounded-md border border-line bg-card shadow-[var(--shadow-card)]"
            style={{ top: i * 4, left: 8 + i * 4 }} initial={reduce ? false : { y: 10, opacity: 0, rotate: 0 }} animate={{ y: 0, opacity: 1, rotate: (i - 1) * 5 }} transition={{ delay: i * 0.08, ...spring.soft }}>
            <div className="m-2 h-1 w-8 rounded bg-line" /><div className="mx-2 h-1 w-5 rounded bg-line" />
          </motion.div>
        ))}
      </div>
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-3">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber", className)}>Demo data</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}
