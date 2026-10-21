import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type AuthState = {
  session: Session | null;
  userId: string | null;
  profile: Tables<"profiles"> | null;
  isAdmin: boolean;
  ready: boolean;
  refreshProfile: () => void;
};

const AuthContext = createContext<AuthState>({
  session: null,
  userId: null,
  profile: null,
  isAdmin: false,
  ready: false,
  refreshProfile: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const profileQ = useQuery({
    queryKey: ["me", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      return { profile, isAdmin: !!roles?.some((r) => r.role === "admin") };
    },
  });

  return (
    <AuthContext.Provider
      value={{
        session,
        userId,
        profile: profileQ.data?.profile ?? null,
        isAdmin: profileQ.data?.isAdmin ?? false,
        ready,
        refreshProfile: () => profileQ.refetch(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
