// Shared community rules. The database enforces these too; the UI uses them for feedback.
export const MIN_REVIEW_WORDS = 100;
export const MAX_THOUGHT_CHARS = 600;

export function countWords(html: string): number {
  const plain = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-zA-Z#0-9]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain === "" ? 0 : plain.split(" ").length;
}

export function canPublishReview(html: string): boolean {
  return countWords(html) >= MIN_REVIEW_WORDS;
}

export type Tally = { total: number; recommend: number; notRecommend: number };

export function recometerPercents(t: Tally) {
  if (t.total === 0) return { recommend: 0, notRecommend: 0 };
  const recommend = Math.round((t.recommend / t.total) * 100);
  return { recommend, notRecommend: 100 - recommend };
}

/** Results under this many votes are flagged as early signals. */
export const LOW_VOTE_THRESHOLD = 10;

export function dedupeKey(title: string, author: string): string {
  const t = title.toLowerCase().replace(/^(the|a|an)\s+/, "").replace(/[^a-z0-9]/g, "");
  const a = author.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${t}|${a}`;
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .slice(0, 80) || "book"
  );
}

export function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
