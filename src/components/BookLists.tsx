import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function BookLists({ bookId }: { bookId: string }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const key = ["book-lists", userId, bookId];
  const lists = useQuery({ queryKey: key, enabled: !!userId, queryFn: async () => {
    if (!userId) return [];
    const { data, error } = await supabase.from("book_lists").select("kind").eq("user_id", userId).eq("book_id", bookId);
    if (error) throw error;
    return data ?? [];
  }});
  useEffect(() => {
    if (!userId) return;
    void supabase.from("book_views").upsert({ user_id: userId, book_id: bookId, viewed_at: new Date().toISOString() }).then(({ error }) => {
      if (!error) void qc.invalidateQueries({ queryKey: ["trail", userId] });
    });
  }, [userId, bookId, qc]);
  const toggle = useMutation({ mutationFn: async (kind: "favourite" | "recommendation") => {
    if (!userId) return;
    const selected = lists.data?.some((item) => item.kind === kind);
    const result = selected
      ? await supabase.from("book_lists").delete().eq("user_id", userId).eq("book_id", bookId).eq("kind", kind)
      : await supabase.from("book_lists").insert({ user_id: userId, book_id: bookId, kind });
    if (result.error) throw result.error;
  }, onSuccess: () => { void qc.invalidateQueries({ queryKey: key }); void qc.invalidateQueries({ queryKey: ["profile-list"] }); }, onError: (error: Error) => toast.error(error.message) });
  if (!userId) return null;
  return <div className="mt-4 flex flex-wrap gap-2">{(["favourite", "recommendation"] as const).map((kind) => {
    const selected = lists.data?.some((item) => item.kind === kind);
    const Icon = kind === "favourite" ? Heart : ThumbsUp;
    return <Button key={kind} variant={selected ? "secondary" : "outline"} size="sm" aria-pressed={selected ?? false} disabled={toggle.isPending} onClick={() => toggle.mutate(kind)}><Icon className={selected ? "fill-current" : ""} />{kind === "favourite" ? "Favourite" : "Recommend"}</Button>;
  })}</div>;
}