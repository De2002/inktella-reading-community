import { supabase } from "@/integrations/supabase/client";

export const BOOK_SELECT = "*, book_authors(position, authors(id, name))";
export const REVIEW_SELECT =
  "id, title, excerpt, word_count, rating, has_spoilers, content_warning, like_count, comment_count, published_at, is_featured, user_id, book_id, profiles(username, display_name, avatar_url, is_verified, is_professional), books(slug, title, cover_url)";
export const THOUGHT_SELECT =
  "id, body, has_spoilers, created_at, user_id, book_id, profiles(username, display_name, avatar_url), books(slug, title, cover_url)";

export type BookAuthorsRow = { book_authors?: { position: number; authors: { id: string; name: string } | null }[] | null };

export function authorNames(b: BookAuthorsRow) {
  return (b.book_authors ?? [])
    .slice()
    .sort((a, z) => a.position - z.position)
    .map((ba) => ba.authors)
    .filter(Boolean) as { id: string; name: string }[];
}

export async function fetchRecometer(bookId: string) {
  const { data, error } = await supabase.rpc("get_recometer", { _book_id: bookId });
  if (error) throw error;
  const row = data?.[0] ?? { recommend: 0, not_recommend: 0, total: 0 };
  return { recommend: row.recommend, notRecommend: row.not_recommend, total: row.total };
}

export const PAGE_SIZE = 12;
