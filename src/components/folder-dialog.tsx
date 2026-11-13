"use client";
import { useEffect, useState } from "react";
import { Button, Dialog, Field, inputCls, useToast } from "./ui";
import { useStore } from "@/lib/store";
import type { Folder } from "@/lib/types";
import { cn } from "@/lib/util";

const COLORS = ["#3048d6", "#7046d6", "#0f8a63", "#a85f00", "#b4233c", "#2b7a9b", "#5a5d6b"];

export function FolderDialog({ open, onClose, existing }: { open: boolean; onClose: () => void; existing?: Folder }) {
  const { upsertFolder, ws } = useStore();
  const toast = useToast();
  const [name, setName] = useState(""); const [color, setColor] = useState(COLORS[0]); const [err, setErr] = useState("");
  useEffect(() => { if (open) { setName(existing?.name ?? ""); setColor(existing?.color ?? COLORS[0]); setErr(""); } }, [open, existing]);
  return (
    <Dialog open={open} onClose={onClose} title={existing ? "Rename project folder" : "New project folder"} description="Folders group related collections — e.g. one per thesis, course or grant.">
      <form noValidate className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        const n = name.trim();
        if (!n) return setErr("Give the folder a name.");
        if (ws.folders.some((f) => f.id !== existing?.id && f.name.toLowerCase() === n.toLowerCase())) return setErr("You already have a folder with that name.");
        try { await upsertFolder({ id: existing?.id, name: n, color }); toast(existing ? "Folder updated" : "Folder created"); onClose(); } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Couldn't save"); }
      }}>
        <Field label="Folder name" id="fname" error={err}><input id="fname" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!err} className={inputCls} placeholder="e.g. PhD thesis" /></Field>
        <fieldset><legend className="mb-1.5 text-[13px] font-medium">Colour</legend>
          <div className="flex gap-2">{COLORS.map((c) => <button type="button" key={c} onClick={() => setColor(c)} aria-label={`Colour ${c}`} aria-pressed={color === c} className={cn("size-7 rounded-full ring-offset-2 ring-offset-card", color === c && "ring-2 ring-ink")} style={{ background: c }} />)}</div>
        </fieldset>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit">{existing ? "Save" : "Create folder"}</Button></div>
      </form>
    </Dialog>
  );
}
