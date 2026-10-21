import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Globe, Heart } from "lucide-react";
import { useState } from "react";
import { BookCover } from "@/components/BookCover";
import { EmptyState, ReviewCard, ThoughtCard, type ReviewCardData, type ThoughtCardData } from "@/components/ContentCards";
import { STATUS_LABELS } from "@/components/ReadingStatus";
import { FollowButton } from "@/components/SocialButtons";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { REVIEW_SELECT, THOUGHT_SELECT } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Inktella` },
      { name: "description", content: `Reviews, shelves and short thoughts from @${params.username} on Inktella.` },
      { property: "og:title", content: `@${params.username} on Inktella` },
      { property: "og:description", content: "Reviews, reading shelves and thoughts." },
      { property: "og:type", content: "profile" },
    ],
  }),
  component: Profile,
});

type Tab = "reviews" | "thoughts" | "want" | "reading" | "read" | "following";

function Profile() {
  const { username } = Route.useParams();
  const { userId } = useAuth();
  const [tab, setTab] = useState<Tab>("reviews");

  const p = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      return data;
    },
  });
  const pid = p.data?.id;
  const counts = useQuery({
    queryKey: ["follow-counts", pid],
    enabled: !!pid,
    queryFn: async () => {
      const [a, b] = await Promise.all([
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", pid!),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", pid!),
      ]);
      return { followers: a.count ?? 0, following: b.count ?? 0 };
    },
  });

  if (p.isLoading) return <div className="mx-auto max-w-4xl px-4 py-16 text-muted-foreground">Loading…</div>;
  if (!p.data) return <div className="mx-auto max-w-4xl px-4 py-16 text-center"><h1 className="text-3xl">Reader not found</h1></div>;
  const prof = p.data;

  const tabs: [Tab, string][] = [
    ["reviews", "Reviews"],
    ["thoughts", "Short Thoughts"],
    ["want", STATUS_LABELS.want],
    ["reading", STATUS_LABELS.reading],
    ["read", STATUS_LABELS.read],
    ["following", "Following"],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <UserAvatar name={prof.display_name} src={prof.avatar_url} className="h-20 w-20 text-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="flex items-center gap-2 text-3xl">
              {prof.display_name} {prof.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
            </h1>
            {prof.is_professional && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">Reviewer</span>}
            <div className="ml-auto flex gap-2">
              <FollowButton profileId={prof.id} />
              {userId === prof.id && <Button size="sm" variant="outline" asChild><Link to="/settings">Edit profile</Link></Button>}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">@{prof.username}</p>
          {prof.bio && <p className="mt-3 max-w-2xl whitespace-pre-line font-reading text-lg leading-relaxed">{prof.bio}</p>}
          {prof.expertise && <p className="mt-2 text-sm text-muted-foreground">Writes about: {prof.expertise}</p>}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span><b className="text-foreground">{counts.data?.followers ?? 0}</b> followers</span>
            <span><b className="text-foreground">{counts.data?.following ?? 0}</b> following</span>
            {prof.website && (
              <a href={prof.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground"><Globe className="h-3.5 w-3.5" /> Website</a>
            )}
            {prof.support_url && (
              <a href={prof.support_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground"><Heart className="h-3.5 w-3.5" /> Support my writing</a>
            )}
          </div>
        </div>
      </div>

      <nav className="mt-10 flex gap-5 overflow-x-auto border-b">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("-mb-px shrink-0 border-b-2 pb-2 text-sm", tab === t ? "border-foreground font-medium" : "border-transparent text-muted-foreground")}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-4">
        {tab === "reviews" && <UserReviews uid={prof.id} />}
        {tab === "thoughts" && <UserThoughts uid={prof.id} />}
        {(tab === "want" || tab === "reading" || tab === "read") && <Shelf uid={prof.id} status={tab} />}
        {tab === "following" && <FollowingList uid={prof.id} />}
      </div>
    </div>
  );
}

function UserReviews({ uid }: { uid: string }) {
  const { userId } = useAuth();
  const q = useQuery({
    queryKey: ["user-reviews", uid, userId],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select(REVIEW_SELECT + ", is_draft").eq("user_id", uid).order("updated_at", { ascending: false }).limit(100);
      return (data ?? []) as unknown as (ReviewCardData & { is_draft: boolean })[];
    },
  });
  const items = q.data ?? [];
  const drafts = items.filter((r) => r.is_draft);
  const published = items.filter((r) => !r.is_draft);
  return (
    <div>
      {drafts.length > 0 && (
        <div className="mb-6 rounded-lg border border-dashed p-4">
          <p className="text-sm font-medium">Your drafts</p>
          <ul className="mt-2 space-y-1 text-sm">
            {drafts.map((d) => (
              <li key={d.id}><Link to="/write" search={{ id: d.id }} className="text-primary hover:underline">{d.title || "Untitled"}</Link> <span className="text-muted-foreground">on {d.books?.title}</span></li>
            ))}
          </ul>
        </div>
      )}
      {q.isSuccess && published.length === 0 && <EmptyState title="No reviews yet" />}
      {published.map((r) => <ReviewCard key={r.id} r={r} />)}
    </div>
  );
}

function UserThoughts({ uid }: { uid: string }) {
  const q = useQuery({
    queryKey: ["user-thoughts", uid],
    queryFn: async () => {
      const { data } = await supabase.from("short_thoughts").select(THOUGHT_SELECT).eq("user_id", uid).eq("is_hidden", false).order("created_at", { ascending: false }).limit(100);
      return (data ?? []) as unknown as ThoughtCardData[];
    },
  });
  if (q.isSuccess && q.data.length === 0) return <EmptyState title="No short thoughts yet" />;
  return <div>{(q.data ?? []).map((t) => <ThoughtCard key={t.id} t={t} />)}</div>;
}

function Shelf({ uid, status }: { uid: string; status: "want" | "reading" | "read" }) {
  const q = useQuery({
    queryKey: ["shelves", uid, status],
    queryFn: async () => {
      const { data } = await supabase
        .from("reading_statuses")
        .select("updated_at, books(id, slug, title, cover_url)")
        .eq("user_id", uid)
        .eq("status", status)
        .order("updated_at", { ascending: false })
        .limit(200);
      return (data ?? []).map((d: any) => d.books).filter(Boolean);
    },
  });
  if (q.isSuccess && q.data.length === 0) return <EmptyState title="This shelf is empty" />;
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
      {(q.data ?? []).map((b: any) => (
        <Link key={b.id} to="/books/$slug" params={{ slug: b.slug }}>
          <BookCover src={b.cover_url} title={b.title} />
          <p className="mt-1.5 line-clamp-2 text-xs">{b.title}</p>
        </Link>
      ))}
    </div>
  );
}

function FollowingList({ uid }: { uid: string }) {
  const q = useQuery({
    queryKey: ["following-list", uid],
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("profiles!follows_following_id_fkey(id, username, display_name, avatar_url)").eq("follower_id", uid).limit(200);
      return (data ?? []).map((d: any) => d.profiles).filter(Boolean);
    },
  });
  if (q.isSuccess && q.data.length === 0) return <EmptyState title="Not following anyone yet" />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(q.data ?? []).map((p: any) => (
        <Link key={p.id} to="/u/$username" params={{ username: p.username }} className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted">
          <UserAvatar name={p.display_name} src={p.avatar_url} />
          <div><p className="text-sm font-medium">{p.display_name}</p><p className="text-xs text-muted-foreground">@{p.username}</p></div>
        </Link>
      ))}
    </div>
  );
}
