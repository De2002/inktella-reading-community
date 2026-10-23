import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/copyright")({
  head: () => ({
    meta: [
      { title: "Copyright & cover removal — Inktella" },
      { name: "description", content: "Request removal of a cover image or report a copyright concern on Inktella." },
      { property: "og:title", content: "Copyright & cover removal — Inktella" },
      { property: "og:description", content: "How to raise a copyright concern or cover-image removal request." },
    ],
  }),
  component: Copyright,
});

function Copyright() {
  const { userId } = useAuth();
  const [link, setLink] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-4xl">Copyright & cover removal</h1>
      <div className="prose-ink mt-6 text-base">
        <p>
          Covers and book details on Inktella come from public catalogues or from members. If you hold rights to a cover,
          passage or other material and want it removed or corrected, tell us below. Requests about listings, cover
          permissions, factual details and independent reviews are each looked at separately.
        </p>
        <p>Independent reviews are the opinions of their writers and are not removed simply because they are critical.</p>
      </div>
      {done ? (
        <p className="mt-8 rounded-md border bg-card p-4">Thanks — your request has been sent to our moderators.</p>
      ) : (
        <form
          className="mt-8 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase.from("reports").insert({
              target_type: "copyright",
              target_id: link.slice(0, 500),
              reason: details,
              contact_email: email,
              reporter_id: userId,
            });
            if (error) { toast.error(error.message); return; }
            setDone(true);
          }}
        >
          <Input required placeholder="Link to the page on Inktella" value={link} onChange={(e) => setLink(e.target.value)} />
          <Input required type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Textarea required minLength={3} rows={5} placeholder="What should we remove or correct, and why?" value={details} onChange={(e) => setDetails(e.target.value)} />
          <Button type="submit">Send request</Button>
        </form>
      )}
    </div>
  );
}
