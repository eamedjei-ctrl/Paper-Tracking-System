"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-rose/30 bg-rose-soft p-8 text-center">
      <h2 className="font-serif text-xl font-semibold">Something went wrong on this page</h2>
      <p className="mt-1 text-sm text-ink-2">Your saved work is safe. Try again, or go back to the dashboard.</p>
      <button onClick={reset} className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm text-paper">Try again</button>
    </div>
  );
}
