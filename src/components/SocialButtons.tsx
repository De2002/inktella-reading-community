import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Flag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function FollowButton({ profileId }: { profileId: string }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["follow", userId, profileId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("follower_id").match({ follower_id: userId!, following_id: profileId }).maybeSingle();
      return !!data;
    },
  });
  const m = useMutation({
    mutationFn: async () => {
      const { error } = q.data
        ? await supabase.from("follows").delete().match({ follower_id: userId!, following_id: profileId })
        : await supabase.from("follows").insert({ follower_id: userId!, following_id: profileId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow"] });
      qc.invalidateQueries({ queryKey: ["follow-counts", profileId] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (userId === profileId) return null;
  return (
    <Button
      variant={q.data ? "outline" : "default"}
      size="sm"
      disabled={m.isPending}
      onClick={() => (userId ? m.mutate() : navigate({ to: "/auth" }))}
    >
      {q.data ? "Following" : "Follow"}
    </Button>
  );
}

export function ReportButton({ targetType, targetId, label = "Report" }: { targetType: string; targetId: string; label?: string }) {
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reports").insert({ target_type: targetType, target_id: targetId, reason, reporter_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks. Our moderators will take a look.");
      setOpen(false);
      setReason("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Flag className="h-3.5 w-3.5" /> {label}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this content</DialogTitle>
        </DialogHeader>
        <Textarea placeholder="What's wrong with it?" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
        <DialogFooter>
          <Button disabled={reason.trim().length < 3 || send.isPending} onClick={() => send.mutate()}>
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
