import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LOW_VOTE_THRESHOLD } from "@/lib/rules";
import { cn } from "@/lib/utils";

const SEG = [
  { bar: "bg-orange-500", text: "text-foreground" },
  { bar: "bg-rose-500", text: "text-white" },
  { bar: "bg-purple-900", text: "text-white" },
  { bar: "bg-sky-900", text: "text-white" },
  { bar: "bg-cyan-700", text: "text-white" },
  { bar: "bg-cyan-200", text: "text-foreground" },
];

export function ReaderConsensus({ bookId, category }: { bookId: string; category: string }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const questions = useQuery({
    queryKey: ["consensus-q", category],
    queryFn: async () => {
      const { data } = await supabase
        .from("consensus_questions")
        .select("*")
        .eq("category", category as any)
        .eq("active", true)
        .order("sort");
      return data ?? [];
    },
  });
  const results = useQuery({
    queryKey: ["consensus", bookId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_consensus", { _book_id: bookId });
      return data ?? [];
    },
  });
  const mine = useQuery({
    queryKey: ["consensus-mine", bookId, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("consensus_votes")
        .select("question_id, answer")
        .eq("book_id", bookId)
        .eq("user_id", userId!);
      return Object.fromEntries((data ?? []).map((d) => [d.question_id, d.answer])) as Record<
        string,
        string
      >;
    },
  });

  const answer = useMutation({
    mutationFn: async ({ qid, value }: { qid: string; value: string }) => {
      if (mine.data?.[qid] === value) {
        const { error } = await supabase
          .from("consensus_votes")
          .delete()
          .match({ book_id: bookId, user_id: userId!, question_id: qid });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("consensus_votes")
          .upsert({ book_id: bookId, user_id: userId!, question_id: qid, answer: value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consensus", bookId] });
      qc.invalidateQueries({ queryKey: ["consensus-mine", bookId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="w-full bg-transparent py-2">
      <div className="flex justify-end">
        {userId && (
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            {editing ? "Done" : Object.keys(mine.data ?? {}).length ? "Edit" : "Add yours"}
          </button>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-8">
        {(questions.data ?? []).map((q) => {
          const rows = (results.data ?? []).filter((r) => r.question_id === q.id);
          const total = rows.reduce((s, r) => s + r.votes, 0);
          return (
            <div key={q.id} className="text-center">
              <p className="text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                {q.prompt}
              </p>
              {total > 0 ? (
                <>
                  <div className="mx-auto mt-3 flex h-10 w-full max-w-2xl overflow-hidden rounded-full bg-muted font-semibold sm:h-12">
                    {q.options.map((o, i) => {
                      const v = rows.find((r) => r.answer === o)?.votes ?? 0;
                      const percentage = Math.round((v / total) * 100);
                      return percentage > 0 ? (
                        <div
                          key={o}
                          className={cn(
                            "flex min-w-0 items-center justify-center border-r-4 border-background px-1 text-base last:border-r-0 sm:text-xl",
                            SEG[i % SEG.length].bar,
                            SEG[i % SEG.length].text,
                          )}
                          style={{ width: `${percentage}%` }}
                          title={`${o}: ${percentage}%`}
                        >
                          <span className="truncate">{percentage}%</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-x-7 gap-y-3 text-base text-muted-foreground sm:text-lg">
                    {q.options.map((o, i) => {
                      const v = rows.find((r) => r.answer === o)?.votes ?? 0;
                      return (
                        <span key={o} className="flex items-center gap-2">
                          <span
                            className={cn("size-3 rounded-full sm:size-4", SEG[i % SEG.length].bar)}
                          />
                          {o}
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">No answers yet.</p>
              )}
              {editing && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {q.options.map((o) => (
                    <button
                      key={o}
                      onClick={() => answer.mutate({ qid: q.id, value: o })}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        mine.data?.[q.id] === o
                          ? "border-foreground bg-foreground text-background"
                          : "hover:bg-muted",
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {(results.data ?? []).length > 0 &&
        (results.data ?? []).reduce((s, r) => s + r.votes, 0) < LOW_VOTE_THRESHOLD && (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Based on a small number of readers so far.
          </p>
        )}
    </section>
  );
}
