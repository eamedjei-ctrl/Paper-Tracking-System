"use client";
import { useState, useId } from "react";
import { Button, Field, inputCls, Tag } from "./ui";
import type { Paper, Priority, ReadingStatus } from "@/lib/types";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/types";
import { parseAuthorString } from "@/lib/importers";
import { cn } from "@/lib/util";

export type Draft = { title: string; authors: string; year: string; venue: string; abstract: string; doi: string; url: string; tags: string[]; status: ReadingStatus; priority: Priority };
export const emptyDraft: Draft = { title: "", authors: "", year: "", venue: "", abstract: "", doi: "", url: "", tags: [], status: "unread", priority: "medium" };

export const draftFromPaper = (p: Pick<Paper, "title" | "authors" | "year" | "venue" | "abstract" | "doi" | "url" | "tags" | "status" | "priority">): Draft => ({
  title: p.title, authors: p.authors.map((a) => (a.given ? `${a.given} ${a.family}` : a.family)).join(" and "), year: p.year ? String(p.year) : "",
  venue: p.venue, abstract: p.abstract, doi: p.doi, url: p.url, tags: p.tags, status: p.status, priority: p.priority,
});

export function validateDraft(d: Draft) {
  const e: Partial<Record<keyof Draft, string>> = {};
  if (!d.title.trim()) e.title = "Add a title so you can find this paper later.";
  if (d.year && !/^\d{4}$/.test(d.year)) e.year = "Use a four-digit year, e.g. 2023.";
  if (d.doi && !/^10\.\S+\/\S+$/.test(d.doi.trim())) e.doi = "DOIs look like 10.1145/3290605.3300233.";
  if (d.url && !/^https?:\/\/\S+$/.test(d.url.trim())) e.url = "Use a full link starting with https://";
  return e;
}

export function draftToPaper(d: Draft) {
  return {
    title: d.title.trim(), authors: parseAuthorString(d.authors), year: d.year ? Number(d.year) : null, venue: d.venue.trim(), abstract: d.abstract.trim(),
    doi: d.doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""), url: d.url.trim(), tags: d.tags, status: d.status, priority: d.priority,
  };
}

export function PaperForm({ value, onChange, errors, onSubmit, submitLabel, busy, extra }: { value: Draft; onChange: (d: Draft) => void; errors: Partial<Record<keyof Draft, string>>; onSubmit: () => void; submitLabel: string; busy?: boolean; extra?: React.ReactNode }) {
  const id = useId();
  const [tag, setTag] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => onChange({ ...value, [k]: v });
  const addTag = () => { const t = tag.trim().toLowerCase().replace(/\s+/g, "-"); if (t && !value.tags.includes(t)) set("tags", [...value.tags, t]); setTag(""); };
  const f = (k: keyof Draft) => ({ id: `${id}-${k}`, "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${id}-${k}-err` : undefined });
  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
      <Field label="Title" id={`${id}-title`} error={errors.title}><input {...f("title")} value={value.title} onChange={(e) => set("title", e.target.value)} className={inputCls} placeholder="Paper title" /></Field>
      <Field label="Authors" id={`${id}-authors`} hint='Separate with "and" — e.g. "Saleema Amershi and Dan Weld" or "Amershi, Saleema and Weld, Dan"'><input {...f("authors")} value={value.authors} onChange={(e) => set("authors", e.target.value)} className={inputCls} /></Field>
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <Field label="Year" id={`${id}-year`} error={errors.year}><input {...f("year")} inputMode="numeric" value={value.year} onChange={(e) => set("year", e.target.value)} className={inputCls} placeholder="2024" /></Field>
        <Field label="Venue" id={`${id}-venue`}><input {...f("venue")} value={value.venue} onChange={(e) => set("venue", e.target.value)} className={inputCls} placeholder="Journal or conference" /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="DOI" id={`${id}-doi`} error={errors.doi}><input {...f("doi")} value={value.doi} onChange={(e) => set("doi", e.target.value)} className={inputCls} placeholder="10.xxxx/xxxxx" /></Field>
        <Field label="URL" id={`${id}-url`} error={errors.url}><input {...f("url")} type="url" value={value.url} onChange={(e) => set("url", e.target.value)} className={inputCls} placeholder="https://" /></Field>
      </div>
      <Field label="Abstract" id={`${id}-abstract`}><textarea {...f("abstract")} rows={4} value={value.abstract} onChange={(e) => set("abstract", e.target.value)} className={inputCls} /></Field>
      <Field label="Tags" id={`${id}-tag`} hint="Press Enter to add a tag">
        <div className={cn(inputCls, "flex flex-wrap items-center gap-1.5 py-1.5")}>
          {value.tags.map((t) => <Tag key={t} onRemove={() => set("tags", value.tags.filter((x) => x !== t))}>{t}</Tag>)}
          <input id={`${id}-tag`} value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }} onBlur={addTag} className="min-w-24 flex-1 bg-transparent py-0.5 outline-none" placeholder={value.tags.length ? "" : "e.g. methods"} />
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Reading status" id={`${id}-status`}><select {...f("status")} value={value.status} onChange={(e) => set("status", e.target.value as ReadingStatus)} className={inputCls}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Priority" id={`${id}-priority`}><select {...f("priority")} value={value.priority} onChange={(e) => set("priority", e.target.value as Priority)} className={inputCls}>{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      </div>
      {extra}
      <div className="flex justify-end pt-2"><Button variant="primary" type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button></div>
    </form>
  );
}
