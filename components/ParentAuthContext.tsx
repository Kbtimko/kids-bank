"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type AuthContextType = {
  unlocked: boolean;
  familyName: string | null;
  refresh: () => Promise<void>;
  lock: () => Promise<void>;
  logout: () => Promise<void>;
};

const ParentAuthContext = createContext<AuthContextType>({
  unlocked: false,
  familyName: null,
  refresh: async () => {},
  lock: async () => {},
  logout: async () => {},
});

export function ParentAuthProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/status");
    const data = await res.json();
    setUnlocked(data.unlocked);
    setFamilyName(data.familyName ?? null);
  }, []);

  const lock = useCallback(async () => {
    await fetch("/api/auth/lock", { method: "POST" });
    setUnlocked(false);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/families/logout", { method: "POST" });
    setUnlocked(false);
    setFamilyName(null);
    router.push("/login");
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ParentAuthContext.Provider value={{ unlocked, familyName, refresh, lock, logout }}>
      {children}
    </ParentAuthContext.Provider>
  );
}

export function useParentAuth() {
  return useContext(ParentAuthContext);
}
