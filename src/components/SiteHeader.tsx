import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { PenLine, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/lib/theme";
import { Logo } from "./Logo";
import { UserAvatar } from "./UserAvatar";

export function SiteHeader() {
  const { userId, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 8 || currentScrollY < lastScrollY.current) {
        setHeaderVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setHeaderVisible(false);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-background/90 backdrop-blur transition-transform duration-200 ${headerVisible ? "translate-y-0" : "-translate-y-full"}`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
          <Logo className="h-7 w-7" />
          Inktella
        </Link>
        <form
          className="ml-2 hidden flex-1 sm:block"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/search", search: { q } });
          }}
        >
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search books, authors, readers"
              className="h-9 w-full rounded-full border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </form>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="sm:hidden" asChild aria-label="Search">
            <Link to="/search" search={{ q: "" }}>
              <Search className="h-4 w-4" />
            </Link>
          </Button>
          <ThemeToggle />
          {userId ? (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/write" search={{}}>
                  <PenLine className="mr-1 h-4 w-4" /> Write
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="ml-1 rounded-full" aria-label="Account menu">
                  <UserAvatar name={profile?.display_name ?? "?"} src={profile?.avatar_url} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {profile && (
                    <DropdownMenuItem asChild>
                      <Link to="/u/$username" params={{ username: profile.username }}>
                        My profile & shelves
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/write" search={{}}>
                      Write a review
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/submit">Submit a book</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">Admin</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground">
        <p>
          <span className="font-display text-foreground">Inktella</span> · One book. Hundreds of
          perspectives.
        </p>
        <div className="flex gap-4">
          <Link to="/copyright" className="hover:text-foreground">
            Copyright & cover removal
          </Link>
        </div>
      </div>
    </footer>
  );
}
