import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { BookCover } from "@/components/BookCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Inktella" },
      { name: "description", content: "Moderation and catalogue tools." },
      { property: "og:title", content: "Admin — Inktella" },
      { property: "og:description", content: "Moderation and catalogue tools." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type Tab = "pending" | "reports" | "books" | "reviews" | "members";

function Admin() {
  const { isAdmin, profile } = useAuth();
  const [tab, setTab] = useState<Tab>("pending");
  if (!profile) return <div className="mx-auto max-w-5xl px-4 py-16 text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <div className="mx-auto max-w-5xl px-4 py-16">You don't have access to this page.</div>;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl">Admin</h1>
      <nav className="mt-6 flex gap-5 overflow-x-auto border-b">
        {(["pending", "reports", "books", "reviews", "members"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("-mb-px border-b-2 pb-2 text-sm capitalize", tab === t ? "border-foreground font-medium" : "border-transparent text-muted-foreground")}>
            {t === "pending" ? "Book submissions" : t}
          </button>
        ))}
      </nav>
      <div className="mt-6">
        {tab === "pending" && <Pending />}
        {tab === "reports" && <Reports />}
        {tab === "books" && <Books />}
        {tab === "reviews" && <Reviews />}
        {tab === "members" && <Members />}
      </div>
    </div>
  );
}

