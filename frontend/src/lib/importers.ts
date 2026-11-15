import type { Author } from "./types";

export interface ImportRecord {
  title: string;
  authors: Author[];
  year: number | null;
  venue: string;
  doi: string;
  url: string;
  abstract: string;
}

const MAX_RECORDS = 2000;

export function parseAuthorString(s: string): Author[] {
  return s
    .split(/\s+and\s+/i)
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => {
      if (n.includes(",")) {
        const [family, given = ""] = n.split(",").map((x) => x.trim());
        return { family, given };
      }
      const parts = n.split(/\s+/);
      return { family: parts.pop() ?? n, given: parts.join(" ") };
    });
}

const clean = (s: string) => s.replace(/[{}]/g, "").replace(/\\["'`^~]/g, "").replace(/\s+/g, " ").trim();
const normDoi = (s: string) => s.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");

/** Safe, non-evaluating BibTeX parser (handles nested braces and quoted values). */
export function parseBibtex(text: string): ImportRecord[] {
  const out: ImportRecord[] = [];
  let i = 0;
  while (out.length < MAX_RECORDS) {
    const at = text.indexOf("@", i);
    if (at < 0) break;
    const open = text.indexOf("{", at);
    if (open < 0) break;
    const type = text.slice(at + 1, open).trim().toLowerCase();
    // find matching close
    let depth = 0, j = open;
    for (; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") { depth--; if (depth === 0) break; }
    }
    const body = text.slice(open + 1, j);
    i = j + 1;
    if (["comment", "preamble", "string"].includes(type)) continue;
    const fields: Record<string, string> = {};
    const comma = body.indexOf(",");
    let k = comma + 1;
    while (k > 0 && k < body.length) {
      const eq = body.indexOf("=", k);
      if (eq < 0) break;
      const name = body.slice(k, eq).trim().toLowerCase().replace(/^,/, "").trim();
      let v = eq + 1;
      while (/\s/.test(body[v] ?? "")) v++;
      let val = "";
      if (body[v] === "{") {
        let d = 0, e = v;
        for (; e < body.length; e++) { if (body[e] === "{") d++; else if (body[e] === "}") { d--; if (d === 0) break; } }
        val = body.slice(v + 1, e); k = e + 1;
      } else if (body[v] === '"') {
        const e = body.indexOf('"', v + 1); val = body.slice(v + 1, e < 0 ? body.length : e); k = (e < 0 ? body.length : e) + 1;
      } else {
        const e = body.indexOf(",", v); val = body.slice(v, e < 0 ? body.length : e); k = e < 0 ? body.length : e;
      }
      if (name) fields[name] = clean(val);
      const nextComma = body.indexOf(",", k);
      k = nextComma < 0 ? -1 : nextComma + 1;
    }
    if (!fields.title) continue;
    out.push({
      title: fields.title.slice(0, 500),
      authors: parseAuthorString(fields.author ?? "").slice(0, 200),
      year: Number.parseInt(fields.year ?? "", 10) || null,
      venue: fields.journal || fields.booktitle || fields.publisher || "",
      doi: normDoi(fields.doi ?? ""),
      url: fields.url ?? "",
      abstract: (fields.abstract ?? "").slice(0, 10000),
    });
  }
  return out;
}

export function parseRis(text: string): ImportRecord[] {
  const out: ImportRecord[] = [];
  let cur: Record<string, string[]> = {};
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^([A-Z][A-Z0-9])  -\s?(.*)$/);
    if (!m) continue;
    const [, tag, val] = m;
    if (tag === "ER") {
      const title = (cur.TI ?? cur.T1 ?? [""])[0];
      if (title) out.push({
        title: title.slice(0, 500),
        authors: [...(cur.AU ?? []), ...(cur.A1 ?? [])].map((n) => parseAuthorString(n)[0]).filter(Boolean),
        year: Number.parseInt((cur.PY ?? cur.Y1 ?? [""])[0], 10) || null,
        venue: (cur.T2 ?? cur.JO ?? cur.JF ?? [""])[0],
        doi: normDoi((cur.DO ?? [""])[0]),
        url: (cur.UR ?? [""])[0],
        abstract: (cur.AB ?? [""])[0].slice(0, 10000),
      });
      cur = {};
      if (out.length >= MAX_RECORDS) break;
      continue;
    }
    (cur[tag] ??= []).push(val.trim());
  }
  return out;
}

export const normalizeTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function findDuplicate<T extends { doi: string; title: string; id?: string }>(rec: { doi: string; title: string }, existing: T[]): T | undefined {
  const d = rec.doi.toLowerCase();
  const t = normalizeTitle(rec.title);
  return existing.find((p) => (d && p.doi.toLowerCase() === d) || (t.length > 8 && normalizeTitle(p.title) === t));
}
