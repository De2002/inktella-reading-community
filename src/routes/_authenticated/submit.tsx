import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { submitBook } from "@/lib/books.functions";
import { uploadImage } from "@/lib/upload";

export const Route = createFileRoute("/_authenticated/submit")({
  head: () => ({
    meta: [
      { title: "Submit a book — Inktella" },
      { name: "description", content: "Add a missing book to the Inktella catalogue." },
      { property: "og:title", content: "Submit a book — Inktella" },
      { property: "og:description", content: "Add a missing book to the catalogue." },
    ],
  }),
  component: Submit,
});

const CATS = ["fiction", "nonfiction", "poetry", "biography", "other"] as const;

function Submit() {
  const { userId, isAdmin } = useAuth();
  const navigate = useNavigate();
  const fn = useServerFn(submitBook);
  const [f, setF] = useState({ title: "", author: "", coverUrl: "", isbn: "", year: "", genre: "", category: "fiction" as (typeof CATS)[number], synopsis: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl">Submit a book</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Please <Link to="/search" search={{ q: f.title }} className="text-primary underline">search first</Link> — most books can be added in one tap from the open catalogue.
        {!isAdmin && " Submissions are checked by a moderator before they appear."}
      </p>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const r = await fn({ data: { ...f, year: f.year ? Number(f.year) : null } });
            toast.success(r.existed ? "This book is already on Inktella" : r.status === "published" ? "Book published" : "Thanks! Your book is waiting for review.");
            navigate({ to: "/books/$slug", params: { slug: r.slug } });
          } catch (err: any) {
            toast.error(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="space-y-1.5">
          <Label>Cover *</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setF({ ...f, coverUrl: await uploadImage(file, userId!) });
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
          />
          {f.coverUrl && <img src={f.coverUrl} alt="Cover preview" className="mt-2 w-24 rounded-sm shadow-cover" />}
        </div>
        <div className="space-y-1.5"><Label>Title *</Label><Input required value={f.title} onChange={set("title")} /></div>
        <div className="space-y-1.5"><Label>Author *</Label><Input required value={f.author} onChange={set("author")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>ISBN</Label><Input value={f.isbn} onChange={set("isbn")} /></div>
          <div className="space-y-1.5"><Label>Year</Label><Input type="number" value={f.year} onChange={set("year")} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <select value={f.category} onChange={set("category")} className="h-9 w-full rounded-md border bg-card px-2 text-sm capitalize">
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Genre</Label><Input value={f.genre} onChange={set("genre")} /></div>
        </div>
        <div className="space-y-1.5"><Label>Synopsis</Label><Textarea rows={5} value={f.synopsis} onChange={set("synopsis")} /></div>
        <Button type="submit" disabled={busy || !f.coverUrl}>Submit book</Button>
      </form>
    </div>
  );
}
