import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  queryOptions,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { PenLine, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BookCover } from "@/components/BookCover";
import { BookLists } from "@/components/BookLists";
import {
  EmptyState,
  ReviewCard,
  ThoughtCard,
  type ReviewCardData,
  type ThoughtCardData,
} from "@/components/ContentCards";
import { ReaderConsensus } from "@/components/ReaderConsensus";
import { ReadingStatus } from "@/components/ReadingStatus";
import { Recometer } from "@/components/Recometer";
import { ReportButton } from "@/components/SocialButtons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { authorNames, BOOK_SELECT, PAGE_SIZE, REVIEW_SELECT, THOUGHT_SELECT } from "@/lib/queries";
import { MAX_THOUGHT_CHARS } from "@/lib/rules";
import { cn } from "@/lib/utils";

const TABS = ["overview", "reviews", "thoughts", "activity"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  overview: "Overview",
  reviews: "Reviews",
  thoughts: "Short Thoughts",
  activity: "Reading Activity",
};

const bookQuery = (slug: string) =>
  queryOptions({
    queryKey: ["book", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select(BOOK_SELECT)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const Route = createFileRoute("/books/$slug")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab | undefined } => ({
    tab: TABS.includes(s["tab"] as Tab) ? (s["tab"] as Tab) : undefined,
  }),
  loader: async ({ context, params }) => {
    const book = await context.queryClient.ensureQueryData(bookQuery(params.slug));
    if (!book) throw notFound();
    return {
      title: book.title,
      synopsis: book.synopsis,
      cover: book.cover_url,
      authors: authorNames(book)
        .map((a) => a.name)
        .join(", "),
    };
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.title}${loaderData.authors ? ` by ${loaderData.authors}` : ""} — Inktella`
      : "Book — Inktella";
    const desc =
      loaderData?.synopsis?.slice(0, 155) || "Reviews, Recometer and reader consensus on Inktella.";
    const meta: any[] = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "book" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (loaderData?.cover?.startsWith("https://")) {
      meta.push(
        { property: "og:image", content: loaderData.cover },
        { name: "twitter:image", content: loaderData.cover },
      );
    }
    return { meta };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-3xl">Book not found</h1>
      <p className="mt-2 text-muted-foreground">It may be waiting for review or may have moved.</p>
      <Link to="/search" search={{ q: "" }} className="mt-6 inline-block text-primary underline">
        Search books
      </Link>
    </div>
  ),
  component: BookPage,
});

function BookPage() {
  const { slug } = Route.useParams();
  const { tab = "overview" } = Route.useSearch();
  const { data: book } = useSuspenseQuery(bookQuery(slug));
  const [showFull, setShowFull] = useState(false);
  const counts = useQuery({
    queryKey: ["book-counts", book?.id],
    enabled: !!book,
    queryFn: async () => {
      if (!book) return { reviews: 0, thoughts: 0 };
      const [r, t] = await Promise.all([
        supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("book_id", book.id)
          .eq("is_draft", false)
          .eq("is_hidden", false),
        supabase
          .from("short_thoughts")
          .select("id", { count: "exact", head: true })
          .eq("book_id", book.id)
          .eq("is_hidden", false),
      ]);
      return { reviews: r.count ?? 0, thoughts: t.count ?? 0 };
    },
  });
  if (!book) return null;
  const authors = authorNames(book);

  const stats = useQuery({
    queryKey: ["book-stats", book.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reading_statuses")
        .select("status")
        .eq("book_id", book.id);
      return {
        want: data?.filter((x) => x.status === "want").length ?? 0,
        read: data?.filter((x) => x.status === "read").length ?? 0,
        reading: data?.filter((x) => x.status === "reading").length ?? 0,
      };
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-32 md:pb-8">
      {book.status !== "published" && (
        <p className="mb-6 rounded-md border border-dashed bg-muted px-4 py-3 text-sm">
          This book is waiting for a moderator to review it. Only you and the moderators can see it
          for now.
        </p>
      )}
      <div className="md:hidden">
        <MobileBookHeader book={book} authors={authors} />
        <BookLists bookId={book.id} />
        <MobileSynopsis synopsis={book.synopsis} />
        <div className="mt-8">
          <Recometer bookId={book.id} mobile />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3">
          <MobileDrawer label="Reading activity">
            <Activity bookId={book.id} />
          </MobileDrawer>
          <MobileDrawer label="Reader consensus">
            <ReaderConsensus bookId={book.id} category={book.category} />
          </MobileDrawer>
        </div>
        <MobileStats stats={stats.data ?? { want: 0, read: 0, reading: 0 }} />
        <div className="mt-8">
          <div className="flex items-center gap-6 border-b">
            <Link
              to="/books/$slug"
              params={{ slug }}
              search={{ tab: "reviews" }}
              className={cn(
                "border-b-2 px-1 pb-3 text-sm",
                tab === "reviews"
                  ? "border-foreground font-medium"
                  : "border-transparent text-muted-foreground",
              )}
            >
              Reviews <span className="ml-1 text-xs">{counts.data?.reviews ?? 0}</span>
            </Link>
            <Link
              to="/books/$slug"
              params={{ slug }}
              search={{ tab: "thoughts" }}
              className={cn(
                "border-b-2 px-1 pb-3 text-sm",
                tab === "thoughts"
                  ? "border-foreground font-medium"
                  : "border-transparent text-muted-foreground",
              )}
            >
              Thoughts <span className="ml-1 text-xs">{counts.data?.thoughts ?? 0}</span>
            </Link>
          </div>
          <div className="mt-5">
            {tab === "thoughts" ? <Thoughts bookId={book.id} /> : <ReviewsList bookId={book.id} />}
          </div>
        </div>
        <MobileBottomBar bookId={book.id} slug={book.slug} />
      </div>

      <div className="hidden grid gap-8 md:grid md:grid-cols-[220px_1fr_300px]">
        <div className="mx-auto w-40 md:w-full">
          <BookCover src={book.cover_url} title={book.title} />
          <div className="mt-4">
            <ReadingStatus bookId={book.id} />
          </div>
          <BookLists bookId={book.id} />
          <Button asChild variant="outline" className="mt-2 w-full">
            <Link to="/write" search={{ book: book.slug }}>
              <PenLine className="mr-1 h-4 w-4" /> Write a review
            </Link>
          </Button>
        </div>

        <div className="min-w-0">
          <h1 className="text-3xl leading-tight sm:text-4xl">{book.title}</h1>
          {book.subtitle && (
            <p className="mt-1 font-display text-lg text-muted-foreground">{book.subtitle}</p>
          )}
          <p className="mt-2 text-muted-foreground">
            by{" "}
            {authors.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ", "}
                <Link
                  to="/authors/$id"
                  params={{ id: a.id }}
                  className="text-foreground hover:text-primary"
                >
                  {a.name}
                </Link>
              </span>
            ))}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {book.publication_year && <span>{book.publication_year}</span>}
            {book.publisher && <span>{book.publisher}</span>}
            {book.isbn && <span>ISBN {book.isbn}</span>}
            {book.language && <span>{book.language}</span>}
            <span>
              {counts.data?.reviews ?? 0} reviews · {counts.data?.thoughts ?? 0} thoughts
            </span>
          </div>
          {book.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {book.genres.map((g) => (
                <Link
                  key={g}
                  to="/search"
                  search={{ q: g }}
                  className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground hover:bg-accent"
                >
                  {g}
                </Link>
              ))}
            </div>
          )}

          <nav className="mt-8 flex gap-5 overflow-x-auto border-b">
            {TABS.map((t) => (
              <Link
                key={t}
                to="/books/$slug"
                params={{ slug }}
                search={{ tab: t === "overview" ? undefined : t }}
                className={cn(
                  "-mb-px shrink-0 border-b-2 pb-2 text-sm",
                  tab === t
                    ? "border-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {TAB_LABEL[t]}
              </Link>
            ))}
          </nav>

          <div className="mt-6">
            {tab === "overview" && (
              <>
                {book.synopsis ? (
                  <div>
                    <p
                      className={cn(
                        "whitespace-pre-line font-reading text-lg leading-relaxed",
                        !showFull && "line-clamp-6",
                      )}
                    >
                      {book.synopsis}
                    </p>
                    {book.synopsis.length > 500 && (
                      <button
                        className="mt-1 text-sm text-primary"
                        onClick={() => setShowFull((s) => !s)}
                      >
                        {showFull ? "Show less" : "Read more"}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No synopsis yet.</p>
                )}
                <div className="mt-10">
                  <h2 className="text-xl">Featured & recent reviews</h2>
                  <ReviewsList bookId={book.id} limit={3} />
                  <Link
                    to="/books/$slug"
                    params={{ slug }}
                    search={{ tab: "reviews" }}
                    className="text-sm text-primary"
                  >
                    All reviews →
                  </Link>
                </div>
              </>
            )}
            {tab === "reviews" && <ReviewsList bookId={book.id} />}
            {tab === "thoughts" && <Thoughts bookId={book.id} />}
            {tab === "activity" && <Activity bookId={book.id} />}
          </div>
          <div className="mt-10">
            <ReportButton
              targetType="book"
              targetId={book.id}
              label="Report a problem with this book"
            />
          </div>
        </div>

        <aside className="space-y-5">
          <Recometer bookId={book.id} />
          <ReaderConsensus bookId={book.id} category={book.category} />
        </aside>
      </div>
    </div>
  );
}

function MobileBookHeader({
  book,
  authors,
}: {
  book: any;
  authors: { id: string; name: string }[];
}) {
  return (
    <div className="flex gap-4 border-b pb-6">
      <BookCover src={book.cover_url} title={book.title} className="w-32 shrink-0" />
      <div className="min-w-0 pt-1">
        <h1 className="break-words text-2xl leading-tight">{book.title}</h1>
        {book.subtitle && <p className="mt-1 text-sm text-muted-foreground">{book.subtitle}</p>}
        <div className="mt-4 flex flex-col items-start gap-2 text-sm">
          <span className="rounded bg-foreground px-2 py-1 text-background">{book.category}</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">By:</span>
            {authors.map((a) => (
              <Link
                key={a.id}
                to="/authors/$id"
                params={{ id: a.id }}
                className="text-muted-foreground"
              >
                {a.name}
              </Link>
            ))}
          </div>
        </div>
        {book.genres?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{book.genres.map((genre: string) => <Link key={genre} to="/search" search={{ q: genre }} className="max-w-full break-words rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground">{genre}</Link>)}</div>}
        <div className="mt-3 space-y-1 break-words text-xs text-muted-foreground">
          {book.publication_year && <p>{book.publication_year}</p>}
          {book.publisher && <p>{book.publisher}</p>}
          {book.language && <p>{book.language}</p>}
          {book.isbn && <p>ISBN {book.isbn}</p>}
        </div>
      </div>
    </div>
  );
}

function MobileSynopsis({ synopsis }: { synopsis?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const text = synopsis?.trim();

  return (
    <section className="relative mt-7 pt-7">
      <svg
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-4 w-full text-border"
        preserveAspectRatio="none"
        viewBox="0 0 120 8"
      >
        <path
          d="M0 4 C10 0 20 0 30 4 S50 8 60 4 S80 0 90 4 S110 8 120 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <h2 className="text-lg font-medium">Synopsis</h2>
      {text ? (
        <>
          <p
            className={cn(
              "mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground",
              !expanded && "line-clamp-5",
            )}
          >
            {text}
          </p>
          {text.length > 360 && (
            <button
              type="button"
              className="mt-2 text-sm font-medium text-primary"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Read less" : "Read more"}
            </button>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No synopsis yet.</p>
      )}
    </section>
  );
}

function MobileDrawer({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" className="h-12 justify-between bg-transparent">
          {label}
          <span aria-hidden>›</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{label}</DrawerTitle>
        </DrawerHeader>
        <div className="max-h-[75vh] overflow-y-auto px-4 pb-8">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}

function MobileStats({ stats }: { stats: { want: number; read: number; reading: number } }) {
  return (
    <section className="mt-8 grid grid-cols-3 border-y py-5 text-center">
      <div className="border-r">
        <strong className="block text-2xl">{stats.read}</strong>
        <span className="text-xs text-muted-foreground">Read</span>
      </div>
      <div className="border-r">
        <strong className="block text-2xl">{stats.want}</strong>
        <span className="text-xs text-muted-foreground">Want to read</span>
      </div>
      <div>
        <strong className="block text-2xl">{stats.reading}</strong>
        <span className="text-xs text-muted-foreground">Reading</span>
      </div>
    </section>
  );
}

function MobileBottomBar({ bookId, slug }: { bookId: string; slug: string }) {
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur md:hidden">
        <div className="mx-auto max-w-md">
          <ReadingStatus bookId={bookId} compact />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Drawer>
              <DrawerTrigger asChild>
                <Button className="bg-primary">Add a Thought</Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Add a thought</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-8">
                  <Thoughts bookId={bookId} />
                </div>
              </DrawerContent>
            </Drawer>
            <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
              <Link to="/write" search={{ book: slug }}>
                <PenLine data-icon="inline-start" />
                Write a Review
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function ReviewsList({ bookId, limit }: { bookId: string; limit?: number }) {
  const [sort, setSort] = useState<"recent" | "liked" | "featured">(limit ? "featured" : "recent");
  const q = useInfiniteQuery({
    queryKey: ["book-reviews", bookId, sort, limit],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let x = supabase
        .from("reviews")
        .select(REVIEW_SELECT)
        .eq("book_id", bookId)
        .eq("is_draft", false)
        .eq("is_hidden", false);
      if (sort === "liked") x = x.order("like_count", { ascending: false });
      if (sort === "featured") x = x.order("is_featured", { ascending: false });
      const size = limit ?? PAGE_SIZE;
      const { data } = await x
        .order("published_at", { ascending: false })
        .range(pageParam, pageParam + size - 1);
      return (data ?? []) as unknown as ReviewCardData[];
    },
    getNextPageParam: (last, all) =>
      !limit && last.length === PAGE_SIZE ? all.length * PAGE_SIZE : undefined,
  });
  const items = q.data?.pages.flat() ?? [];
  return (
    <div>
      {!limit && (
        <div className="mb-2 flex gap-2 text-sm">
          {(["recent", "liked", "featured"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "rounded-full px-3 py-1",
                sort === s ? "bg-secondary font-medium" : "text-muted-foreground",
              )}
            >
              {s === "recent" ? "Newest" : s === "liked" ? "Most liked" : "Editor's picks first"}
            </button>
          ))}
        </div>
      )}
      {q.isSuccess && items.length === 0 && (
        <div className="my-4">
          <EmptyState title="No reviews yet">Your perspective could be the first.</EmptyState>
        </div>
      )}
      {items.map((r) => (
        <ReviewCard key={r.id} r={r} showBook={false} />
      ))}
      {q.hasNextPage && (
        <Button variant="outline" onClick={() => q.fetchNextPage()}>
          Load more
        </Button>
      )}
    </div>
  );
}

function Thoughts({ bookId }: { bookId: string }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const q = useInfiniteQuery({
    queryKey: ["thoughts", bookId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data } = await supabase
        .from("short_thoughts")
        .select(THOUGHT_SELECT)
        .eq("book_id", bookId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      return (data ?? []) as unknown as (ThoughtCardData & { user_id: string })[];
    },
    getNextPageParam: (last, all) =>
      last.length === PAGE_SIZE ? all.length * PAGE_SIZE : undefined,
  });
  const post = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("short_thoughts")
        .insert({ book_id: bookId, user_id: userId!, body: body.trim(), has_spoilers: spoiler });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      setSpoiler(false);
      qc.invalidateQueries({ queryKey: ["thoughts", bookId] });
      qc.invalidateQueries({ queryKey: ["book-counts", bookId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("short_thoughts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thoughts", bookId] }),
  });
  const items = q.data?.pages.flat() ?? [];
  return (
    <div>
      {userId ? (
        <div className="rounded-lg border bg-card p-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_THOUGHT_CHARS))}
            placeholder="A quick reaction, a passing thought…"
            rows={3}
            className="resize-none border-0 bg-transparent p-1 font-reading text-base shadow-none focus-visible:ring-0"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={spoiler} onCheckedChange={setSpoiler} /> Spoilers
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {body.length}/{MAX_THOUGHT_CHARS}
              </span>
              <Button
                size="sm"
                disabled={!body.trim() || post.isPending}
                onClick={() => post.mutate()}
              >
                Share
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary underline">
            Sign in
          </Link>{" "}
          to share a thought.
        </p>
      )}
      {q.isSuccess && items.length === 0 && (
        <div className="mt-6">
          <EmptyState title="No thoughts yet" />
        </div>
      )}
      <div className="mt-2">
        {items.map((t) => (
          <ThoughtCard
            key={t.id}
            t={t}
            showBook={false}
            actions={
              t.user_id === userId ? (
                <button aria-label="Delete" onClick={() => del.mutate(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : (
                <ReportButton targetType="thought" targetId={t.id} label="" />
              )
            }
          />
        ))}
      </div>
      {q.hasNextPage && (
        <Button variant="outline" onClick={() => q.fetchNextPage()}>
          Load more
        </Button>
      )}
    </div>
  );
}

function Activity({ bookId }: { bookId: string }) {
  const q = useQuery({
    queryKey: ["activity", bookId],
    queryFn: async () => {
      const [s, r] = await Promise.all([
        supabase
          .from("reading_statuses")
          .select("status, updated_at, user_id")
          .eq("book_id", bookId)
          .order("updated_at", { ascending: false })
          .limit(30),
        supabase
          .from("reviews")
          .select("id, title, published_at, profiles(username, display_name)")
          .eq("book_id", bookId)
          .eq("is_draft", false)
          .eq("is_hidden", false)
          .order("published_at", { ascending: false })
          .limit(15),
      ]);
      const ids = [...new Set((s.data ?? []).map((x) => x.user_id))];
      const { data: people } = ids.length
        ? await supabase.from("profiles").select("id, username, display_name").in("id", ids)
        : { data: [] };
      const pm = new Map((people ?? []).map((p) => [p.id, p]));
      const items = [
        ...(s.data ?? []).map((x) => ({
          kind: "status" as const,
          at: x.updated_at,
          who: pm.get(x.user_id),
          status: x.status,
        })),
        ...(r.data ?? []).map((x: any) => ({
          kind: "review" as const,
          at: x.published_at,
          who: x.profiles,
          id: x.id,
          title: x.title,
        })),
      ];
      return items.filter((i) => i.who).sort((a, b) => +new Date(b.at) - +new Date(a.at));
    },
  });
  if (q.isSuccess && q.data.length === 0) return <EmptyState title="No activity yet" />;
  return (
    <ul className="divide-y">
      {(q.data ?? []).map((i, idx) => (
        <li key={idx} className="flex flex-wrap items-baseline gap-1 py-3 text-sm">
          <Link
            to="/u/$username"
            params={{ username: i.who!.username }}
            className="font-medium hover:text-primary"
          >
            {i.who!.display_name}
          </Link>
          {i.kind === "status" ? (
            <span className="text-muted-foreground">
              {i.status === "want"
                ? "wants to read this"
                : i.status === "reading"
                  ? "is currently reading"
                  : "finished reading"}
            </span>
          ) : (
            <span className="text-muted-foreground">
              published{" "}
              <Link
                to="/reviews/$id"
                params={{ id: i.id }}
                className="text-foreground hover:text-primary"
              >
                {i.title}
              </Link>
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(i.at), { addSuffix: true })}
          </span>
        </li>
      ))}
    </ul>
  );
}
