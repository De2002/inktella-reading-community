import { useQuery } from "@tanstack/react-query";
import { fetchRecometer } from "@/lib/queries";
import { LOW_VOTE_THRESHOLD, recometerPercents } from "@/lib/rules";

export function Recometer({ bookId }: { bookId: string; mobile?: boolean }) {
  const stats = useQuery({
    queryKey: ["recometer", bookId],
    queryFn: () => fetchRecometer(bookId),
  });
  const t = stats.data ?? { total: 0, recommend: 0, notRecommend: 0 };
  const p = recometerPercents(t);

  return (
    <section className="border-0 bg-transparent p-0">
      {t.total > 0 ? (
        <div className="flex items-end justify-center gap-8 text-center">
          <div className="text-recommend">
            <strong className="block text-4xl font-bold tracking-tight sm:text-5xl">
              {p.recommend}%
            </strong>
            <span className="mt-1 block text-sm text-muted-foreground">Would recommend</span>
          </div>
          <div className="mb-2 h-12 w-px bg-border" />
          <div className="text-not-recommend">
            <strong className="block text-4xl font-bold tracking-tight sm:text-5xl">
              {p.notRecommend}%
            </strong>
            <span className="mt-1 block text-sm text-muted-foreground">
              Wouldn&apos;t recommend
            </span>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">No votes yet.</p>
      )}
      {t.total > 0 && t.total < LOW_VOTE_THRESHOLD && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          An early signal from only a few readers.
        </p>
      )}
    </section>
  );
}
