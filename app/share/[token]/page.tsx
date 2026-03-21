"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const usd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

type ShareData = {
  child: { name: string; avatar_emoji: string; display_color: string };
  balance: number;
  totals: { deposits: number; withdrawals: number; interest: number };
  effectiveRate: number;
  nextMonthInterest: number;
};

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/share?token=${token}`)
      .then((r) => r.ok ? r.json() : r.json().then((d) => Promise.reject(d.error)))
      .then(setData)
      .catch((e) => setError(typeof e === "string" ? e : "Invalid or expired link"));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(145deg, #dbeafe 0%, #f0fdf4 50%, #fefce8 100%)" }}>
        <div className="text-center text-gray-500">
          <p className="text-5xl mb-4">🔗</p>
          <p className="font-semibold text-lg">Link not found</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(145deg, #dbeafe 0%, #f0fdf4 50%, #fefce8 100%)" }}>
        <p className="text-4xl">⏳</p>
      </div>
    );
  }

  const { child, balance, totals, effectiveRate, nextMonthInterest } = data;
  const monthlyRate = effectiveRate / 12;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(145deg, #dbeafe 0%, #f0fdf4 50%, #fefce8 100%)" }}>
      <div className="max-w-lg mx-auto px-4 py-10 space-y-4">

        {/* Header */}
        <div className="text-center mb-2">
          <p className="text-sm text-gray-400 uppercase tracking-widest font-semibold">Savings Snapshot</p>
        </div>

        {/* Balance card */}
        <div
          className="relative rounded-3xl p-6 text-white overflow-hidden shadow-lg"
          style={{ background: "linear-gradient(135deg, #3b5bdb 0%, #7048e8 100%)" }}
        >
          <span className="absolute right-4 bottom-3 text-8xl opacity-10 select-none font-bold">$</span>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: child.display_color }}
            >
              {child.avatar_emoji}
            </div>
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">{child.name}&apos;s Balance</p>
              <p className="text-4xl font-bold">{usd(balance)}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium">
            <span>✨</span>
            <span>{effectiveRate.toFixed(2)}%/yr · {monthlyRate.toFixed(2)}%/mo interest</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { emoji: "💵", label: "TOTAL DEPOSITED", amount: totals.deposits, color: "#16a34a" },
            { emoji: "✨", label: "INTEREST EARNED", amount: totals.interest, color: "#d97706" },
            { emoji: "🛍️", label: "TOTAL SPENT", amount: totals.withdrawals, color: "#dc2626" },
            { emoji: "📈", label: "NEXT MONTH'S INTEREST", amount: nextMonthInterest, color: "#1e293b" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-3xl p-5 shadow-sm flex flex-col items-center gap-2">
              <span className="text-3xl">{s.emoji}</span>
              <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: s.color }}>{usd(s.amount)}</p>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pt-2">
          🏦 Powered by Kids Bank · Read-only snapshot
        </p>
      </div>
    </div>
  );
}
