import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isHttpUrl } from "./rules";

type Category = "fiction" | "nonfiction" | "poetry" | "biography" | "other";

function guessCategory(subjects: string[]): Category {
  const s = subjects.join(" ").toLowerCase();
  if (/poetry|poems/.test(s)) return "poetry";
  if (/biography|autobiography|memoir/.test(s)) return "biography";
  if (/fiction|novel|stories/.test(s)) return "fiction";
  if (s.length > 0) return "nonfiction";
  return "fiction";
}

/** Import a book from Open Library. Metadata is fetched server-side so it cannot be forged. */
export const importOpenLibraryBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workKey: string }) => {
    if (!/^\/works\/OL\d+W$/.test(input.workKey)) throw new Error("Invalid book reference");
    return input;
  })
  .handler(async ({ data, context }) => {
    const res = await fetch(`https://openlibrary.org${data.workKey}.json`);
    if (!res.ok) throw new Error(`Couldn't reach the book catalogue (${res.status})`);
    const work: any = await res.json();

    const authorKeys: string[] = (work.authors ?? []).map((a: any) => a.author?.key).filter(Boolean).slice(0, 4);
    const authors = (
      await Promise.all(
        authorKeys.map(async (k) => {
          const r = await fetch(`https://openlibrary.org${k}.json`);
          if (!r.ok) return null;
          const j: any = await r.json();
          return j.name ? { name: String(j.name), olKey: k } : null;
        }),
      )
    ).filter(Boolean) as { name: string; olKey: string }[];

    // Extra details (year, isbn) from search index
    let year: number | null = null;
    let isbn: string | null = null;
    let publisher: string | null = null;
    try {
      const s = await fetch(
        `https://openlibrary.org/search.json?q=key:${encodeURIComponent(data.workKey)}&fields=first_publish_year,isbn,publisher&limit=1`,
      );
      const sj: any = await s.json();
      const d = sj.docs?.[0];
      year = d?.first_publish_year ?? null;
      isbn = d?.isbn?.find((i: string) => i.length === 13) ?? d?.isbn?.[0] ?? null;
      publisher = d?.publisher?.[0] ?? null;
    } catch {
      /* optional */
    }

    const title = String(work.title ?? "Untitled").slice(0, 300);
    const description = typeof work.description === "string" ? work.description : work.description?.value ?? "";
    const subjects: string[] = (work.subjects ?? []).slice(0, 40);
    const coverId = work.covers?.find((c: number) => c > 0);

    const { data: rows, error } = await context.supabase.rpc("create_book", {
      _title: title,
      _authors: authors.length ? authors : [{ name: "Unknown" }],
      _subtitle: work.subtitle ?? null,
      _synopsis: description.split("\n----------")[0].slice(0, 5000),
      _cover_url: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
      _year: year,
      _publisher: publisher,
      _isbn: isbn,
      _genres: subjects.filter((s) => s.length < 30).slice(0, 5),
      _category: guessCategory(subjects),
      _openlibrary_key: data.workKey,
    } as any);
    if (error) throw new Error(error.message);
    const row = (rows as any[])[0];
    return { slug: row.slug as string, existed: !!row.existed };
  });

export type SubmitBookInput = {
  title: string;
  author: string;
  coverUrl: string;
  isbn?: string;
  year?: number | null;
  genre?: string;
  category: Category;
  synopsis?: string;
};

/** Manual submission. Members' submissions wait for review; admin submissions publish directly. */
export const submitBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: SubmitBookInput) => {
    const title = String(i.title ?? "").trim();
    const author = String(i.author ?? "").trim();
    if (!title || title.length > 300) throw new Error("Please enter a title");
    if (!author || author.length > 200) throw new Error("Please enter the author's name");
    if (!isHttpUrl(i.coverUrl)) throw new Error("Please add a cover image");
    const isbn = (i.isbn ?? "").replace(/[^0-9Xx]/g, "");
    if (isbn && isbn.length !== 10 && isbn.length !== 13) throw new Error("ISBN should have 10 or 13 digits");
    const year = i.year ? Number(i.year) : null;
    if (year && (year < 0 || year > new Date().getFullYear() + 2)) throw new Error("Please check the publication year");
    const cats: Category[] = ["fiction", "nonfiction", "poetry", "biography", "other"];
    return {
      title,
      author,
      coverUrl: i.coverUrl,
      isbn: isbn || null,
      year,
      genre: (i.genre ?? "").trim().slice(0, 40),
      category: cats.includes(i.category) ? i.category : "other",
      synopsis: (i.synopsis ?? "").trim().slice(0, 5000),
    };
  })
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("create_book", {
      _title: data.title,
      _authors: [{ name: data.author }],
      _synopsis: data.synopsis,
      _cover_url: data.coverUrl,
      _year: data.year,
      _isbn: data.isbn,
      _genres: data.genre ? [data.genre] : [],
      _category: data.category,
    } as any);
    if (error) throw new Error(error.message);
    const row = (rows as any[])[0];
    return { slug: row.slug as string, existed: !!row.existed, status: row.status as string };
  });
