import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookCover } from "@/components/BookCover";
import { ReviewCard, type ReviewCardData } from "@/components/ContentCards";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { importOpenLibraryBook } from "@/lib/books.functions";
import { authorNames, BOOK_SELECT, REVIEW_SELECT } from "@/lib/queries";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? s["q"] : "" }),
  head: () => ({
    meta: [
      { title: "Search books, authors and reviewers — Inktella" },
      { name: "description", content: "Search Inktella for books, authors, reviewers and review articles." },
      { property: "og:title", content: "Search — Inktella" },
      { property: "og:description", content: "Find books, authors, reviewers and reviews." },
    ],
  }),
  component: SearchPage,
});

type OLDoc = { key: string; title: string; author_name?: string[]; first_publish_year?: number; cover_i?: number };

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [input, setInput] = useState(q);
  useEffect(() => setInput(q), [q]);
  const term = q.trim().replace(/[%,()]/g, " ");
  const importFn = useServerFn(importOpenLibraryBook);

  const local = useQuery({
    queryKey: ["search-local", term],
    queryFn: async () => {
      if (!term) {
        const { data } = await supabase.from("books").select(BOOK_SELECT).eq("status", "published").order("created_at", { ascending: false }).limit(24);
        return { books: data ?? [], people: [], reviews: [] as ReviewCardData[], authors: [] as any[] };
      }
      const like = `%${term}%`;
      const [byTitle, authors, people, reviews] = await Promise.all([
        supabase.from("books").select(BOOK_SELECT).eq("status", "published").or(`title.ilike.${like},isbn.eq.${term.replace(/\s/g, "")},genres.cs.{${term}}`).limit(20),
        supabase.from("authors").select("id, name, book_authors(books(" + BOOK_SELECT + "))").ilike("name", like).limit(6),
        supabase.from("profiles").select("id, username, display_name, avatar_url, bio").or(`username.ilike.${like},display_name.ilike.${like}`).limit(8),
        supabase.from("reviews").select(REVIEW_SELECT).eq("is_draft", false).eq("is_hidden", false).ilike("title", like).limit(8),
      ]);
      const books = new Map<string, any>();
      (byTitle.data ?? []).forEach((b: any) => books.set(b.id, b));
      (authors.data ?? []).forEach((a: any) =>
        (a.book_authors ?? []).forEach((ba: any) => ba.books?.status === "published" && books.set(ba.books.id, ba.books)),
      );
      return {
        books: [...books.values()],
        authors: authors.data ?? [],
        people: people.data ?? [],
        reviews: (reviews.data ?? []) as unknown as ReviewCardData[],
      };
    },
  });

  const ol = useQuery({
    queryKey: ["search-ol", term],
    enabled: term.length > 1,
    queryFn: async () => {
      const r = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&limit=12&fields=key,title,author_name,first_publish_year,cover_i`,
      );
      const j = await r.json();
      return (j.docs ?? []) as OLDoc[];
    },
  });

  const imp = useMutation({
    mutationFn: (workKey: string) => importFn({ data: { workKey } }),
    onSuccess: (r) => navigate({ to: "/books/$slug", params: { slug: r.slug } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const localKeys = new Set((local.data?.books ?? []).map((b: any) => b.openlibrary_key).filter(Boolean));
  const localTitles = new Set((local.data?.books ?? []).map((b: any) => b.title.toLowerCase()));
  const external = (ol.data ?? []).filter((d) => !localKeys.has(d.key) && !localTitles.has(d.title.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/search", search: { q: input } });
        }}
        className="relative max-w-xl"
      >
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Title, author, ISBN, genre or reviewer"
          className="h-12 w-full rounded-full border bg-card pl-10 pr-4 outline-none focus:ring-2 focus:ring-ring/30"
        />
      </form>

      <h2 className="mt-10 text-xl">{term ? "Books on Inktella" : "Recently added books"}</h2>
      {local.isSuccess && local.data.books.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No matches in our catalogue yet.</p>}
      <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
        {(local.data?.books ?? []).map((b: any) => (
          <Link key={b.id} to="/books/$slug" params={{ slug: b.slug }}>
            <BookCover src={b.cover_url} title={b.title} />
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{b.title}</p>
            <p className="truncate text-xs text-muted-foreground">{authorNames(b).map((a) => a.name).join(", ")}</p>
          </Link>
        ))}
      </div>

      {term.length > 1 && (
        <section className="mt-12">
          <h2 className="text-xl">More from the open catalogue</h2>
          <p className="text-sm text-muted-foreground">
            {userId ? "Add a book to Inktella to open its page." : "Sign in to add one of these to Inktella."}
          </p>
          {ol.isLoading && <Loader2 className="mt-4 h-5 w-5 animate-spin text-muted-foreground" />}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {external.map((d) => (
              <div key={d.key} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <BookCover className="w-12 shrink-0" title={d.title} src={d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{d.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.author_name?.slice(0, 2).join(", ")} {d.first_publish_year ? `· ${d.first_publish_year}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!userId || imp.isPending}
                  onClick={() => imp.mutate(d.key)}
                >
                  {imp.isPending && imp.variables === d.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </Button>
              </div>
            ))}
          </div>
          {userId && (
            <p className="mt-6 text-sm text-muted-foreground">
              Can't find it? <Link to="/submit" className="text-primary underline underline-offset-4">Submit a book</Link>.
            </p>
          )}
        </section>
      )}

      {(local.data?.people.length ?? 0) > 0 && (
        <section className="mt-12">
          <h2 className="text-xl">Readers & reviewers</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {local.data!.people.map((p: any) => (
              <Link key={p.id} to="/u/$username" params={{ username: p.username }} className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted">
                <UserAvatar name={p.display_name} src={p.avatar_url} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.display_name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(local.data?.reviews.length ?? 0) > 0 && (
        <section className="mt-12">
          <h2 className="text-xl">Reviews</h2>
          {local.data!.reviews.map((r) => <ReviewCard key={r.id} r={r} />)}
        </section>
      )}
    </div>
  );
}
