import { OFFICIAL_RECORD_DOMAINS } from "./constants";
import { fetchPages, searchWeb } from "./tinyfish";

export type RecordHit = {
  title: string;
  url: string;
  snippet: string;
  // Whether the applicant's full name appears on the page, and the words around it.
  nameFound: boolean;
  context: string | null;
};

const CONTEXT = 120;

export function findName(text: string, name: string) {
  const at = text.toLowerCase().indexOf(name.trim().toLowerCase());
  if (at < 0) return null;
  const from = Math.max(0, at - CONTEXT);
  return text
    .slice(from, at + name.length + CONTEXT)
    .replace(/\s+/g, " ")
    .trim();
}

// A helper for admins checking an officer request: searches only MCD and Delhi government
// sites for the applicant, and reads the top pages to see whether their name appears. It
// reports what it found with links. It decides nothing.
export async function checkPublicRecords(applicant: { name: string; designation: string; department: string; ward: string }) {
  const query = `"${applicant.name}" ${applicant.designation} ${applicant.department} ${applicant.ward} MCD`;
  const results = (
    await searchWeb(query, {
      includeDomains: OFFICIAL_RECORD_DOMAINS,
      purpose: "Check whether a named person is listed in official MCD or Delhi government staff records",
    })
  ).slice(0, 3);

  const { pages } = results.length ? await fetchPages(results.map((r) => r.url)) : { pages: [] };
  const hits: RecordHit[] = results.map((r) => {
    const page = pages.find((p) => p.url === r.url) ?? pages.find((p) => r.url.startsWith(p.url) || p.url.startsWith(r.url));
    const context = page ? findName(page.text, applicant.name) : findName(`${r.title} ${r.snippet}`, applicant.name);
    return { title: r.title, url: r.url, snippet: r.snippet, nameFound: context !== null, context };
  });
  return { hits, nameFoundOn: hits.filter((h) => h.nameFound).length, domains: OFFICIAL_RECORD_DOMAINS };
}
