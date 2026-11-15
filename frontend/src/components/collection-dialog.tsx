"use client";
import { useEffect, useState } from "react";
import { Button, Dialog, Field, inputCls, useToast } from "./ui";
import { useStore } from "@/lib/store";
import type { Collection } from "@/lib/types";
import { cn } from "@/lib/util";

const COLORS = ["#3048d6", "#7046d6", "#0f8a63", "#a85f00", "#b4233c", "#2b7a9b", "#5a5d6b"];

export function CollectionDialog({ open, onClose, existing, onSaved, defaultFolderId = null }: { open: boolean; onClose: () => void; existing?: Collection; onSaved?: (c: Collection) => void; defaultFolderId?: string | null }) {
  const { upsertCollection, ent, ws } = useStore();
  const [folderId, setFolderId] = useState<string>("");
  const toast = useToast();
  const [name, setName] = useState(""); const [desc, setDesc] = useState(""); const [color, setColor] = useState(COLORS[0]);
  const [goal, setGoal] = useState(""); const [shared, setShared] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { if (open) { setName(existing?.name ?? ""); setDesc(existing?.description ?? ""); setColor(existing?.color ?? COLORS[0]); setGoal(existing?.goal ? String(existing.goal) : ""); setShared(existing?.shared ?? false); setFolderId(existing ? existing.folderId ?? "" : defaultFolderId ?? ""); setErr(""); } }, [open, existing, defaultFolderId]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr("Give the collection a name.");
    try {
      const c = await upsertCollection({ id: existing?.id, name: name.trim(), description: desc.trim(), color, goal: goal ? Math.max(1, +goal) : null, shared, folderId: folderId || null });
      toast(existing ? "Collection updated" : "Collection created"); onClose(); onSaved?.(c);
    } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't save"); }
  };
  return (
    <Dialog open={open} onClose={onClose} title={existing ? "Edit collection" : "New collection"} description="Group papers for a project, chapter or reading group.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Name" id="cname" error={err}><input id="cname" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!err} className={inputCls} placeholder="e.g. Thesis chapter 2" /></Field>
        <Field label="Project folder" id="cfold"><select id="cfold" value={folderId} onChange={(e) => setFolderId(e.target.value)} className={inputCls}><option value="">Not in a folder</option>{ws.folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>
        <Field label="Description (optional)" id="cdesc"><textarea id="cdesc" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} /></Field>
        <fieldset><legend className="mb-1.5 text-[13px] font-medium">Colour</legend>
          <div className="flex gap-2">{COLORS.map((c) => <button type="button" key={c} onClick={() => setColor(c)} aria-label={`Colour ${c}`} aria-pressed={color === c} className={cn("size-7 rounded-full ring-offset-2 ring-offset-card", color === c && "ring-2 ring-ink")} style={{ background: c }} />)}</div>
        </fieldset>
        <Field label="Reading goal (optional)" id="cgoal" hint="Number of papers you aim to finish in this collection"><input id="cgoal" type="number" min={1} value={goal} onChange={(e) => setGoal(e.target.value)} className={cn(inputCls, "w-32")} /></Field>
        <label className={cn("flex items-start gap-3 rounded-xl border border-line p-3 text-sm", !ent.sharedProjects && "opacity-60")}>
          <input type="checkbox" checked={shared} disabled={!ent.sharedProjects || existing?.shared} onChange={(e) => setShared(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span><span className="font-medium">Shared project</span><br /><span className="text-xs text-ink-3">{ent.sharedProjects ? "Invite collaborators to see these papers and comment. Your private notes stay private." : "Shared projects are a Premium feature."}</span></span>
        </label>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit">{existing ? "Save" : "Create collection"}</Button></div>
      </form>
    </Dialog>
  );
}
