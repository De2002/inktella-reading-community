import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, BadgeCheck, ExternalLink, Heart, Pencil, Share2, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BookCover } from "@/components/BookCover";
import { PageLoader } from "@/components/Logo";
import { SafeHtml } from "@/components/SafeHtml";
import { FollowButton, ReportButton } from "@/components/SocialButtons";
import { Spoiler } from "@/components/Spoiler";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reviews/$id")({
  head: () => ({
    meta: [
      { title: "A review on Inktella" },
      { name: "description", content: "Read this book review and join the conversation on Inktella." },
      { property: "og:title", content: "A review on Inktella" },
      { property: "og:description", content: "One book. Hundreds of perspectives." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { id } = Route.useParams();
  const { userId, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const q = useQuery({
    queryKey: ["review", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, profiles(id, username, display_name, avatar_url, is_verified, bio, support_url), books(id, slug, title, cover_url, book_authors(authors(name)))")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
  const liked = useQuery({
    queryKey: ["liked", id, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("review_likes").select("user_id").match({ review_id: id, user_id: userId! }).maybeSingle();
      return !!data;
    },
  });
  const like = useMutation({
    mutationFn: async () => {
      const { error } = liked.data
        ? await supabase.from("review_likes").delete().match({ review_id: id, user_id: userId! })
        : await supabase.from("review_likes").insert({ review_id: id, user_id: userId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["liked", id] });
      qc.invalidateQueries({ queryKey: ["review", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review deleted");
      navigate({ to: "/" });
    },
  });

  if (q.isLoading) return <PageLoader />;
  const r = q.data;
  if (!r) return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><h1 className="text-3xl">Review not found</h1></div>;
  const mine = r.user_id === userId;

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: r.title, url }).catch(() => {});
    else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  };

  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      {r.is_draft && <p className="mb-6 rounded-md border border-dashed bg-muted px-4 py-2 text-sm">Draft — only you can see this.</p>}
      <Link to="/books/$slug" params={{ slug: r.books.slug }} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground">
        <BookCover src={r.books.cover_url} title={r.books.title} className="w-10" />
        <span>
          A review of <span className="italic text-foreground">{r.books.title}</span>
          {r.books.book_authors?.[0]?.authors?.name && <> by {r.books.book_authors[0].authors.name}</>}
        </span>
      </Link>

      <h1 className="mt-8 text-4xl leading-tight sm:text-5xl">{r.title}</h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link to="/u/$username" params={{ username: r.profiles.username }} className="flex items-center gap-2">
          <UserAvatar name={r.profiles.display_name} src={r.profiles.avatar_url} className="h-10 w-10" />
          <div>
            <p className="flex items-center gap-1 font-medium">
              {r.profiles.display_name} {r.profiles.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
            </p>
            <p className="text-xs text-muted-foreground">
              {r.published_at ? format(new Date(r.published_at), "d MMM yyyy") : "Unpublished"} · {r.word_count} words
            </p>
          </div>
        </Link>
        <div className="ml-auto"><FollowButton profileId={r.profiles.id} /></div>
      </div>

      {(r.rating || r.content_warning) && (
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {r.rating && (
            <span className="flex items-center gap-0.5" aria-label={`Rated ${r.rating} of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn("h-4 w-4", n <= r.rating ? "fill-seg-2 text-seg-2" : "text-muted-foreground/40")} />
              ))}
            </span>
          )}
          {r.content_warning && (
            <span className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" /> Content note: {r.content_warning}
            </span>
          )}
        </div>
      )}

      {r.cover_image_url && <img src={r.cover_image_url} alt="" className="mt-8 w-full rounded-lg" />}

      <div className="mt-8">
        <Spoiler active={r.has_spoilers && !mine}>
          <SafeHtml html={r.body_html} className="prose-ink" />
        </Spoiler>
      </div>

      {r.affiliate_url && (
        <div className="mt-8 rounded-lg border bg-card p-4 text-sm">
          <a href={r.affiliate_url} target="_blank" rel="noopener noreferrer sponsored" className="flex items-center gap-1.5 font-medium text-primary">
            {r.affiliate_label || "Get this book"} <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="mt-1 text-xs text-muted-foreground">
            This link was added by the reviewer and may earn them a commission. Inktella doesn't endorse the retailer, and
            commissions never depend on a positive review.
          </p>
        </div>
      )}

      {r.profiles.support_url && (
        <p className="mt-4 text-sm text-muted-foreground">
          Enjoyed this?{" "}
          <a href={r.profiles.support_url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
            Support {r.profiles.display_name}
          </a>
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-2 border-y py-3">
        <Button variant="ghost" size="sm" disabled={!userId || like.isPending} onClick={() => like.mutate()}>
          <Heart className={cn("mr-1 h-4 w-4", liked.data && "fill-not-recommend text-not-recommend")} /> {r.like_count}
        </Button>
        <Button variant="ghost" size="sm" onClick={share}><Share2 className="mr-1 h-4 w-4" /> Share</Button>
        <div className="ml-auto flex items-center gap-3">
          {mine && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/write" search={{ id: r.id }}><Pencil className="mr-1 h-4 w-4" /> Edit</Link>
            </Button>
          )}
          {(mine || isAdmin) && (
            <Button variant="ghost" size="sm" onClick={() => confirm("Delete this review?") && del.mutate()}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          )}
          {!mine && <ReportButton targetType="review" targetId={r.id} />}
        </div>
      </div>

      <Comments reviewId={id} />
    </article>
  );
}

type Comment = { id: string; body: string; parent_id: string | null; created_at: string; user_id: string; has_spoilers: boolean; profiles: { username: string; display_name: string; avatar_url: string | null } };

function Comments({ reviewId }: { reviewId: string }) {
  const { userId, isAdmin } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["comments", reviewId],
    queryFn: async () => {
      const { data } = await supabase
        .from("review_comments")
        .select("id, body, parent_id, created_at, user_id, has_spoilers, profiles(username, display_name, avatar_url)")
        .eq("review_id", reviewId)
        .eq("is_hidden", false)
        .order("created_at")
        .limit(500);
      return (data ?? []) as unknown as Comment[];
    },
  });
  const del = useMutation({
    mutationFn: async (cid: string) => {
      const { error } = await supabase.from("review_comments").delete().eq("id", cid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", reviewId] }),
  });
  const all = q.data ?? [];
  const children = (pid: string | null) => all.filter((c) => c.parent_id === pid);

  const render = (c: Comment, depth: number): React.ReactNode => (
    <div key={c.id} className={cn(depth > 0 && "ml-5 border-l pl-4")}>
      <div className="py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/u/$username" params={{ username: c.profiles.username }} className="flex items-center gap-1.5 font-medium text-foreground">
            <UserAvatar name={c.profiles.display_name} src={c.profiles.avatar_url} className="h-5 w-5" />
            {c.profiles.display_name}
          </Link>
          <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
        </div>
        <div className="mt-1.5">
          <Spoiler active={c.has_spoilers}><p className="whitespace-pre-line text-sm">{c.body}</p></Spoiler>
        </div>
        <div className="mt-1.5 flex gap-3">
          {userId && depth < 3 && <ReplyBox reviewId={reviewId} parentId={c.id} />}
          {(c.user_id === userId || isAdmin) && (
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => del.mutate(c.id)}>Delete</button>
          )}
          {c.user_id !== userId && <ReportButton targetType="comment" targetId={c.id} label="" />}
        </div>
      </div>
      {children(c.id).map((k) => render(k, depth + 1))}
    </div>
  );

  return (
    <section className="mt-8">
      <h2 className="text-xl">Comments ({all.length})</h2>
      {userId ? <CommentForm reviewId={reviewId} parentId={null} /> : (
        <p className="mt-3 text-sm text-muted-foreground"><Link to="/auth" className="text-primary underline">Sign in</Link> to comment.</p>
      )}
      <div className="mt-4">{children(null).map((c) => render(c, 0))}</div>
    </section>
  );
}

function ReplyBox({ reviewId, parentId }: { reviewId: string; parentId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setOpen(true)}>Reply</button>;
  return <div className="w-full"><CommentForm reviewId={reviewId} parentId={parentId} onDone={() => setOpen(false)} /></div>;
}

function CommentForm({ reviewId, parentId, onDone }: { reviewId: string; parentId: string | null; onDone?: () => void }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("review_comments").insert({ review_id: reviewId, parent_id: parentId, user_id: userId!, body: body.trim(), has_spoilers: spoiler });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["comments", reviewId] });
      qc.invalidateQueries({ queryKey: ["review", reviewId] });
      onDone?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mt-3">
      <Textarea rows={parentId ? 2 : 3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={parentId ? "Write a reply…" : "Add to the conversation…"} />
      <div className="mt-2 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={spoiler} onCheckedChange={setSpoiler} /> Spoilers</label>
        <Button size="sm" disabled={!body.trim() || m.isPending} onClick={() => m.mutate()}>{parentId ? "Reply" : "Comment"}</Button>
      </div>
    </div>
  );
}
