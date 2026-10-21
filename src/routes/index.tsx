import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookCover } from "@/components/BookCover";
import { EmptyState, ReviewCard, ThoughtCard, type ReviewCardData, type ThoughtCardData } from "@/components/ContentCards";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { authorNames, BOOK_SELECT, PAGE_SIZE, REVIEW_SELECT, THOUGHT_SELECT } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inktella — One book. Hundreds of perspectives." },
      { name: "description", content: "Discover books through other readers' writing. Publish reviews, keep shelves, follow reviewers." },
      { property: "og:title", content: "Inktella — One book. Hundreds of perspectives." },
      { property: "og:description", content: "A social reading network for long-form book reviews and discovery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<"following" | "discover">("following");
  const active = userId ? tab : "discover";

  return (
    <div className="mx-auto max-w-6xl px-4">
      {!userId && (
        <section className="py-14 sm:py-20">
          <h1 className="max-w-2xl text-4xl leading-tight sm:text-6xl">One book. Hundreds of perspectives.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Find your next read through the people who write about books. Publish reviews, keep your shelves, and follow readers you trust.
          </p>
          <div className="mt-7 flex gap-3">
            <Button asChild size="lg"><Link to="/auth">Join free</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/search" search={{ q: "" }}>Browse books</Link></Button>
          </div>
        </section>
      )}

      <BooksShelf />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px]">
        <div>
          {userId && (
            <div className="mb-2 flex gap-5 border-b">
              {(["following", "discover"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "-mb-px border-b-2 pb-2 text-sm capitalize",
                    active === t ? "border-foreground font-medium" : "border-transparent text-muted-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {active === "following" ? <FollowingFeed /> : <DiscoverFeed />}
        </div>
        <aside className="space-y-8">
          <EditorsPicks />
          <ReviewersToFollow />
        </aside>
      </div>
    </div>
  );
}

function BooksShelf() {
  const q = useQuery({
    queryKey: ["home-books"],
    queryFn: async () => {
      const { data } = await supabase.from("books").select(BOOK_SELECT).eq("status", "published").order("created_at", { ascending: false }).limit(12);
      return data ?? [];
    },
  });
  return (
    <section className="pt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl">On the shelves</h2>
        <Link to="/search" search={{ q: "" }} className="text-sm text-muted-foreground hover:text-foreground">Find a book →</Link>
      </div>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-3">
        {(q.data ?? []).map((b) => (
          <Link key={b.id} to="/books/$slug" params={{ slug: b.slug }} className="w-28 shrink-0 sm:w-32">
            <BookCover src={b.cover_url} title={b.title} />
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{b.title}</p>
            <p className="truncate text-xs text-muted-foreground">{authorNames(b).map((a) => a.name).join(", ")}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function useReviewsPage(key: unknown[], filter: (q: any) => any, enabled = true) {
  return useInfiniteQuery({
    queryKey: key,
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const q = filter(supabase.from("reviews").select(REVIEW_SELECT).eq("is_draft", false).eq("is_hidden", false));
      const { data, error } = await q.order("published_at", { ascending: false }).range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw error;
      return (data ?? []) as unknown as ReviewCardData[];
    },
    getNextPageParam: (last, all) => (last.length === PAGE_SIZE ? all.length * PAGE_SIZE : undefined),
  });
}

function DiscoverFeed() {
  const q = useReviewsPage(["feed", "discover"], (x) => x);
  const items = q.data?.pages.flat() ?? [];
  return (
    <section>
      <h2 className="mb-1 mt-4 text-xl">New reviews</h2>
      <p className="text-sm text-muted-foreground">Freshly published, from every corner of the community.</p>
      {q.isSuccess && items.length === 0 && (
        <div className="mt-6"><EmptyState title="No reviews yet">Pick a book and write the first one.</EmptyState></div>
      )}
      <div>{items.map((r) => <ReviewCard key={r.id} r={r} />)}</div>
      {q.hasNextPage && <Button variant="outline" className="mt-4" onClick={() => q.fetchNextPage()}>Load more</Button>}
    </section>
  );
}

function FollowingFeed() {
  const { userId } = useAuth();
  const following = useQuery({
    queryKey: ["feed", "following-ids", userId],
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", userId!);
      return (data ?? []).map((d) => d.following_id);
    },
  });
  const ids = following.data ?? [];
  const reviews = useReviewsPage(["feed", "following", ids], (x) => x.in("user_id", ids), ids.length > 0);
  const thoughts = useQuery({
    queryKey: ["feed", "following-thoughts", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("short_thoughts").select(THOUGHT_SELECT).in("user_id", ids).eq("is_hidden", false).order("created_at", { ascending: false }).limit(10);
      return (data ?? []) as unknown as ThoughtCardData[];
    },
  });

  if (following.isSuccess && ids.length === 0)
    return (
      <div className="mt-6">
        <EmptyState title="Your feed is quiet">Follow a few reviewers and their new writing will show up here.</EmptyState>
      </div>
    );

  const revs = reviews.data?.pages.flat() ?? [];
  return (
    <div>
      {revs.map((r) => <ReviewCard key={r.id} r={r} />)}
      {reviews.isSuccess && revs.length === 0 && <p className="py-6 text-sm text-muted-foreground">No new reviews from people you follow yet.</p>}
      {reviews.hasNextPage && <Button variant="outline" className="mt-4" onClick={() => reviews.fetchNextPage()}>Load more</Button>}
      {(thoughts.data ?? []).length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg">Short Thoughts</h2>
          {thoughts.data!.map((t) => <ThoughtCard key={t.id} t={t} />)}
        </section>
      )}
    </div>
  );
}

function EditorsPicks() {
  const q = useQuery({
    queryKey: ["editors-picks"],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select(REVIEW_SELECT).eq("is_featured", true).eq("is_draft", false).order("published_at", { ascending: false }).limit(4);
      return (data ?? []) as unknown as ReviewCardData[];
    },
  });
  if (!q.data?.length) return null;
  return (
    <section>
      <h3 className="text-lg">Editor's picks</h3>
      <ul className="mt-3 space-y-3">
        {q.data.map((r) => (
          <li key={r.id}>
            <Link to="/reviews/$id" params={{ id: r.id }} className="block hover:text-primary">
              <p className="font-display leading-snug">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.profiles?.display_name} on {r.books?.title}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReviewersToFollow() {
  const q = useQuery({
    queryKey: ["reviewers"],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("profiles(id, username, display_name, avatar_url, bio)").eq("is_draft", false).order("published_at", { ascending: false }).limit(40);
      const seen = new Map<string, any>();
      (data ?? []).forEach((r: any) => r.profiles && !seen.has(r.profiles.id) && seen.set(r.profiles.id, r.profiles));
      return [...seen.values()].slice(0, 5);
    },
  });
  if (!q.data?.length) return null;
  return (
    <section>
      <h3 className="text-lg">Reviewers to read</h3>
      <ul className="mt-3 space-y-3">
        {q.data.map((p) => (
          <li key={p.id}>
            <Link to="/u/$username" params={{ username: p.username }} className="flex items-center gap-3 hover:text-primary">
              <UserAvatar name={p.display_name} src={p.avatar_url} />
              <div className="min-w-0">
                <p className="text-sm font-medium">{p.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
