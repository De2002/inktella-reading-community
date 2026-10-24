import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  ExternalLink,
  Globe,
  Heart,
  Mail,
  MessageCircle,
  Sparkles,
  Star,
  Users,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BookCover } from "@/components/BookCover";
import {
  EmptyState,
  ReviewCard,
  ThoughtCard,
  type ReviewCardData,
  type ThoughtCardData,
} from "@/components/ContentCards";
import { STATUS_LABELS } from "@/components/ReadingStatus";
import { FollowButton } from "@/components/SocialButtons";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { REVIEW_SELECT, THOUGHT_SELECT } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { isHttpUrl } from "@/lib/rules";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Inktella` },
      {
        name: "description",
        content: `Reviews, shelves and short thoughts from @${params.username} on Inktella.`,
      },
      { property: "og:title", content: `@${params.username} — Inktella` },
      { property: "og:description", content: `Reviews, shelves and short thoughts from @${params.username}.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

type DrawerKind = "hire" | "support" | "reviews" | null;

const statDefinitions = [
  ["Reviews", "reviews", BookOpen],
  ["Thoughts", "thoughts", MessageCircle],
  ["Books read", "read", BookOpen],
  ["Reading now", "reading", Sparkles],
  ["Want to read", "want", Star],
  ["Followers", "followers", Users],
  ["Following", "following", Users],
  ["All likes", "likes", Heart],
] as const;

function WavyDivider() {
  return (
    <div aria-hidden="true" className="my-8 h-4 overflow-hidden text-border">
      <svg
        viewBox="0 0 1200 16"
        preserveAspectRatio="none"
        className="h-full w-full fill-none stroke-current stroke-[1.5]"
      >
        <path d="M0 8 C 40 0, 80 16, 120 8 S 200 0, 240 8 S 320 16, 360 8 S 440 0, 480 8 S 560 16, 600 8 S 680 0, 720 8 S 800 16, 840 8 S 920 0, 960 8 S 1040 16, 1080 8 S 1160 0, 1200 8" />
      </svg>
    </div>
  );
}

