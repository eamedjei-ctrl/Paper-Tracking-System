"use client";
import { useMemo, useState } from "react";
import { useAdmin } from "@/lib/admin";
import { KIND_LABEL } from "@/components/admin-ui";
import { Card, inputCls } from "@/components/ui";
import { cn, relTime } from "@/lib/util";

export default function AdminActivity() {
  const { overview } = useAdmin();
  const [kind, setKind] = useState(""); const [q, setQ] = useState("");
  const list = useMemo(() => (overview?.events ?? []).filter((e) => (!kind || e.kind === kind) && (!q || e.user.toLowerCase().includes(q.toLowerCase()))), [overview, kind, q]);
  const byKind = useMemo(() => { const m: Record<string, number> = {}; (overview?.events ?? []).forEach((e) => (m[e.kind] = (m[e.kind] ?? 0) + 1)); return m; }, [overview]);
  const max = Math.max(1, ...Object.values(byKind));
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Activity</h1>
      <p className="mt-1 text-sm text-ink-3">What users are doing across the platform. Shows the type of action only — never note or paper text.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by user email" aria-label="Filter by user email" className={cn(inputCls, "h-10")} />
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by action" className={cn(inputCls.replace("w-full ", ""), "h-10 sm:w-56")}><option value="">All actions</option>{Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          <Card className="divide-y divide-line">
            {list.map((e) => <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"><span className="min-w-0"><span className="block">{KIND_LABEL[e.kind] ?? e.kind}</span><span className="block truncate text-xs text-ink-3">{e.user}</span></span><time className="shrink-0 text-xs text-ink-3" dateTime={e.at} title={new Date(e.at).toLocaleString()}>{relTime(e.at)}</time></div>)}
            {list.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink-3">No matching activity.</p>}
          </Card>
        </div>
        <Card className="h-fit p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold">By action</h2>
          <ul className="space-y-2.5">{Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, n]) => <li key={k}><div className="flex justify-between text-xs"><span>{KIND_LABEL[k] ?? k}</span><span className="tabular-nums text-ink-3">{n}</span></div><div className="mt-1 h-1.5 rounded-full bg-stone"><div className="h-full rounded-full bg-accent" style={{ width: `${(n / max) * 100}%` }} /></div></li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
