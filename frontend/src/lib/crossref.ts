/** DOI metadata straight from Crossref's public REST API (CORS-enabled, no key). No backend needed. */
export interface DoiResult { title: string; authors: { given: string; family: string }[]; year: number | null; venue: string; abstract: string; url: string }

export async function lookupDoi(doi: string): Promise<DoiResult> {
  if (!/^10\.\S{1,200}\/\S{1,300}$/.test(doi)) throw new Error("Invalid DOI");
  let r: Response;
  try { r = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { signal: AbortSignal.timeout(8000) }); }
  catch { throw new Error("The metadata service didn't respond in time"); }
  if (r.status === 404) throw new Error("No record found for that DOI");
  if (!r.ok) throw new Error("The metadata service is unavailable right now");
  const { message: m } = await r.json();
  const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return {
    title: strip(m.title?.[0] ?? ""),
    authors: (m.author ?? []).map((a: { given?: string; family?: string; name?: string }) => ({ given: a.given ?? "", family: a.family ?? a.name ?? "" })),
    year: m.issued?.["date-parts"]?.[0]?.[0] ?? m.published?.["date-parts"]?.[0]?.[0] ?? null,
    venue: strip(m["container-title"]?.[0] ?? m.publisher ?? ""),
    abstract: m.abstract ? strip(m.abstract).replace(/^Abstract\s*/i, "") : "",
    url: m.URL ?? `https://doi.org/${doi}`,
  };
}
