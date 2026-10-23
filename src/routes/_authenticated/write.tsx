import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookCover } from "@/components/BookCover";
import { ReviewEditor } from "@/components/ReviewEditor";
import { SafeHtml } from "@/components/SafeHtml";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { countWords, isHttpUrl, MIN_REVIEW_WORDS } from "@/lib/rules";
import { uploadImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/write")({
  validateSearch: (s: Record<string, unknown>): { book?: string | undefined; id?: string | undefined } => ({
    book: typeof s["book"] === "string" ? s["book"] : undefined,
    id: typeof s["id"] === "string" ? s["id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Write a review — Inktella" },
      { name: "description", content: "Write and publish a book review on Inktella." },
      { property: "og:title", content: "Write a review — Inktella" },
      { property: "og:description", content: "Write and publish a book review." },
    ],
  }),
  component: WritePage,
});

function WritePage() {
  const { book: bookSlug, id } = Route.useSearch();
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [reviewId, setReviewId] = useState<string | undefined>(id);
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [initial, setInitial] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [spoilers, setSpoilers] = useState(false);
  const [warning, setWarning] = useState("");
  const [affUrl, setAffUrl] = useState("");
  const [affLabel, setAffLabel] = useState("");
  const [image, setImage] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bookId, setBookId] = useState<string | null>(null);

  const existing = useQuery({
    queryKey: ["edit-review", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*, books(id, slug, title, cover_url)").eq("id", id!).maybeSingle();
      return data as any;
    },
  });
  const bookQ = useQuery({
    queryKey: ["write-book", bookSlug],
    enabled: !!bookSlug && !id,
    queryFn: async () => {
      const { data } = await supabase.from("books").select("id, slug, title, cover_url").eq("slug", bookSlug!).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    const r = existing.data;
    if (!r) return;
    setTitle(r.title);
    setInitial(r.body_html);
    setHtml(r.body_html);
    setRating(r.rating);
    setSpoilers(r.has_spoilers);
    setWarning(r.content_warning ?? "");
    setAffUrl(r.affiliate_url ?? "");
    setAffLabel(r.affiliate_label ?? "");
    setImage(r.cover_image_url ?? "");
    setBookId(r.book_id);
  }, [existing.data]);
  useEffect(() => {
    if (bookQ.data) setBookId(bookQ.data.id);
  }, [bookQ.data]);

  const book = existing.data?.books ?? bookQ.data;
  const words = countWords(html);
  const enough = words >= MIN_REVIEW_WORDS;
  const wasPublished = existing.data && !existing.data.is_draft;

  if (!id && !bookSlug) return <PickBook />;

  const save = async (publish: boolean) => {
    if (!bookId) return;
    if (!title.trim()) { toast.error("Give your review a title"); return; }
    if (affUrl && !isHttpUrl(affUrl)) { toast.error("The purchase link should start with https://"); return; }
    if (publish && !enough) { toast.error(`A full review needs at least ${MIN_REVIEW_WORDS} words.`); return; }
    setBusy(true);
    const payload = {
      book_id: bookId,
      user_id: userId!,
      title: title.trim(),
      body_html: html,
      rating,
      has_spoilers: spoilers,
      content_warning: warning.trim() || null,
      affiliate_url: affUrl.trim() || null,
      affiliate_label: affLabel.trim() || null,
      cover_image_url: image || null,
      is_draft: !publish,
    };
    const res = reviewId
      ? await supabase.from("reviews").update(payload).eq("id", reviewId).select("id").single()
      : await supabase.from("reviews").insert(payload).select("id").single();
    setBusy(false);
    if (res.error) { toast.error(res.error.message); return; }
    setReviewId(res.data.id);
    if (publish) {
      toast.success("Published");
      navigate({ to: "/reviews/$id", params: { id: res.data.id } });
    } else toast.success("Draft saved");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {book && (
        <Link to="/books/$slug" params={{ slug: book.slug }} className="flex items-center gap-3 text-sm text-muted-foreground">
          <BookCover src={book.cover_url} title={book.title} className="w-9" />
          Reviewing <span className="italic text-foreground">{book.title}</span>
        </Link>
      )}

      <div className="mt-6 flex justify-end gap-2 text-sm">
        <button onClick={() => setPreview(false)} className={cn("rounded-full px-3 py-1", !preview && "bg-secondary font-medium")}>Write</button>
        <button onClick={() => setPreview(true)} className={cn("rounded-full px-3 py-1", preview && "bg-secondary font-medium")}>Preview</button>
      </div>

      {preview ? (
        <div className="mt-4">
          <h1 className="text-4xl">{title || "Untitled"}</h1>
          {image && <img src={image} alt="" className="mt-6 w-full rounded-lg" />}
          <SafeHtml html={html} className="prose-ink mt-6" />
        </div>
      ) : (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 200))}
            placeholder="Title your review"
            className="mt-2 w-full bg-transparent font-display text-3xl outline-none placeholder:text-muted-foreground/60 sm:text-4xl"
          />
          <div className="mt-4">
            <ReviewEditor initial={initial} onChange={setHtml} />
          </div>
        </>
      )}

      <p className={cn("mt-4 text-xs", enough ? "text-muted-foreground" : "text-muted-foreground")}>
        {words} words{!enough && ` · ${MIN_REVIEW_WORDS - words} more to publish as a full review`}
      </p>

      <details className="mt-8 rounded-lg border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">Optional details</summary>
        <div className="mt-4 grid gap-5">
          <div>
            <Label>Your rating</Label>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(rating === n ? null : n)} className={cn("h-8 w-8 rounded-md border text-sm", rating && n <= rating ? "border-primary bg-primary text-primary-foreground" : "")}>{n}</button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={spoilers} onCheckedChange={setSpoilers} /> This review contains spoilers</label>
          <div className="space-y-1.5">
            <Label htmlFor="cw">Content note</Label>
            <Input id="cw" value={warning} onChange={(e) => setWarning(e.target.value.slice(0, 300))} placeholder="e.g. grief, violence" />
          </div>
          <div className="space-y-1.5">
            <Label>Header image</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  setImage(await uploadImage(f, userId!));
                } catch (err: any) {
                  toast.error(err.message);
                }
              }}
            />
            {image && <button className="text-xs text-muted-foreground underline" onClick={() => setImage("")}>Remove image</button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="aff">Purchase or affiliate link</Label>
              <Input id="aff" value={affUrl} onChange={(e) => setAffUrl(e.target.value)} placeholder="https://" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="affl">Link label</Label>
              <Input id="affl" value={affLabel} onChange={(e) => setAffLabel(e.target.value.slice(0, 80))} placeholder="Buy at my local bookshop" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Affiliate links are clearly labelled on your review as yours.</p>
        </div>
      </details>

      <div className="sticky bottom-0 mt-8 flex justify-end gap-2 border-t bg-background py-3">
        {!wasPublished && <Button variant="outline" disabled={busy || !bookId} onClick={() => save(false)}>Save draft</Button>}
        <Button disabled={busy || !bookId || !enough} onClick={() => save(true)}>{wasPublished ? "Update" : "Publish"}</Button>
      </div>
    </div>
  );
}

function PickBook() {
  const [q, setQ] = useState("");
  const r = useQuery({
    queryKey: ["pick-book", q],
    queryFn: async () => {
      let x = supabase.from("books").select("id, slug, title, cover_url").eq("status", "published");
      if (q.trim()) x = x.ilike("title", `%${q.trim()}%`);
      const { data } = await x.limit(12);
      return data ?? [];
    },
  });
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl">Which book are you writing about?</h1>
      <Input className="mt-6" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title" />
      <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4">
        {(r.data ?? []).map((b) => (
          <Link key={b.id} to="/write" search={{ book: b.slug }}>
            <BookCover src={b.cover_url} title={b.title} />
            <p className="mt-1.5 line-clamp-2 text-sm">{b.title}</p>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Not here? <Link to="/search" search={{ q }} className="text-primary underline">Find it in the wider catalogue</Link>.
      </p>
    </div>
  );
}
