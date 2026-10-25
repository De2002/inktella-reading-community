import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookCover } from "@/components/BookCover";
import { PageLoader } from "@/components/Logo";
import { EmptyState, ReviewCard, type ReviewCardData } from "@/components/ContentCards";
import { supabase } from "@/integrations/supabase/client";
import { REVIEW_SELECT } from "@/lib/queries";
import { recometerPercents } from "@/lib/rules";
import { getAuthorCatalogueDetails } from "@/lib/authors.functions";
import { authorAge } from "@/lib/author-dates";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/authors/$id")({
  head: () => ({
    meta: [
      { title: "Author — Inktella" },
      { name: "description", content: "Books by this author and independent reviews from Inktella readers." },
      { property: "og:title", content: "Author on Inktella" },
      { property: "og:description", content: "Books and independent reviews." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthorPage,
});

function AuthorPage() {
  const { id } = Route.useParams();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["author", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("authors").select("*, book_authors(books(id, slug, title, cover_url, publication_year, status))").eq("id", id).maybeSingle();
      if (error) throw error;
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
  const authorRecord = q.data?.author;
  const details = useQuery({ queryKey: ["author-catalogue", authorRecord?.openlibrary_key, authorRecord?.name], enabled: !!authorRecord, staleTime: 86400000, queryFn: () => authorRecord ? getAuthorCatalogueDetails({ data: { key: authorRecord.openlibrary_key, name: authorRecord.name } }) : null });
  const saveDetails = useMutation({ mutationFn: async () => {
    if (!details.data || !authorRecord) return;
    const { error } = await supabase.from("authors").update({
      bio: authorRecord.bio || details.data.bio,
      alternate_names: authorRecord.alternate_names.length ? authorRecord.alternate_names : details.data.alternate_names,
      photo_url: authorRecord.photo_url || details.data.photo_url,
      birth_date: authorRecord.birth_date || details.data.birth_date,
      death_date: authorRecord.death_date || details.data.death_date,
    }).eq("id", id);
    if (error) throw error;
  }, onSuccess: () => { toast.success("Author details saved"); void qc.invalidateQueries({ queryKey: ["author", id] }); }, onError: (error: Error) => toast.error(error.message) });
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
    const timer = window.setInterval(() => setToday(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  if (q.isLoading) return <div className="mx-auto max-w-4xl px-4 py-16 text-muted-foreground">Loading…</div>;
  if (!q.data) return <div className="mx-auto max-w-4xl px-4 py-16 text-center"><h1 className="text-3xl">Author not found</h1></div>;
  const { author, books, tally, reviews } = q.data;
  const pct = recometerPercents(tally);
  const bio = author.bio || details.data?.bio;
  const aliases = author.alternate_names.length ? author.alternate_names : details.data?.alternate_names ?? [];
  const photo = author.photo_url || details.data?.photo_url;
  const birth = author.birth_date || details.data?.birth_date;
  const death = author.death_date || details.data?.death_date;
  const age = today ? authorAge(birth, death, today) : null;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {photo && <AuthorPhoto key={photo} src={photo} name={author.name} />}
        <div className="min-w-0"><h1 className="break-words text-4xl">{author.name}</h1>
          {aliases.length > 0 && <p className="mt-3 text-sm text-muted-foreground">Also known as {aliases.join(", ")}</p>}
          {(birth || death) && <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {birth && <div><dt className="text-muted-foreground">Born</dt><dd>{birth}</dd></div>}
            {death && <div><dt className="text-muted-foreground">Died</dt><dd>{death}</dd></div>}
            {age !== null && <div><dt className="text-muted-foreground">{death ? "Age at death" : "Age"}</dt><dd>{age} years</dd></div>}
          </dl>}
        </div>
      </div>
      {bio && <p className="mt-6 max-w-3xl whitespace-pre-line font-reading text-lg leading-relaxed">{bio}</p>}
      {isAdmin && details.data && <Button variant="outline" className="mt-4" onClick={() => saveDetails.mutate()} disabled={saveDetails.isPending}>Save catalogue details</Button>}
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

function AuthorPhoto({ src, name }: { src: string; name: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img src={src} alt={name} onLoad={(event) => {
    if (event.currentTarget.naturalWidth <= 1) setFailed(true);
    else setLoaded(true);
  }} onError={() => setFailed(true)} className={loaded ? "h-48 w-36 shrink-0 rounded-md object-cover" : "hidden"} />;
}
