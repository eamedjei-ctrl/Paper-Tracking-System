export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-serif text-[17px] font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <rect x="4" y="3" width="13" height="17" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5" />
        <rect x="7" y="5.5" width="13" height="16" rx="2" fill="var(--card)" stroke="var(--accent)" strokeWidth="1.5" />
        <path d="M10 10h7M10 13h7M10 16h4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      PaperTrail
    </span>
  );
}
