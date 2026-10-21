import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { BadgeCheck, Heart, MessageCircle, Sparkles } from "lucide-react";
import { BookCover } from "./BookCover";
import { Spoiler } from "./Spoiler";
import { UserAvatar } from "./UserAvatar";

type Person = { username: string; display_name: string; avatar_url: string | null; is_verified?: boolean } | null;
type BookRef = { slug: string; title: string; cover_url: string | null } | null;

export type ReviewCardData = {
  id: string;
  title: string;
  excerpt: string;
  word_count: number;
  rating: number | null;
  has_spoilers: boolean;
  like_count: number;
  comment_count: number;
  published_at: string | null;
  is_featured: boolean;
  profiles: Person;
  books: BookRef;
};

export function ReviewCard({ r, showBook = true }: { r: ReviewCardData; showBook?: boolean }) {
  return (
    <article className="flex gap-4 border-b py-5 last:border-b-0">
      {showBook && r.books && (
        <Link to="/books/$slug" params={{ slug: r.books.slug }} className="w-14 shrink-0 sm:w-16">
          <BookCover src={r.books.cover_url} title={r.books.title} />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {r.profiles && (
            <Link to="/u/$username" params={{ username: r.profiles.username }} className="flex items-center gap-1.5 hover:text-foreground">
              <UserAvatar name={r.profiles.display_name} src={r.profiles.avatar_url} className="h-5 w-5" />
              <span className="font-medium text-foreground">{r.profiles.display_name}</span>
              {r.profiles.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
            </Link>
          )}
          {showBook && r.books && <span>on <span className="italic">{r.books.title}</span></span>}
          {r.is_featured && (
            <span className="flex items-center gap-1 text-primary"><Sparkles className="h-3 w-3" /> Editor's pick</span>
          )}
        </div>
        <Link to="/reviews/$id" params={{ id: r.id }} className="group block">
          <h3 className="mt-1.5 text-xl leading-snug group-hover:text-primary">{r.title}</h3>
          <div className="mt-1.5">
            <Spoiler active={r.has_spoilers}>
              <p className="line-clamp-3 font-reading text-[1.02rem] leading-relaxed text-muted-foreground">{r.excerpt}</p>
            </Spoiler>
          </div>
        </Link>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {r.like_count}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {r.comment_count}</span>
          <span>{r.word_count} words</span>
          {r.published_at && <span>{formatDistanceToNow(new Date(r.published_at), { addSuffix: true })}</span>}
        </div>
      </div>
    </article>
  );
}

export type ThoughtCardData = {
  id: string;
  body: string;
  has_spoilers: boolean;
  created_at: string;
  profiles: Person;
  books: BookRef;
};

export function ThoughtCard({ t, showBook = true, actions }: { t: ThoughtCardData; showBook?: boolean; actions?: React.ReactNode }) {
  return (
    <article className="border-b py-4 last:border-b-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {t.profiles && (
          <Link to="/u/$username" params={{ username: t.profiles.username }} className="flex items-center gap-1.5 hover:text-foreground">
            <UserAvatar name={t.profiles.display_name} src={t.profiles.avatar_url} className="h-5 w-5" />
            <span className="font-medium text-foreground">{t.profiles.display_name}</span>
          </Link>
        )}
        {showBook && t.books && (
          <>
            <span>on</span>
            <Link to="/books/$slug" params={{ slug: t.books.slug }} className="italic hover:text-foreground">{t.books.title}</Link>
          </>
        )}
        <span>· {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</span>
        <span className="ml-auto">{actions}</span>
      </div>
      <div className="mt-2">
        <Spoiler active={t.has_spoilers}>
          <p className="whitespace-pre-line font-reading text-[1.05rem] leading-relaxed">{t.body}</p>
        </Spoiler>
      </div>
    </article>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-10 text-center">
      <p className="font-display text-lg">{title}</p>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
