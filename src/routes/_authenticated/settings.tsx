import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/upload";
import { useQueryClient } from "@tanstack/react-query";
import { isHttpUrl } from "@/lib/rules";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Inktella" },
      { name: "description", content: "Edit your Inktella profile." },
      { property: "og:title", content: "Settings — Inktella" },
      { property: "og:description", content: "Edit your Inktella profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const qc = useQueryClient();
  const { profile, userId, refreshProfile } = useAuth();
  const [f, setF] = useState({ username: "", display_name: "", bio: "", website: "", support_url: "", expertise: "", avatar_url: "", is_professional: false, reviewer_rates: "", publication_details: "", contact_url: "", coffee_url: "", paypal_url: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (profile)
      setF({
        username: profile.username,
        display_name: profile.display_name,
        bio: profile.bio,
        website: profile.website ?? "",
        support_url: profile.support_url ?? "",
        expertise: profile.expertise,
        avatar_url: profile.avatar_url ?? "",
        is_professional: profile.is_professional,
        reviewer_rates: profile.reviewer_rates,
        publication_details: profile.publication_details,
        contact_url: profile.contact_url ?? "",
        coffee_url: profile.coffee_url ?? "",
        paypal_url: profile.paypal_url ?? "",
      });
  }, [profile]);
  if (!profile) return <div className="mx-auto max-w-xl px-4 py-16 text-muted-foreground">Loading…</div>;
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!userId || saving) return;
    if ([f.website, f.support_url, f.contact_url, f.coffee_url, f.paypal_url].some((url) => url && !isHttpUrl(url))) { toast.error("Please use valid http or https links"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        ...f,
        username: f.username.toLowerCase(),
        website: f.website || null,
        support_url: f.support_url || null,
        avatar_url: f.avatar_url || null,
        contact_url: f.contact_url || null,
        coffee_url: f.coffee_url || null,
        paypal_url: f.paypal_url || null,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) { toast.error(error.message.includes("duplicate") ? "That username is taken" : error.message); return; }
    toast.success("Profile saved");
    refreshProfile();
    void qc.invalidateQueries({ queryKey: ["profile"] });
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-10">
      <h1 className="text-3xl">Your profile</h1>
      <div className="flex items-center gap-4">
        <UserAvatar name={f.display_name} src={f.avatar_url} className="h-16 w-16" />
        <Input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !userId) return;
            try {
              setF({ ...f, avatar_url: await uploadImage(file, userId) });
            } catch (err: any) {
              toast.error(err.message);
            }
          }}
        />
      </div>
      <div className="space-y-1.5"><Label>Display name</Label><Input value={f.display_name} onChange={set("display_name")} maxLength={60} /></div>
      <div className="space-y-1.5"><Label>Username</Label><Input value={f.username} onChange={set("username")} maxLength={30} /><p className="text-xs text-muted-foreground">Lowercase letters, numbers and underscores.</p></div>
      <div className="space-y-1.5"><Label>Bio</Label><Textarea value={f.bio} onChange={set("bio")} rows={4} maxLength={1000} /></div>
      <div className="space-y-1.5"><Label>Website</Label><Input value={f.website} onChange={set("website")} placeholder="https://" /></div>
      <div className="space-y-1.5"><Label>Support link (Buy Me a Coffee, PayPal…)</Label><Input value={f.support_url} onChange={set("support_url")} placeholder="https://" /></div>
      <div className="space-y-1.5"><Label htmlFor="contact-url">Contact / booking link</Label><Input id="contact-url" value={f.contact_url} onChange={set("contact_url")} placeholder="https://" maxLength={2000} /></div>
      <div className="space-y-1.5"><Label htmlFor="coffee-url">Buy Me a Coffee link</Label><Input id="coffee-url" value={f.coffee_url} onChange={set("coffee_url")} placeholder="https://" maxLength={2000} /></div>
      <div className="space-y-1.5"><Label htmlFor="paypal-url">PayPal link</Label><Input id="paypal-url" value={f.paypal_url} onChange={set("paypal_url")} placeholder="https://" maxLength={2000} /></div>
      <div className="space-y-1.5"><Label htmlFor="reviewer-rates">Reviewer rates</Label><Textarea id="reviewer-rates" value={f.reviewer_rates} onChange={set("reviewer_rates")} maxLength={2000} /></div>
      <div className="space-y-1.5"><Label htmlFor="publication-details">Publication details</Label><Textarea id="publication-details" value={f.publication_details} onChange={set("publication_details")} maxLength={2000} /></div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_professional} onCheckedChange={(v) => setF({ ...f, is_professional: v })} /> Show me as a reviewer (critic, blogger, editor)</label>
      {f.is_professional && <div className="space-y-1.5"><Label>Areas of expertise</Label><Input value={f.expertise} onChange={set("expertise")} placeholder="Literary fiction, African writing, poetry" /></div>}
      <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
    </div>
  );
}
