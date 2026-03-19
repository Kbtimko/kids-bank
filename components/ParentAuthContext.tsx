"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type AuthContextType = {
  unlocked: boolean;
  refresh: () => Promise<void>;
  lock: () => Promise<void>;
};

const ParentAuthContext = createContext<AuthContextType>({
  unlocked: false,
  refresh: async () => {},
  lock: async () => {},
});

export function ParentAuthProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/status");
    const data = await res.json();
    setUnlocked(data.unlocked);
  }, []);

  const lock = useCallback(async () => {
    await fetch("/api/auth/lock", { method: "POST" });
    setUnlocked(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ParentAuthContext.Provider value={{ unlocked, refresh, lock }}>
      {children}
    </ParentAuthContext.Provider>
  );
}

export function useParentAuth() {
  return useContext(ParentAuthContext);
}