function Profile() {
  const { username } = Route.useParams();
  const { userId } = useAuth();
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const p = useQuery({
    queryKey: ["profile", username],
    queryFn: async () =>
      (await supabase.from("profiles").select("*").eq("username", username).maybeSingle()).data,
  });
  const pid = p.data?.id;
  const counts = useQuery({
    queryKey: ["profile-stats", pid],
    enabled: !!pid,
    queryFn: async () => {
      if (!pid) return {} as Record<string, number>;
      const { data, error } = await supabase.rpc("get_profile_stats", { _user_id: pid });
      if (error) throw error;
      return data as Record<string, number>;
    },
  });
  if (p.isLoading)
    return <div className="mx-auto max-w-5xl px-4 py-16 text-muted-foreground">Loading…</div>;
  if (!p.data)
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-3xl">Reader not found</h1>
      </div>
    );
  const prof = p.data;
  const stats = statDefinitions.map(([label, key, Icon]) => ({
    label,
    key,
    Icon,
    value: counts.data?.[key] ?? 0,
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <section className="grid gap-6 sm:grid-cols-[150px_1fr] sm:items-start">
        <UserAvatar
          name={prof.display_name}
          src={prof.avatar_url}
          className="size-32 rounded-2xl text-4xl shadow-cover sm:size-[150px]"
        />
        <div className="min-w-0 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl sm:text-4xl">{prof.display_name}</h1>
            {prof.is_verified && <BadgeCheck className="size-5 text-primary" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">@{prof.username}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {prof.is_professional && (
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                Reviewer
              </span>
            )}
            {prof.expertise && (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                {prof.expertise}
              </span>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <FollowButton profileId={prof.id} />
            <Button variant="outline" onClick={() => setDrawer("hire")}>
              <BriefcaseBusiness data-icon="inline-start" /> Hire me
            </Button>
            <Button variant="outline" onClick={() => setDrawer("support")}>
              <Heart data-icon="inline-start" /> Support me
            </Button>
            {userId === prof.id && (
              <Button variant="ghost" asChild>
                <Link to="/settings">Edit profile</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
      <WavyDivider />
      <section
        aria-label="Profile statistics"
        className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8"
      >
        {stats.map(({ label, value, Icon }) => (
          <div key={label} className="rounded-lg border bg-card px-2 py-3 text-center">
            <Icon className="mx-auto mb-1 size-4 text-muted-foreground" />
            <p className="font-display text-xl font-semibold">{value}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>
      <WavyDivider />
      <section>
        <SectionTitle>About</SectionTitle>
        {prof.bio ? (
          <Bio text={prof.bio} />
        ) : (
          <p className="font-reading text-lg text-muted-foreground">
            This reader hasn&apos;t added a bio yet.
          </p>
        )}
        {prof.website && (
          <a
            href={prof.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Globe className="size-4" /> Website <ExternalLink className="size-3" />
          </a>
        )}
      </section>
      <WavyDivider />
      <section>
        <SectionTitle>Reviewed</SectionTitle>
        <div className="mt-5">
          <ReviewedCovers uid={prof.id} onViewMore={() => setDrawer("reviews")} />
        </div>
      </section>
      <WavyDivider />
      <section>
        <SectionTitle>Thoughts</SectionTitle>
        <div className="mt-5">
          <UserThoughts uid={prof.id} />
        </div>
      </section>
      <WavyDivider />
      <section>
        <SectionTitle>Recommendations</SectionTitle>
        <ProfileList uid={prof.id} kind="recommendation" />
      </section>
      <WavyDivider />
      <section>
        <SectionTitle>Want to Read</SectionTitle>
        <Shelf uid={prof.id} status="want" />
      </section>
      <WavyDivider />
      <section>
        <SectionTitle>Reading</SectionTitle>
        <Shelf uid={prof.id} status="reading" />
      </section>
      <WavyDivider />
      <section>
        <SectionTitle>Read</SectionTitle>
        <Shelf uid={prof.id} status="read" />
      </section>
      <WavyDivider />
      <section>
        <SectionTitle>My Favourites</SectionTitle>
        <ProfileList uid={prof.id} kind="favourite" />
      </section>
      <WavyDivider />
      <section>
        <SectionTitle>Following</SectionTitle>
        <FollowingList uid={prof.id} />
      </section>
      {userId === prof.id && <><WavyDivider /><section><SectionTitle>The Trail</SectionTitle><ProfileList uid={prof.id} kind="trail" /></section></>}
      <WavyDivider />
      <section>
        <SectionTitle>Elsewhere</SectionTitle>
        <div className="flex gap-2">
          {prof.website && (
            <SocialLink href={prof.website} label="Website">
              <Globe />
            </SocialLink>
          )}
          {prof.support_url && (
            <SocialLink href={prof.support_url} label="Support">
              <WalletCards />
            </SocialLink>
          )}
          {prof.contact_url && isHttpUrl(prof.contact_url) && <SocialLink href={prof.contact_url} label="Contact">
            <Mail />
          </SocialLink>}
        </div>
      </section>
      <Drawer open={drawer !== null} onOpenChange={(open) => !open && setDrawer(null)}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-lg">
            <DrawerHeader>
              <DrawerTitle>
                {drawer === "hire"
                  ? `Work with ${prof.display_name}`
                  : drawer === "reviews"
                    ? `More reviews by ${prof.display_name}`
                    : `Support ${prof.display_name}`}
              </DrawerTitle>
              <DrawerDescription>
                {drawer === "hire"
                  ? "Book reviews, editorial notes and thoughtful recommendations."
                  : drawer === "reviews"
                    ? "Browse the rest of this reader's reviewed books."
                    : "A little support helps keep independent reading and reviewing going."}
              </DrawerDescription>
            </DrawerHeader>
            {drawer === "reviews" ? (
              <div className="max-h-[55vh] overflow-y-auto px-4 pb-4">
                <UserReviews uid={prof.id} />
              </div>
            ) : drawer === "hire" ? (
              <div className="px-4 pb-4">
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p className="font-medium">Reviewer rates</p>
                   <p className="mt-1 whitespace-pre-line text-muted-foreground">{prof.reviewer_rates || "No rates listed."}</p>
                   {prof.publication_details && <p className="mt-3 whitespace-pre-line">{prof.publication_details}</p>}
                </div>
                 {prof.contact_url && isHttpUrl(prof.contact_url) ? <Button className="mt-4 w-full" asChild><a href={prof.contact_url} target="_blank" rel="noopener noreferrer">Let&apos;s talk</a></Button> : <p className="mt-4 text-sm text-muted-foreground">No contact link provided.</p>}
              </div>
            ) : (
              <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2">
                 {prof.coffee_url && <Button variant="outline" asChild>
                   <a href={prof.coffee_url} target="_blank" rel="noopener noreferrer">
                    <Heart data-icon="inline-start" /> Buy me a coffee
                  </a>
                 </Button>}
                 {prof.paypal_url && <Button variant="outline" asChild>
                   <a href={prof.paypal_url} target="_blank" rel="noopener noreferrer">
                    <WalletCards data-icon="inline-start" /> PayPal
                  </a>
                 </Button>}
                 {prof.support_url && <Button variant="outline" asChild><a href={prof.support_url} target="_blank" rel="noopener noreferrer"><Heart />Support this reader</a></Button>}
                 {!prof.coffee_url && !prof.paypal_url && !prof.support_url && <p className="text-sm text-muted-foreground">No support links provided.</p>}
              </div>
            )}
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="ghost">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl">{children}</h2>;
}
function Bio({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 280;
  return (
    <div>
      <p
        className={cn(
          "mt-3 max-w-3xl whitespace-pre-line font-reading text-lg leading-relaxed",
          !expanded && long && "line-clamp-4",
        )}
      >
        {text}
      </p>
      {long && (
        <Button variant="ghost"
          className="mt-2 block w-full text-center text-sm font-medium text-primary hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Read more"}
        </Button>
      )}
    </div>
  );
}
function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </a>
  );
}

function ReviewedCovers({ uid, onViewMore }: { uid: string; onViewMore: () => void }) {
  const q = useQuery({
    queryKey: ["reviewed-covers", uid],
    queryFn: async () =>
      (
        await supabase
          .from("reviews")
          .select(REVIEW_SELECT + ", is_draft")
          .eq("user_id", uid)
          .eq("is_draft", false)
           .eq("is_hidden", false)
          .order("updated_at", { ascending: false })
          .limit(8)
      ).data as unknown as ReviewCardData[],
  });
  const books = (q.data ?? [])
    .map((review) => review.books)
    .filter((book): book is NonNullable<ReviewCardData["books"]> => Boolean(book));
  if (q.isSuccess && books.length === 0) return <EmptyState title="No reviews yet" />;
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {books.map((book) => (
          <Link key={book.slug} to="/books/$slug" params={{ slug: book.slug }} className="min-w-0">
            <BookCover src={book.cover_url} title={book.title} />
          </Link>
        ))}
      </div>
      <Button variant="ghost"
        type="button"
        onClick={onViewMore}
        className="mt-5 block w-full text-center text-sm font-medium text-primary hover:underline"
      >
        View more
      </Button>
    </div>
  );
}

function UserReviews({ uid }: { uid: string }) {
  const { userId } = useAuth();
  const q = useQuery({
    queryKey: ["user-reviews", uid, userId],
    queryFn: async () =>
      (
        await supabase
          .from("reviews")
          .select(REVIEW_SELECT + ", is_draft")
          .eq("user_id", uid)
          .eq("is_hidden", false)
          .order("updated_at", { ascending: false })
          .limit(100)
      ).data as unknown as (ReviewCardData & { is_draft: boolean })[],
  });
  const items = q.data ?? [];
  const published = items.filter((r) => !r.is_draft);
  if (q.isSuccess && published.length === 0) return <EmptyState title="No reviews yet" />;
  return (
    <div>
      {published.map((r) => (
        <ReviewCard key={r.id} r={r} />
      ))}
    </div>
  );
}
function UserThoughts({ uid }: { uid: string }) {
  const [active, setActive] = useState(0);
  const q = useQuery({
    queryKey: ["user-thoughts", uid],
    queryFn: async () =>
      (
        await supabase
          .from("short_thoughts")
          .select(THOUGHT_SELECT)
          .eq("user_id", uid)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(100)
      ).data as unknown as ThoughtCardData[],
  });
  const thoughts = q.data ?? [];
  useEffect(() => {
    if (thoughts.length <= 2) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % thoughts.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [thoughts.length]);
  if (q.isSuccess && thoughts.length === 0) return <EmptyState title="No short thoughts yet" />;
  if (thoughts.length <= 2) {
    return (
      <div>
        {thoughts.map((t) => (
          <ThoughtCard key={t.id} t={t} />
        ))}
      </div>
    );
  }
  const current = thoughts[active % thoughts.length];
  return current ? <ThoughtCard key={current.id} t={current} /> : null;
}
type ShelfBook = { id: string; slug: string; title: string; cover_url: string | null };
function ProfileList({ uid, kind }: { uid: string; kind: "favourite" | "recommendation" | "trail" }) {
  const q = useQuery({ queryKey: kind === "trail" ? ["trail", uid] : ["profile-list", uid, kind], queryFn: async () => {
    const result = kind === "trail"
      ? await supabase.from("book_views").select("books(id, slug, title, cover_url)").eq("user_id", uid).order("viewed_at", { ascending: false }).limit(30)
      : await supabase.from("book_lists").select("books(id, slug, title, cover_url)").eq("user_id", uid).eq("kind", kind).order("created_at", { ascending: false }).limit(200);
    if (result.error) throw result.error;
    return (result.data ?? []).map((row) => row.books).filter((book): book is ShelfBook => Boolean(book));
  }});
  if (q.isError) return <p className="mt-3 text-sm text-muted-foreground">Unable to load books.</p>;
  if (q.isSuccess && !q.data.length) return <EmptyState title={kind === "trail" ? "No recently viewed books" : "This shelf is empty"} />;
  return <div className="mt-4 flex gap-3 overflow-x-auto pb-2">{(q.data ?? []).map((book) => <Link key={book.id} to="/books/$slug" params={{ slug: book.slug }} className="w-28 shrink-0 sm:w-32"><BookCover src={book.cover_url} title={book.title} /><p className="mt-1.5 line-clamp-2 text-xs">{book.title}</p></Link>)}</div>;
}
type FollowingProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

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
      return (data ?? [])
        .map((d) => d.books as ShelfBook | null)
        .filter((book): book is ShelfBook => Boolean(book));
    },
  });
  if (q.isSuccess && q.data.length === 0) return <EmptyState title="This shelf is empty" />;
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {(q.data ?? []).map((b) => (
        <Link
          key={b.id}
          to="/books/$slug"
          params={{ slug: b.slug }}
          className="w-28 shrink-0 sm:w-32"
        >
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
      const { data } = await supabase
        .from("follows")
        .select("profiles!follows_following_id_fkey(id, username, display_name, avatar_url)")
        .eq("follower_id", uid)
        .limit(200);
      return (data ?? [])
        .map((d) => d.profiles as FollowingProfile | null)
        .filter((profile): profile is FollowingProfile => Boolean(profile));
    },
  });
  if (q.isSuccess && q.data.length === 0) return <EmptyState title="Not following anyone yet" />;
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {(q.data ?? []).map((p) => (
        <Link
          key={p.id}
          to="/u/$username"
          params={{ username: p.username }}
          className="w-20 shrink-0 text-center"
        >
          <UserAvatar name={p.display_name} src={p.avatar_url} className="mx-auto size-16" />
          <p className="mt-2 truncate text-xs">{p.display_name}</p>
        </Link>
      ))}
    </div>
  );
}
