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
import { useState } from "react";
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

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Inktella` },
      {
        name: "description",
        content: `Reviews, shelves and short thoughts from @${params.username} on Inktella.`,
      },
    ],
  }),
  component: Profile,
});

type Tab = "reviews" | "thoughts" | "want" | "reading" | "read" | "following";
type DrawerKind = "hire" | "support" | null;

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
  const [tab, setTab] = useState<Tab>("reviews");
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const p = useQuery({
    queryKey: ["profile", username],
    queryFn: async () =>
      (await supabase.from("profiles").select("*").eq("username", username).maybeSingle()).data,
  });
  const pid = p.data?.id;
  const counts = useQuery({
    queryKey: ["follow-counts", pid],
    enabled: !!pid,
    queryFn: async () => {
      const [a, b] = await Promise.all([
        supabase
          .from("follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("following_id", pid!),
        supabase
          .from("follows")
          .select("following_id", { count: "exact", head: true })
          .eq("follower_id", pid!),
      ]);
      return { followers: a.count ?? 0, following: b.count ?? 0 };
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
  const tabs: [Tab, string][] = [
    ["reviews", "Reviewed"],
    ["thoughts", "Thoughts"],
    ["want", "Want to Read"],
    ["reading", "Reading"],
    ["read", "Read"],
    ["following", "Following"],
  ];
  const stats = statDefinitions.map(([label, key, Icon]) => ({
    label,
    key,
    Icon,
    value:
      key === "followers"
        ? (counts.data?.followers ?? 0)
        : key === "following"
          ? (counts.data?.following ?? 0)
          : 0,
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
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8"
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
        <div className="flex items-end justify-between gap-4">
          <SectionTitle>{tabs.find(([key]) => key === tab)?.[1] ?? "Reviewed"}</SectionTitle>
          <div className="flex max-w-full gap-4 overflow-x-auto">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "shrink-0 border-b-2 pb-2 text-sm",
                  tab === key
                    ? "border-foreground font-medium"
                    : "border-transparent text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5">
          {tab === "reviews" && <UserReviews uid={prof.id} />}
          {tab === "thoughts" && <UserThoughts uid={prof.id} />}
          {(tab === "want" || tab === "reading" || tab === "read") && (
            <Shelf uid={prof.id} status={tab} />
          )}
          {tab === "following" && <FollowingList uid={prof.id} />}
        </div>
      </section>
      <WavyDivider />
      <section>
        <SectionTitle>Recommendations</SectionTitle>
        <Shelf uid={prof.id} status="read" />
      </section>
      <WavyDivider />
      <section>
        <SectionTitle>My Favourites</SectionTitle>
        <Shelf uid={prof.id} status="read" />
      </section>
      <WavyDivider />
      <section>
        <SectionTitle>The Trail</SectionTitle>
        <p className="text-sm text-muted-foreground">
          Recent books viewed by this reader will appear here.
        </p>
      </section>
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
          <SocialLink href="#" label="Email">
            <Mail />
          </SocialLink>
        </div>
      </section>
      <Drawer open={drawer !== null} onOpenChange={(open) => !open && setDrawer(null)}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-lg">
            <DrawerHeader>
              <DrawerTitle>
                {drawer === "hire"
                  ? `Work with ${prof.display_name}`
                  : `Support ${prof.display_name}`}
              </DrawerTitle>
              <DrawerDescription>
                {drawer === "hire"
                  ? "Book reviews, editorial notes and thoughtful recommendations."
                  : "A little support helps keep independent reading and reviewing going."}
              </DrawerDescription>
            </DrawerHeader>
            {drawer === "hire" ? (
              <div className="px-4 pb-4">
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p className="font-medium">Reviewer rates</p>
                  <p className="mt-1 text-muted-foreground">
                    Rates and publication details can be added from Settings.
                  </p>
                </div>
                <Button className="mt-4 w-full" disabled>
                  Let&apos;s talk
                </Button>
              </div>
            ) : (
              <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2">
                <Button variant="outline" asChild disabled={!prof.support_url}>
                  <a href={prof.support_url ?? "#"} target="_blank" rel="noopener noreferrer">
                    <Heart data-icon="inline-start" /> Buy me a coffee
                  </a>
                </Button>
                <Button variant="outline" asChild disabled={!prof.support_url}>
                  <a href={prof.support_url ?? "#"} target="_blank" rel="noopener noreferrer">
                    <WalletCards data-icon="inline-start" /> PayPal
                  </a>
                </Button>
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
        <button
          className="mt-2 block w-full text-center text-sm font-medium text-primary hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
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
  if (q.isSuccess && q.data.length === 0) return <EmptyState title="No short thoughts yet" />;
  return (
    <div>
      {(q.data ?? []).map((t) => (
        <ThoughtCard key={t.id} t={t} />
      ))}
    </div>
  );
}
type ShelfBook = { id: string; slug: string; title: string; cover_url: string | null };
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
