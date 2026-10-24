import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchRecometer } from "@/lib/queries";
import { LOW_VOTE_THRESHOLD, recometerPercents } from "@/lib/rules";
import { cn } from "@/lib/utils";

export function Recometer({ bookId, mobile }: { bookId: string; mobile?: boolean }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const stats = useQuery({
    queryKey: ["recometer", bookId],
    queryFn: () => fetchRecometer(bookId),
  });
  const mine = useQuery({
    queryKey: ["recometer-mine", bookId, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("recometer_votes")
        .select("recommend")
        .eq("book_id", bookId)
        .eq("user_id", userId!)
        .maybeSingle();
      return data ? data.recommend : null;
    },
  });

  const vote = useMutation({
    mutationFn: async (value: boolean) => {
      if (mine.data === value) {
        const { error } = await supabase
          .from("recometer_votes")
          .delete()
          .eq("book_id", bookId)
          .eq("user_id", userId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("recometer_votes")
          .upsert({ book_id: bookId, user_id: userId!, recommend: value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recometer", bookId] });
      qc.invalidateQueries({ queryKey: ["recometer-mine", bookId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const t = stats.data ?? { total: 0, recommend: 0, notRecommend: 0 };
  const p = recometerPercents(t);

  return (
    <section
      className={cn(mobile ? "border-0 bg-transparent p-0" : "rounded-lg border bg-card p-5")}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg">Recometer</h3>
        <span className="text-xs text-muted-foreground">
          {t.total} {t.total === 1 ? "vote" : "votes"}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Would you recommend this book to another reader?
      </p>

      {t.total > 0 ? (
        <>
          <div
            className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${p.recommend}% would recommend`}
          >
            <div className="bg-recommend transition-all" style={{ width: `${p.recommend}%` }} />
            <div
              className="bg-not-recommend transition-all"
              style={{ width: `${p.notRecommend}%` }}
            />
          </div>
          <p className="mt-2 text-sm">
            <span className="font-semibold">{p.recommend}%</span> would recommend ·{" "}
            <span className="font-semibold">{p.notRecommend}%</span> wouldn't
          </p>
          {t.total < LOW_VOTE_THRESHOLD && (
            <p className="mt-1 text-xs text-muted-foreground">
              An early signal from only a few readers.
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No votes yet. Be the first to say.</p>
      )}

      {userId ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              disabled={vote.isPending}
              onClick={() => vote.mutate(v)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                mine.data === v
                  ? v
                    ? "border-recommend bg-recommend/15"
                    : "border-not-recommend bg-not-recommend/15"
                  : "hover:bg-muted",
              )}
            >
              {v ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
              {v ? "Would recommend" : "Wouldn't"}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm">
          <Link to="/auth" className="text-primary underline underline-offset-4">
            Sign in
          </Link>{" "}
          to vote.
        </p>
      )}
      {mine.data !== null && mine.data !== undefined && (
        <p className="mt-2 text-xs text-muted-foreground">
          Tap your choice again to withdraw your vote.
        </p>
      )}
    </section>
  );
}
