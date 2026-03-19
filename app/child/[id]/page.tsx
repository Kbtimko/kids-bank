"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { MonthlyChart } from "@/components/MonthlyChart";
import { TransactionList } from "@/components/TransactionList";
import { useParentAuth } from "@/components/ParentAuthContext";
import Link from "next/link";

const usd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

type Summary = {
  balance: number;
  mtd: { deposits: number; withdrawals: number; interest: number };
  totals: { deposits: number; withdrawals: number; interest: number };
  effectiveRate: number;
  nextMonthInterest: number;
  chart: { month: string; balance: number }[];
};

type TxPage = {
  transactions: {
    id: number;
    type: "deposit" | "withdrawal" | "interest";
    amount: string;
    description: string;
    transaction_date: string;
  }[];
  total: number;
  page: number;
  totalPages: number;
};

type Child = { id: number; name: string; display_color: string; avatar_emoji: string };

export default function ChildPage() {
  const { id } = useParams<{ id: string }>();
  const { unlocked } = useParentAuth();

  const [child, setChild] = useState<Child | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [txPage, setTxPage] = useState<TxPage | null>(null);
  const [page, setPage] = useState(1);
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(async () => {
    const [childrenRes, summaryRes, txRes] = await Promise.all([
      fetch("/api/children").then((r) => r.json()),
      fetch(`/api/children/${id}/summary`).then((r) => r.json()),
      fetch(`/api/children/${id}/transactions?page=${page}&limit=20`).then((r) => r.json()),
    ]);
    setChild(childrenRes.find((c: Child) => c.id === parseInt(id)) ?? null);
    setSummary(summaryRes);
    setTxPage(txRes);
  }, [id, page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (txId: number) => {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${txId}`, { method: "DELETE" });
    load();
  };

  if (!child || !summary) {
    return <div className="flex items-center justify-center py-24 text-4xl">⏳</div>;
  }

  const monthlyRate = summary.effectiveRate / 12;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(145deg, #dbeafe 0%, #f0fdf4 50%, #fefce8 100%)" }}>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Header pill */}
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-xl leading-none">←</Link>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold text-base shadow-md"
            style={{ backgroundColor: child.display_color }}
          >
            <span>{child.avatar_emoji}</span>
            <span>{child.name}</span>
          </div>
        </div>

        {/* Balance card */}
        <div
          className="relative rounded-3xl p-6 text-white overflow-hidden shadow-lg"
          style={{ background: "linear-gradient(135deg, #3b5bdb 0%, #7048e8 100%)" }}
        >
          {/* Watermark */}
          <span className="absolute right-4 bottom-3 text-8xl opacity-10 select-none font-bold">$</span>

          {/* Edit button */}
          {unlocked && (
            <button
              onClick={() => setShowEdit((v) => !v)}
              className="absolute top-4 right-4 flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm transition"
            >
              ✏️ Edit
            </button>
          )}

          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
            {child.name}&apos;s Balance
          </p>
          <p className="text-5xl font-bold tracking-tight mb-4">{usd(summary.balance)}</p>

          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium">
            <span>✨</span>
            <span>
              {summary.effectiveRate.toFixed(2)}%/yr · {monthlyRate.toFixed(2)}%/mo interest
            </span>
          </div>
        </div>

        {/* Edit / QuickAdd panel */}
        {unlocked && showEdit && (
          <QuickAdd childId={parseInt(id)} onAdded={() => { load(); setShowEdit(false); }} />
        )}

        {/* 2×2 stat grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard emoji="💵" label="TOTAL DEPOSITED" amount={summary.totals.deposits} color="#16a34a" />
          <StatCard emoji="✨" label="INTEREST EARNED" amount={summary.totals.interest} color="#d97706" />
          <StatCard emoji="🛍️" label="TOTAL SPENT" amount={summary.totals.withdrawals} color="#dc2626" />
          <StatCard emoji="📈" label="NEXT MONTH'S INTEREST" amount={summary.nextMonthInterest} color="#1e293b" />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>📈</span> Balance Over Time
          </h2>
          <MonthlyChart data={summary.chart} color={child.display_color} />
        </div>

        {/* Transactions */}
        {txPage && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              Transactions ({txPage.total})
            </h2>
            <TransactionList transactions={txPage.transactions} onDelete={handleDelete} />
            {txPage.totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-sm text-indigo-600 disabled:text-gray-300">← Prev</button>
                <span className="text-sm text-gray-400">{page} / {txPage.totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(txPage.totalPages, p + 1))} disabled={page === txPage.totalPages} className="text-sm text-indigo-600 disabled:text-gray-300">Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ emoji, label, amount, color }: { emoji: string; label: string; amount: number; color: string }) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm flex flex-col items-center gap-2">
      <span className="text-3xl">{emoji}</span>
      <p className="text-2xl font-bold font-mono tabular-nums" style={{ color }}>
        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)}
      </p>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center leading-tight">{label}</p>
    </div>
  );
}

function QuickAdd({ childId, onAdded }: { childId: number; onAdded: () => void }) {
  const [type, setType] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    setSaving(true);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ child_id: childId, type, amount: parseFloat(amount), description }),
    });
    setAmount("");
    setDescription("");
    setSaving(false);
    onAdded();
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl p-5 shadow-sm">
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Add Transaction</h2>
      <div className="flex gap-2 mb-3">
        {(["deposit", "withdrawal"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              type === t
                ? t === "deposit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-400"
            }`}>
            {t === "deposit" ? "Deposit" : "Spent"}
          </button>
        ))}
      </div>
      <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)}
        min="0.01" step="0.01" required
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      <input type="text" placeholder="Description (e.g. Birthday gift)" value={description} onChange={(e) => setDescription(e.target.value)}
        required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      <button type="submit" disabled={saving}
        className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
        {saving ? "Saving…" : "Add"}
      </button>
    </form>
  );
}
