"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { FileText, Check } from "lucide-react";
import type { Paper } from "@/lib/types";
import { authorLine, cn } from "@/lib/util";
import { PriorityBadge, ProgressBar, StatusPill, Tag } from "./ui";
import { spring } from "@/lib/motion";

export function PaperCard({ p, view = "grid", selected, onSelect }: { p: Paper; view?: "grid" | "list"; selected?: boolean; onSelect?: (v: boolean) => void }) {
  const checkbox = onSelect && (
    <label className={cn("flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors", selected ? "border-accent bg-accent text-accent-ink" : "border-line bg-card hover:border-ink-3")}>
      <input type="checkbox" className="sr-only" checked={!!selected} onChange={(e) => onSelect(e.target.checked)} aria-label={`Select ${p.title}`} />
      {selected && <Check className="size-3.5" aria-hidden />}
    </label>
  );
  if (view === "list") {
    return (
      <motion.li layout="position" layoutId={`paper-${p.id}`} transition={spring.soft} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className={cn("group flex items-center gap-3 border-b border-line px-3 py-3 last:border-0 sm:px-4", selected && "bg-accent-soft/40")}>
        {checkbox}
        <div className="min-w-0 flex-1">
          <Link href={`/app/papers/${p.id}`} className="line-clamp-1 font-medium hover:text-accent">{p.title}</Link>
          <p className="truncate text-xs text-ink-3">{authorLine(p.authors, 2)} · {p.year ?? "n.d."}{p.venue && ` · ${p.venue}`}</p>
        </div>
        <div className="hidden w-28 md:block"><PriorityBadge p={p.priority} /></div>
        <div className="w-28 shrink-0 text-right"><StatusPill status={p.status} /></div>
      </motion.li>
    );
  }
  return (
    <motion.li layout="position" layoutId={`paper-${p.id}`} transition={spring.soft} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
      className={cn("group relative flex flex-col rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-card)] transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]", selected ? "border-accent" : "border-line")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <StatusPill status={p.status} />
        <div className="flex items-center gap-2">
          {p.pdf && <FileText className="size-4 text-ink-3" aria-label="Has PDF" />}
          {checkbox}
        </div>
      </div>
      <Link href={`/app/papers/${p.id}`} className="font-serif text-[17px] font-semibold leading-snug after:absolute after:inset-0 after:content-[''] hover:text-accent">
        <span className="line-clamp-3">{p.title}</span>
      </Link>
      <p className="mt-1.5 line-clamp-1 text-[13px] text-ink-2">{authorLine(p.authors)}</p>
      <p className="line-clamp-1 text-xs text-ink-3">{p.year ?? "n.d."}{p.venue && ` · ${p.venue}`}</p>
      <div className="mt-3 flex flex-wrap gap-1">{p.tags.slice(0, 4).map((t) => <Tag key={t}>{t}</Tag>)}</div>
      <div className="mt-auto flex items-center gap-3 pt-4">
        <ProgressBar value={p.progress} label={`Progress for ${p.title}`} />
        <PriorityBadge p={p.priority} />
      </div>
      {/* keep checkbox clickable above the stretched link */}
      <style>{`.group label{position:relative;z-index:1}`}</style>
    </motion.li>
  );
}
