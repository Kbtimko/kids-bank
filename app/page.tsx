"use client";

import { useEffect, useState } from "react";
import { ChildCard } from "@/components/ChildCard";

type Child = {
  id: number;
  name: string;
  display_color: string;
  avatar_emoji: string;
  balance: number;
  mtd: { interest: number; deposits: number; withdrawals: number };
};

export default function HomePage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/children", { cache: "no-store" });
        if (!res.ok) { setLoading(false); return; }
        const list = await res.json();
        if (!Array.isArray(list) || list.length === 0) { setLoading(false); return; }

        const summaries = await Promise.all(
          list.map((c: { id: number }) =>
            fetch(`/api/children/${c.id}/summary`, { cache: "no-store" })
              .then((r) => r.ok ? r.json() : { balance: 0, mtd: { interest: 0, deposits: 0, withdrawals: 0 } })
              .catch(() => ({ balance: 0, mtd: { interest: 0, deposits: 0, withdrawals: 0 } }))
          )
        );

        setChildren(list.map((c: Child, i: number) => ({ ...c, ...summaries[i] })));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-4xl">⏳</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Savings</h1>
      <p className="text-gray-400 text-sm mb-6">Tap a card to see details</p>

      {children.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏦</p>
          <p className="font-medium">No accounts yet.</p>
          <p className="text-sm mt-1">Ask a parent to set up your account!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {children.map((child) => (
            <ChildCard
              key={child.id}
              id={child.id}
              name={child.name}
              emoji={child.avatar_emoji}
              color={child.display_color}
              balance={child.balance}
              mtdInterest={child.mtd?.interest ?? 0}
              mtdDeposits={child.mtd?.deposits ?? 0}
              mtdWithdrawals={child.mtd?.withdrawals ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
