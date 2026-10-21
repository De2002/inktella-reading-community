import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Inktella" },
      { name: "description", content: "Set a new password for your Inktella account." },
      { property: "og:title", content: "Reset password — Inktella" },
      { property: "og:description", content: "Set a new password for your Inktella account." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  return (
    <form
      className="mx-auto max-w-sm space-y-4 px-4 py-16"
      onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error) return toast.error(error.message);
        toast.success("Password updated");
        navigate({ to: "/" });
      }}
    >
      <h1 className="text-3xl">New password</h1>
      <Input type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" />
      <Button type="submit" className="w-full">Save password</Button>
    </form>
  );
}
