import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BookMarked, BookOpen, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const STATUS_LABELS = { want: "Want to Read", reading: "Currently Reading", read: "Read" } as const;
type Status = keyof typeof STATUS_LABELS;
const ICONS = { want: BookMarked, reading: BookOpen, read: Check };

export function ReadingStatus({ bookId, compact }: { bookId: string; compact?: boolean }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const current = useQuery({
    queryKey: ["status", bookId, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("reading_statuses").select("status").eq("book_id", bookId).eq("user_id", userId!).maybeSingle();
      return (data?.status ?? null) as Status | null;
    },
  });
  const set = useMutation({
    mutationFn: async (s: Status) => {
      if (current.data === s) {
        const { error } = await supabase.from("reading_statuses").delete().match({ book_id: bookId, user_id: userId! });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reading_statuses")
          .upsert({ book_id: bookId, user_id: userId!, status: s, updated_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["status", bookId] });
      qc.invalidateQueries({ queryKey: ["shelves"] });
      qc.invalidateQueries({ queryKey: ["activity", bookId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className={cn("grid gap-1.5", compact ? "grid-cols-3" : "grid-cols-1")}>
      {(Object.keys(STATUS_LABELS) as Status[]).map((s) => {
        const Icon = ICONS[s];
        const active = current.data === s;
        return (
          <button
            key={s}
            disabled={set.isPending}
            onClick={() => (userId ? set.mutate(s) : navigate({ to: "/auth" }))}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
              compact && "justify-center px-2 text-xs",
              active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{STATUS_LABELS[s]}</span>
          </button>
        );
      })}
    </div>
  );
}
