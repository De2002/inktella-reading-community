import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookCover } from "@/components/BookCover";
import { EmptyState, ReviewCard, type ReviewCardData } from "@/components/ContentCards";
import { supabase } from "@/integrations/supabase/client";
import { REVIEW_SELECT } from "@/lib/queries";
import { recometerPercents } from "@/lib/rules";

export const Route = createFileRoute("/authors/$id")({
  head: () => ({
    meta: [
      { title: "Author — Inktella" },
      { name: "description", content: "Books by this author and independent reviews from Inktella readers." },
      { property: "og:title", content: "Author on Inktella" },
      { property: "og:description", content: "Books and independent reviews." },
    ],
  }),
  component: AuthorPage,
});

function AuthorPage() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["author", id],
    queryFn: async () => {
      const { data } = await supabase.from("authors").select("*, book_authors(books(id, slug, title, cover_url, publication_year, status))").eq("id", id).maybeSingle();
      if (!data) return null;
      const books = (data.book_authors ?? []).map((b: any) => b.books).filter((b: any) => b?.status === "published");
      const ids = books.map((b: any) => b.id);
      const stats = await Promise.all(ids.map((bid: string) => supabase.rpc("get_recometer", { _book_id: bid })));
      const tally = stats.reduce(
        (s, r) => {
          const row = r.data?.[0];
          return row ? { total: s.total + row.total, recommend: s.recommend + row.recommend, notRecommend: s.notRecommend + row.not_recommend } : s;
        },
        { total: 0, recommend: 0, notRecommend: 0 },
      );
      const { data: reviews } = ids.length
        ? await supabase.from("reviews").select(REVIEW_SELECT).in("book_id", ids).eq("is_draft", false).eq("is_hidden", false).order("published_at", { ascending: false }).limit(10)
        : { data: [] };
      return { author: data, books, tally, reviews: (reviews ?? []) as unknown as ReviewCardData[] };
    },
  });
  if (q.isLoading) return <div className="mx-auto max-w-4xl px-4 py-16 text-muted-foreground">Loading…</div>;
  if (!q.data) return <div className="mx-auto max-w-4xl px-4 py-16 text-center"><h1 className="text-3xl">Author not found</h1></div>;
  const { author, books, tally, reviews } = q.data;
  const pct = recometerPercents(tally);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-4xl">{author.name}</h1>
      {author.bio && <p className="mt-3 max-w-2xl font-reading text-lg">{author.bio}</p>}
      {author.website && <a href={author.website} className="mt-2 inline-block text-sm text-primary" target="_blank" rel="noopener noreferrer">Official website</a>}
      <p className="mt-4 text-sm text-muted-foreground">
        {tally.total > 0 ? <>Overall Recometer: <b className="text-foreground">{pct.recommend}%</b> would recommend · {tally.total} votes</> : "No Recometer votes yet."}
      </p>
      <h2 className="mt-10 text-xl">Books</h2>
      <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-5">
        {books.map((b: any) => (
          <Link key={b.id} to="/books/$slug" params={{ slug: b.slug }}>
            <BookCover src={b.cover_url} title={b.title} />
            <p className="mt-1.5 line-clamp-2 text-sm">{b.title}</p>
            {b.publication_year && <p className="text-xs text-muted-foreground">{b.publication_year}</p>}
          </Link>
        ))}
      </div>
      <h2 className="mt-12 text-xl">Independent reviews</h2>
      {reviews.length === 0 ? <div className="mt-4"><EmptyState title="No reviews yet" /></div> : reviews.map((r) => <ReviewCard key={r.id} r={r} />)}
    </div>
  );
}
