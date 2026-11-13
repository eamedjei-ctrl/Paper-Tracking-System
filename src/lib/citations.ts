import type { Paper, Author } from "./types";

export type CitationStyle = "apa" | "mla" | "chicago" | "bibtex";

export function missingCitationFields(p: Paper): string[] {
  const m: string[] = [];
  if (!p.authors.length) m.push("authors");
  if (!p.year) m.push("year");
  if (!p.venue) m.push("venue");
  if (!p.title.trim()) m.push("title");
  return m;
}

const initials = (g: string) => g.split(/[\s-]+/).filter(Boolean).map((x) => x[0].toUpperCase() + ".").join(" ");
const apaName = (a: Author) => (a.given ? `${a.family}, ${initials(a.given)}` : a.family);

function apaAuthors(as: Author[]) {
  if (!as.length) return "[Author unknown]";
  if (as.length === 1) return apaName(as[0]);
  if (as.length <= 20) return as.slice(0, -1).map(apaName).join(", ") + ", & " + apaName(as[as.length - 1]);
  return as.slice(0, 19).map(apaName).join(", ") + ", … " + apaName(as[as.length - 1]);
}

function mlaAuthors(as: Author[]) {
  if (!as.length) return "[Author unknown]";
  const first = as[0].given ? `${as[0].family}, ${as[0].given}` : as[0].family;
  if (as.length === 1) return first;
  if (as.length === 2) return `${first}, and ${as[1].given} ${as[1].family}`.trim();
  return `${first}, et al`;
}

function chicagoAuthors(as: Author[]) {
  if (!as.length) return "[Author unknown]";
  const full = (a: Author) => `${a.given} ${a.family}`.trim();
  const first = as[0].given ? `${as[0].family}, ${as[0].given}` : as[0].family;
  if (as.length === 1) return first;
  if (as.length <= 10) return first + ", " + as.slice(1, -1).map(full).join(", ") + (as.length > 2 ? "," : "") + " and " + full(as[as.length - 1]);
  return first + ", " + as.slice(1, 7).map(full).join(", ") + ", et al";
}

const end = (s: string) => (/[.?!]$/.test(s) ? s : s + ".");
const doiPart = (p: Paper) => (p.doi ? ` https://doi.org/${p.doi}` : p.url ? ` ${p.url}` : "");

export function formatCitation(p: Paper, style: CitationStyle): string {
  const year = p.year ? String(p.year) : "n.d.";
  const venue = p.venue || "[Venue unknown]";
  switch (style) {
    case "apa":
      return `${end(apaAuthors(p.authors))} (${year}). ${end(p.title)} ${venue}.${doiPart(p)}`;
    case "mla":
      return `${end(mlaAuthors(p.authors))} “${end(p.title)}” ${venue}, ${year}.${doiPart(p)}`;
    case "chicago":
      return `${end(chicagoAuthors(p.authors))} ${year}. “${end(p.title)}” ${venue}.${doiPart(p)}`;
    case "bibtex":
      return toBibtex(p);
  }
}

export function citeKey(p: Paper) {
  const fam = (p.authors[0]?.family || "unknown").toLowerCase().replace(/[^a-z]/g, "");
  const word = (p.title.toLowerCase().match(/[a-z]{4,}/) || ["paper"])[0];
  return `${fam}${p.year ?? "nd"}${word}`;
}

const bibEsc = (s: string) => s.replace(/[{}]/g, "");

export function toBibtex(p: Paper) {
  const f: [string, string][] = [["title", p.title]];
  if (p.authors.length) f.push(["author", p.authors.map((a) => (a.given ? `${a.family}, ${a.given}` : a.family)).join(" and ")]);
  if (p.year) f.push(["year", String(p.year)]);
  if (p.venue) f.push(["booktitle", p.venue]);
  if (p.doi) f.push(["doi", p.doi]);
  if (p.url) f.push(["url", p.url]);
  return `@inproceedings{${citeKey(p)},\n${f.map(([k, v]) => `  ${k} = {${bibEsc(v)}}`).join(",\n")}\n}`;
}

export function toRis(p: Paper) {
  const l = ["TY  - CPAPER", `TI  - ${p.title}`];
  p.authors.forEach((a) => l.push(`AU  - ${a.family}${a.given ? ", " + a.given : ""}`));
  if (p.year) l.push(`PY  - ${p.year}`);
  if (p.venue) l.push(`T2  - ${p.venue}`);
  if (p.doi) l.push(`DO  - ${p.doi}`);
  if (p.url) l.push(`UR  - ${p.url}`);
  if (p.abstract) l.push(`AB  - ${p.abstract}`);
  l.push("ER  - ");
  return l.join("\n");
}
