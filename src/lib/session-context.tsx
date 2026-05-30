"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getSession, type Session } from "./auth";

type SessionState = {
  session: Session | null;
  loading: boolean;
  refresh: () => void;
};

const SessionContext = createContext<SessionState>({
  session: null,
  loading: true,
  refresh: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    getSession()
      .then(setSession)
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  return (
    <SessionContext.Provider value={{ session, loading, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
