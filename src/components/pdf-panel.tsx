"use client";
import { useRef, useState } from "react";
import { FileText, Upload, ExternalLink, Trash2, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Card, useToast } from "./ui";
import { formatBytes } from "@/lib/util";
import { MAX_PDF_BYTES } from "@/lib/plans";
import type { Paper } from "@/lib/types";

// Demo-mode PDFs live only for this browser session.
const demoBlobs = new Map<string, string>();

async function looksLikePdf(f: File) {
  const head = new Uint8Array(await f.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head) === "%PDF-";
}

export function PdfPanel({ paper }: { paper: Paper }) {
  const { mode, updatePapers, ws, ent } = useStore();
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const used = ws.papers.reduce((s, p) => s + (p.pdf?.size ?? 0), 0);

  const upload = async (f?: File) => {
    setErr("");
    if (!f) return;
    if (f.size > MAX_PDF_BYTES) return setErr(`That file is ${formatBytes(f.size)}. The limit is ${formatBytes(MAX_PDF_BYTES)} per PDF.`);
    if (used + f.size > ent.storageBytes) return setErr("This upload would exceed your storage allowance. Remove a PDF or upgrade your plan.");
    if (!(await looksLikePdf(f))) return setErr("That file isn't a valid PDF.");
    if (mode === "demo") {
      demoBlobs.set(paper.id, URL.createObjectURL(f));
      await updatePapers([paper.id], { pdf: { name: f.name, size: f.size, path: "demo-session" } });
      toast("PDF attached for this session");
      return;
    }
    setProgress(0);
    const fd = new FormData(); fd.append("file", f); fd.append("paperId", paper.id);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = async () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        const j = JSON.parse(xhr.responseText);
        await updatePapers([paper.id], { pdf: j.pdf }).catch(() => {});
        toast("PDF uploaded");
      } else {
        try { setErr(JSON.parse(xhr.responseText).error); } catch { setErr("Upload failed. Please try again."); }
      }
    };
    xhr.onerror = () => { setProgress(null); setErr("Network error during upload. Check your connection and try again."); };
    xhr.send(fd);
  };

  const open = async () => {
    if (mode === "demo") {
      const u = demoBlobs.get(paper.id);
      if (u) window.open(u, "_blank", "noopener"); else setErr("Demo PDFs are kept only for the browser session in which they were attached. Attach it again to view.");
      return;
    }
    const r = await fetch(`/api/upload?paperId=${paper.id}`);
    const j = await r.json();
    if (r.ok) window.open(j.url, "_blank", "noopener"); else setErr(j.error || "Couldn't open PDF");
  };

  const remove = async () => {
    if (mode === "cloud") {
      const r = await fetch(`/api/upload?paperId=${paper.id}`, { method: "DELETE" });
      if (!r.ok) return setErr("Couldn't remove the PDF.");
    }
    demoBlobs.delete(paper.id);
    await updatePapers([paper.id], { pdf: null });
    toast("PDF removed");
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold">PDF</h2>
      {paper.pdf ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-paper p-3">
          <FileText className="size-8 shrink-0 text-rose" aria-hidden />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{paper.pdf.name}</p><p className="text-xs text-ink-3">{formatBytes(paper.pdf.size)}{mode === "demo" && " · this session only"}</p></div>
          <Button size="sm" onClick={open} aria-label="Open PDF"><ExternalLink className="size-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={remove} aria-label="Remove PDF"><Trash2 className="size-3.5" /></Button>
        </div>
      ) : progress !== null ? (
        <div className="space-y-2" role="status"><p className="text-sm">Uploading… {progress}%</p><div className="h-1.5 rounded-full bg-stone"><div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} /></div></div>
      ) : (
        <button onClick={() => ref.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files[0]); }}
          className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-line px-4 py-6 text-center text-sm hover:border-accent hover:bg-accent-soft/30">
          <Upload className="size-5 text-accent" aria-hidden /><span className="mt-1 font-medium">Attach PDF</span><span className="text-xs text-ink-3">Up to {formatBytes(MAX_PDF_BYTES)}</span>
        </button>
      )}
      <input ref={ref} type="file" accept="application/pdf" className="sr-only" aria-label="PDF file" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      {err && <p role="alert" className="mt-2 flex gap-1.5 text-xs text-rose"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />{err}</p>}
      {paper.url && <a href={paper.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline">Open source page<ExternalLink className="size-3" aria-hidden /></a>}
    </Card>
  );
}