function Pending() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-pending"],
    queryFn: async () => (await supabase.from("books").select("*, book_authors(authors(name))").eq("status", "pending").order("created_at")).data ?? [],
  });
  const set = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "published" | "rejected" }) => {
      const { error } = await supabase.from("books").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pending"] }),
  });
  if (q.isSuccess && q.data.length === 0) return <p className="text-muted-foreground">Nothing waiting.</p>;
  return (
    <ul className="divide-y">
      {(q.data ?? []).map((b: any) => (
        <li key={b.id} className="flex gap-4 py-4">
          <BookCover src={b.cover_url} title={b.title} className="w-14" />
          <div className="flex-1">
            <Link to="/books/$slug" params={{ slug: b.slug }} className="font-medium hover:text-primary">{b.title}</Link>
            <p className="text-sm text-muted-foreground">{b.book_authors?.map((x: any) => x.authors?.name).join(", ")} · {b.publication_year ?? "—"} · ISBN {b.isbn ?? "—"}</p>
            <p className="mt-1 line-clamp-2 text-sm">{b.synopsis}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={() => set.mutate({ id: b.id, status: "published" })}>Publish</Button>
            <Button size="sm" variant="outline" onClick={() => set.mutate({ id: b.id, status: "rejected" })}>Reject</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Reports() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => (await supabase.from("reports").select("*").eq("status", "open").order("created_at", { ascending: false })).data ?? [],
  });
  const resolve = useMutation({
    mutationFn: async ({ r, hide }: { r: any; hide: boolean }) => {
      if (hide) {
        const table = r.target_type === "review" ? "reviews" : r.target_type === "comment" ? "review_comments" : r.target_type === "thought" ? "short_thoughts" : null;
        if (table) {
          const { error } = await supabase.from(table as any).update({ is_hidden: true }).eq("id", r.target_id);
          if (error) throw error;
        }
      }
      const { error } = await supabase.from("reports").update({ status: hide ? "resolved" : "dismissed" }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Done");
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (q.isSuccess && q.data.length === 0) return <p className="text-muted-foreground">No open reports.</p>;
  return (
    <ul className="divide-y">
      {(q.data ?? []).map((r: any) => (
        <li key={r.id} className="py-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-secondary px-2 py-0.5 capitalize text-foreground">{r.target_type}</span>
            <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
            {r.contact_email && <span>· {r.contact_email}</span>}
          </div>
          <p className="mt-2 text-sm">{r.reason}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            {r.target_type === "review" ? <Link to="/reviews/$id" params={{ id: r.target_id }} className="text-primary underline">Open review</Link> : r.target_id}
          </p>
          <div className="mt-2 flex gap-2">
            {["review", "comment", "thought"].includes(r.target_type) && (
              <Button size="sm" variant="destructive" onClick={() => resolve.mutate({ r, hide: true })}>Hide content</Button>
            )}
            {!["review", "comment", "thought"].includes(r.target_type) && (
              <Button size="sm" onClick={() => resolve.mutate({ r, hide: true })}>Mark resolved</Button>
            )}
            <Button size="sm" variant="outline" onClick={() => resolve.mutate({ r, hide: false })}>Dismiss</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Books() {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const q = useQuery({
    queryKey: ["admin-books", term],
    queryFn: async () => (await supabase.from("books").select("*").ilike("title", `%${term}%`).order("title").limit(30)).data ?? [],
  });
  const save = useMutation({
    mutationFn: async () => {
      const { id, title, subtitle, synopsis, cover_url, publication_year, publisher, isbn, status, language, category } = editing;
      const genres = (Array.isArray(editing.genres) ? editing.genres : String(editing.genres ?? "").split(",")).map((genre: string) => genre.trim()).filter(Boolean);
      const { error } = await supabase.from("books").update({ title, subtitle, synopsis, cover_url: cover_url || null, publication_year: publication_year ? Number(publication_year) : null, publisher, isbn, status, genres, language: language || null, category }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-books"] });
      qc.invalidateQueries({ queryKey: ["book"] });
      qc.invalidateQueries({ queryKey: ["search-local"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-books"] }),
  });
  return (
    <div>
      <div className="flex gap-2">
        <Input placeholder="Search catalogue" value={term} onChange={(e) => setTerm(e.target.value)} />
        <Button asChild variant="outline"><Link to="/submit">Add book</Link></Button>
      </div>
      {editing && (
        <div className="mt-4 space-y-2 rounded-lg border bg-card p-4">
          {(["title", "subtitle", "cover_url", "publication_year", "publisher", "isbn", "language"] as const).map((k) => (
            <Input key={k} placeholder={k.replace("_", " ")} value={editing[k] ?? ""} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
          ))}
          <Input aria-label="Genres" placeholder="Genres, separated by commas" value={Array.isArray(editing.genres) ? editing.genres.join(", ") : editing.genres ?? ""} onChange={(e) => setEditing({ ...editing, genres: e.target.value })} />
          <select aria-label="Book category" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="h-9 rounded-md border bg-card px-2 text-sm">{["fiction", "nonfiction", "poetry", "biography", "other"].map((category) => <option key={category} value={category}>{category}</option>)}</select>
          <Textarea rows={4} value={editing.synopsis} onChange={(e) => setEditing({ ...editing, synopsis: e.target.value })} />
          <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="h-9 rounded-md border bg-card px-2 text-sm">
            <option value="published">published</option><option value="pending">pending</option><option value="rejected">rejected</option>
          </select>
          <div className="flex gap-2"><Button onClick={() => save.mutate()}>Save</Button><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div>
          <p className="text-xs text-muted-foreground">To remove a cover after a takedown request, clear the cover field.</p>
        </div>
      )}
      <ul className="mt-4 divide-y">
        {(q.data ?? []).map((b: any) => (
          <li key={b.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="flex-1 truncate">{b.title} <span className="text-muted-foreground">· {b.status}</span></span>
            <Button size="sm" variant="ghost" onClick={() => setEditing(b)}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${b.title}" and everything attached to it?`) && del.mutate(b.id)}>Delete</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Reviews() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => (await supabase.from("reviews").select("id, title, is_featured, is_hidden, profiles(display_name), books(title)").eq("is_draft", false).order("published_at", { ascending: false }).limit(50)).data ?? [],
  });
  const toggle = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("reviews").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <ul className="divide-y">
      {(q.data ?? []).map((r: any) => (
        <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
          <Link to="/reviews/$id" params={{ id: r.id }} className="flex-1 truncate hover:text-primary">
            {r.title} <span className="text-muted-foreground">· {r.profiles?.display_name} on {r.books?.title}</span>
          </Link>
          <Button size="sm" variant={r.is_featured ? "default" : "outline"} onClick={() => toggle.mutate({ id: r.id, patch: { is_featured: !r.is_featured } })}>
            {r.is_featured ? "Featured" : "Feature"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toggle.mutate({ id: r.id, patch: { is_hidden: !r.is_hidden } })}>{r.is_hidden ? "Unhide" : "Hide"}</Button>
        </li>
      ))}
    </ul>
  );
}

function Members() {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const q = useQuery({
    queryKey: ["admin-members", term],
    queryFn: async () => (await supabase.from("profiles").select("*").or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).limit(30)).data ?? [],
  });
  const upd = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-members"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div>
      <Input placeholder="Search members" value={term} onChange={(e) => setTerm(e.target.value)} />
      <ul className="mt-4 divide-y">
        {(q.data ?? []).map((p: any) => (
          <li key={p.id} className="flex items-center gap-2 py-2 text-sm">
            <Link to="/u/$username" params={{ username: p.username }} className="flex-1 truncate">{p.display_name} <span className="text-muted-foreground">@{p.username}{p.is_professional && " · reviewer"}</span></Link>
            <Button size="sm" variant={p.is_verified ? "default" : "outline"} onClick={() => upd.mutate({ id: p.id, patch: { is_verified: !p.is_verified } })}>{p.is_verified ? "Verified" : "Verify"}</Button>
            <Button size="sm" variant={p.is_suspended ? "destructive" : "ghost"} onClick={() => upd.mutate({ id: p.id, patch: { is_suspended: !p.is_suspended } })}>{p.is_suspended ? "Suspended" : "Suspend"}</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
