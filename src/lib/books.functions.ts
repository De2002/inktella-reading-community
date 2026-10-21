import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dedupeKey, isHttpUrl, slugify } from "./rules";

type Category = "fiction" | "nonfiction" | "poetry" | "biography" | "other";

function guessCategory(subjects: string[]): Category {
  const s = subjects.join(" ").toLowerCase();
  if (/poetry|poems/.test(s)) return "poetry";
  if (/biography|autobiography|memoir/.test(s)) return "biography";
  if (/fiction|novel|stories/.test(s)) return "fiction";
  if (s.length > 0) return "nonfiction";
  return "fiction";
}

async function uniqueSlug(admin: any, title: string, year?: number | null) {
  const base = slugify(title);
  const candidates = [base, year ? `${base}-${year}` : null, `${base}-${Math.random().toString(36).slice(2, 6)}`].filter(Boolean) as string[];
  for (const c of candidates) {
    const { data } = await admin.from("books").select("id").eq("slug", c).maybeSingle();
    if (!data) return c;
  }
  return `${base}-${Date.now()}`;
}

async function linkAuthors(admin: any, bookId: string, names: { name: string; olKey?: string }[]) {
  let pos = 0;
  for (const a of names) {
    const key = a.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key) continue;
    let { data: existing } = await admin.from("authors").select("id").eq("name_key", key).maybeSingle();
    if (!existing) {
      const { data } = await admin
        .from("authors")
        .insert({ name: a.name.trim(), name_key: key, openlibrary_key: a.olKey ?? null })
        .select("id")
        .single();
      existing = data;
    }
    if (existing) await admin.from("book_authors").upsert({ book_id: bookId, author_id: existing.id, position: pos++ });
  }
}

/** Import a book from Open Library. Metadata is fetched server-side so it cannot be forged. */
export const importOpenLibraryBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workKey: string }) => {
    if (!/^\/works\/OL\d+W$/.test(input.workKey)) throw new Error("Invalid book reference");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: byKey } = await supabaseAdmin.from("books").select("slug").eq("openlibrary_key", data.workKey).maybeSingle();
    if (byKey) return { slug: byKey.slug, existed: true };

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
    const key = dedupeKey(title, authors[0]?.name ?? "");
    const { data: byDedupe } = await supabaseAdmin.from("books").select("slug").eq("dedupe_key", key).maybeSingle();
    if (byDedupe) return { slug: byDedupe.slug, existed: true };

    const description = typeof work.description === "string" ? work.description : work.description?.value ?? "";
    const subjects: string[] = (work.subjects ?? []).slice(0, 40);
    const coverId = work.covers?.find((c: number) => c > 0);

    const { data: book, error } = await supabaseAdmin
      .from("books")
      .insert({
        slug: await uniqueSlug(supabaseAdmin, title, year),
        title,
        subtitle: work.subtitle ?? null,
        synopsis: description.split("\n----------")[0].slice(0, 5000),
        cover_url: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
        publication_year: year,
        publisher,
        isbn,
        genres: subjects.filter((s) => s.length < 30).slice(0, 5),
        category: guessCategory(subjects),
        openlibrary_key: data.workKey,
        dedupe_key: key,
        status: "published",
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    await linkAuthors(supabaseAdmin, book.id, authors);
    return { slug: book.slug, existed: false };
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
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const key = dedupeKey(data.title, data.author);
    const { data: dup } = await supabaseAdmin.from("books").select("slug, status").eq("dedupe_key", key).maybeSingle();
    if (dup) return { slug: dup.slug, existed: true, status: dup.status };
    if (data.isbn) {
      const { data: isbnDup } = await supabaseAdmin.from("books").select("slug, status").eq("isbn", data.isbn).maybeSingle();
      if (isbnDup) return { slug: isbnDup.slug, existed: true, status: isbnDup.status };
    }

    const { data: book, error } = await supabaseAdmin
      .from("books")
      .insert({
        slug: await uniqueSlug(supabaseAdmin, data.title, data.year),
        title: data.title,
        synopsis: data.synopsis,
        cover_url: data.coverUrl,
        publication_year: data.year,
        isbn: data.isbn,
        genres: data.genre ? [data.genre] : [],
        category: data.category,
        dedupe_key: key,
        status: isAdmin ? "published" : "pending",
        submitted_by: context.userId,
      })
      .select("id, slug, status")
      .single();
    if (error) throw new Error(error.message);
    await linkAuthors(supabaseAdmin, book.id, [{ name: data.author }]);
    return { slug: book.slug, existed: false, status: book.status };
  });
