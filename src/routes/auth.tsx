import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Inktella" },
      { name: "description", content: "Join Inktella to write reviews, keep shelves and follow readers." },
      { property: "og:title", content: "Sign in — Inktella" },
      { property: "og:description", content: "Join a community of readers and reviewers." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const { userId } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) navigate({ to: "/" });
  }, [userId, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      } else if (mode === "up") {
        const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
        if (clean.length < 3) throw new Error("Username needs at least 3 letters or numbers");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { username: clean, display_name: username } },
        });
        if (error) throw error;
        if (!data.session) setSent("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("If that email has an account, a reset link is on its way.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-3xl">{mode === "in" ? "Welcome back" : mode === "up" ? "Join Inktella" : "Reset password"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "up" ? "Free forever for readers and reviewers." : "One book. Hundreds of perspectives."}
      </p>
      {sent ? (
        <p className="mt-8 rounded-md border bg-card p-4 text-sm">{sent}</p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "up" && (
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={30} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}
          </Button>
        </form>
      )}
      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        {mode !== "in" && <button className="block hover:text-foreground" onClick={() => { setMode("in"); setSent(null); }}>Already have an account? Sign in</button>}
        {mode !== "up" && <button className="block hover:text-foreground" onClick={() => { setMode("up"); setSent(null); }}>New here? Create an account</button>}
        {mode === "in" && <button className="block hover:text-foreground" onClick={() => setMode("forgot")}>Forgot your password?</button>}
      </div>
    </div>
  );
}
