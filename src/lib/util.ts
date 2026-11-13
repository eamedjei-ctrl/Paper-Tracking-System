import clsx, { type ClassValue } from "clsx";
export const cn = (...c: ClassValue[]) => clsx(c);
export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
export const now = () => new Date().toISOString();
export function authorLine(as: { given: string; family: string }[], max = 3) {
  if (!as.length) return "Unknown authors";
  const names = as.slice(0, max).map((a) => `${a.given ? a.given[0] + ". " : ""}${a.family}`);
  return names.join(", ") + (as.length > max ? ` +${as.length - max}` : "");
}
export function relTime(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const f = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(s);
  if (abs < 60) return "just now";
  if (abs < 3600) return f.format(-Math.round(s / 60), "minute");
  if (abs < 86400) return f.format(-Math.round(s / 3600), "hour");
  return f.format(-Math.round(s / 86400), "day");
}
export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}
export function download(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
