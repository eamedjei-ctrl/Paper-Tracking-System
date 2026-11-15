import Link from "next/link";
import { Workflow } from "lucide-react";
import { STAGES, step } from "@/lib/workflow";

/** Shows where the current page sits in the workflow diagram, linking to it. */
export function WorkflowBadge({ id }: { id: string }) {
  const s = step(id);
  const st = STAGES[s.stage];
  return (
    <Link href={`/app/workflow#${s.id}`} title="See this step in the workflow"
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-0.5 text-[11px] font-medium text-ink-2 hover:border-ink-3 hover:text-ink">
      <Workflow className="size-3" aria-hidden />
      <span className="rounded-full px-1.5 font-semibold" style={{ background: st.soft, color: st.color }}>Step {s.n}</span>
      {st.label} · {s.label}
    </Link>
  );
}
