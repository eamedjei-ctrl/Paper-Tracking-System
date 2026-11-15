"use client";
import { useAdmin } from "@/lib/admin";
import { Card, EmptyState } from "@/components/ui";

export default function AdminAudit() {
  const { overview } = useAdmin();
  const list = overview?.audit ?? [];
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-ink-3">Every block and unblock, who did it, and why. Entries can't be edited from the panel.</p>
      <div className="mt-6">
        {list.length === 0 ? <EmptyState title="No admin actions yet" body="Blocking or unblocking an account will be recorded here." /> : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-line bg-stone/60 text-left text-xs uppercase tracking-wide text-ink-3"><tr><th className="px-4 py-2.5 font-medium">When</th><th className="px-3 py-2.5 font-medium">Action</th><th className="px-3 py-2.5 font-medium">Account</th><th className="px-3 py-2.5 font-medium">Reason</th><th className="px-4 py-2.5 font-medium">Admin</th></tr></thead>
              <tbody className="divide-y divide-line">{list.map((a) => (
                <tr key={a.id}><td className="whitespace-nowrap px-4 py-2.5 text-ink-2">{new Date(a.at).toLocaleString()}</td>
                  <td className="px-3 py-2.5"><span className={a.action === "block" ? "rounded-full bg-rose-soft px-2 py-0.5 text-xs font-medium text-rose" : "rounded-full bg-mint-soft px-2 py-0.5 text-xs font-medium text-mint"}>{a.action}</span></td>
                  <td className="px-3 py-2.5">{a.target_email}</td><td className="px-3 py-2.5 text-ink-2">{a.reason ?? "—"}</td><td className="px-4 py-2.5 text-ink-3">{a.admin_email}</td></tr>))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
