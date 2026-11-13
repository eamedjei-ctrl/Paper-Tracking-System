import { NextResponse, type NextRequest } from "next/server";

// Crossref REST API — public, no key required. Set CROSSREF_MAILTO to join Crossref's "polite" pool.
export async function GET(req: NextRequest) {
  const doi = (req.nextUrl.searchParams.get("doi") ?? "").trim();
  if (!/^10\.\S{1,200}\/\S{1,300}$/.test(doi)) return NextResponse.json({ error: "Invalid DOI" }, { status: 400 });
  const mailto = process.env.CROSSREF_MAILTO;
  try {
    const r = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}${mailto ? `?mailto=${encodeURIComponent(mailto)}` : ""}`, {
      headers: { "User-Agent": "PaperTrail/1.0 (research paper tracker)" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (r.status === 404) return NextResponse.json({ error: "No record found for that DOI" }, { status: 404 });
    if (!r.ok) return NextResponse.json({ error: "The metadata service is unavailable right now" }, { status: 502 });
    const { message: m } = await r.json();
    const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const year = m.issued?.["date-parts"]?.[0]?.[0] ?? m.published?.["date-parts"]?.[0]?.[0] ?? null;
    return NextResponse.json({
      title: strip(m.title?.[0] ?? ""),
      authors: (m.author ?? []).map((a: { given?: string; family?: string; name?: string }) => ({ given: a.given ?? "", family: a.family ?? a.name ?? "" })),
      year,
      venue: strip(m["container-title"]?.[0] ?? m.publisher ?? ""),
      abstract: m.abstract ? strip(m.abstract).replace(/^Abstract\s*/i, "") : "",
      url: m.URL ?? `https://doi.org/${doi}`,
    });
  } catch {
    return NextResponse.json({ error: "The metadata service didn't respond in time" }, { status: 504 });
  }
}
