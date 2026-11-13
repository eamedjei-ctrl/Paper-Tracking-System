// Shared motion tokens
export const dur = { fast: 0.14, base: 0.22, slow: 0.4 } as const;
export const ease = { out: [0.22, 1, 0.36, 1] as const, inOut: [0.65, 0, 0.35, 1] as const };
export const spring = { snappy: { type: "spring" as const, stiffness: 520, damping: 38 }, soft: { type: "spring" as const, stiffness: 260, damping: 30 } };
export const stagger = 0.06;
export const pop = { initial: { opacity: 0, scale: 0.96, y: -4 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.97, y: -4 }, transition: { duration: dur.fast, ease: ease.out } };
