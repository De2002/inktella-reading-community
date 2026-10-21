import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LOW_VOTE_THRESHOLD } from "@/lib/rules";
import { cn } from "@/lib/utils";

const SEG = ["bg-seg-1", "bg-seg-2", "bg-seg-3", "bg-primary", "bg-muted-foreground"];

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
      const { data } = await supabase.from("consensus_votes").select("question_id, answer").eq("book_id", bookId).eq("user_id", userId!);
      return Object.fromEntries((data ?? []).map((d) => [d.question_id, d.answer])) as Record<string, string>;
    },
  });

  const answer = useMutation({
    mutationFn: async ({ qid, value }: { qid: string; value: string }) => {
      if (mine.data?.[qid] === value) {
        const { error } = await supabase.from("consensus_votes").delete().match({ book_id: bookId, user_id: userId!, question_id: qid });
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
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg">Reader Consensus</h3>
        {userId && (
          <button onClick={() => setEditing((e) => !e)} className="text-sm text-primary underline-offset-4 hover:underline">
            {editing ? "Done" : Object.keys(mine.data ?? {}).length ? "Edit my answers" : "Add my answers"}
          </button>
        )}
      </div>
      <div className="mt-4 space-y-5">
        {(questions.data ?? []).map((q) => {
          const rows = (results.data ?? []).filter((r) => r.question_id === q.id);
          const total = rows.reduce((s, r) => s + r.votes, 0);
          return (
            <div key={q.id}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{q.prompt}</p>
                <span className="text-xs text-muted-foreground">{total} {total === 1 ? "vote" : "votes"}</span>
              </div>
              {total > 0 ? (
                <>
                  <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-muted">
                    {q.options.map((o, i) => {
                      const v = rows.find((r) => r.answer === o)?.votes ?? 0;
                      return <div key={o} className={SEG[i % SEG.length]} style={{ width: `${(v / total) * 100}%` }} />;
                    })}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {q.options.map((o, i) => {
                      const v = rows.find((r) => r.answer === o)?.votes ?? 0;
                      return (
                        <span key={o} className="flex items-center gap-1">
                          <span className={cn("h-2 w-2 rounded-full", SEG[i % SEG.length])} />
                          {o} {Math.round((v / total) * 100)}%
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">No answers yet.</p>
              )}
              {editing && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {q.options.map((o) => (
                    <button
                      key={o}
                      onClick={() => answer.mutate({ qid: q.id, value: o })}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        mine.data?.[q.id] === o ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
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
      {(results.data ?? []).length > 0 && (results.data ?? []).reduce((s, r) => s + r.votes, 0) < LOW_VOTE_THRESHOLD && (
        <p className="mt-4 text-xs text-muted-foreground">Based on a small number of readers so far.</p>
      )}
    </section>
  );
}
