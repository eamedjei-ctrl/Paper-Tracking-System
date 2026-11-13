import { Check } from "lucide-react";
import { PLANS, PRICE_LABELS } from "@/lib/plans";
import type { PlanId } from "@/lib/types";
import { cn } from "@/lib/util";

export function PlanCards({ current, action }: { current?: PlanId; action?: (p: PlanId) => React.ReactNode }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(Object.keys(PLANS) as PlanId[]).map((id) => {
        const p = PLANS[id];
        const featured = id === "premium";
        return (
          <div key={id} className={cn("relative flex flex-col rounded-2xl border p-6", featured ? "border-accent bg-card shadow-[var(--shadow-lift)]" : "border-line bg-card")}>
            {current === id && <span className="absolute right-4 top-4 rounded-full bg-mint-soft px-2 py-0.5 text-xs font-semibold text-mint">Current plan</span>}
            <h3 className="font-serif text-xl font-semibold">{p.name}</h3>
            <p className="mt-1 text-sm text-ink-3">{p.blurb}</p>
            <p className="mt-4 font-serif text-2xl font-semibold">{PRICE_LABELS[id] || <span className="text-base font-normal text-ink-3">Price set by the workspace owner</span>}</p>
            <ul className="mt-5 flex-1 space-y-2">
              {p.features.map((f) => <li key={f} className="flex gap-2 text-sm"><Check className={cn("mt-0.5 size-4 shrink-0", featured ? "text-accent" : "text-mint")} aria-hidden />{f}</li>)}
            </ul>
            {action && <div className="mt-6">{action(id)}</div>}
          </div>
        );
      })}
    </div>
  );
}
