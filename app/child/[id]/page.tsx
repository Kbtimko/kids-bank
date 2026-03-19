"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AmountDisplay } from "@/components/AmountDisplay";
import { MonthlyChart } from "@/components/MonthlyChart";
import { TransactionList } from "@/components/TransactionList";
import { useParentAuth } from "@/components/ParentAuthContext";
import Link from "next/link";

type Summary = {
  balance: number;
  mtd: { deposits: number; withdrawals: number; interest: number };
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

type Child = {
  id: number;
  name: string;
  display_color: string;
  avatar_emoji: string;
};

export default function ChildPage() {
  const { id } = useParams<{ id: string }>();
  const { unlocked } = useParentAuth();

  const [child, setChild] = useState<Child | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [txPage, setTxPage] = useState<TxPage | null>(null);
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (txId: number) => {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${txId}`, { method: "DELETE" });
    load();
  };

  if (!child || !summary || !txPage) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-300 text-4xl">⏳</div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-2xl">
          ←
        </Link>
        <span className="text-3xl">{child.avatar_emoji}</span>
        <h1 className="text-2xl font-bold text-gray-800">{child.name}</h1>
      </div>

      {/* Balance hero */}
      <div
        className="rounded-3xl p-6 text-white mb-6"
        style={{ backgroundColor: child.display_color }}
      >
        <p className="text-white/70 text-sm">Total Balance</p>
        <p className="text-5xl font-bold mt-1">
          <AmountDisplay amount={summary.balance} />
        </p>
        <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-white/20 text-sm">
          <div>
            <p className="text-white/60 text-xs">Deposits</p>
            <p className="font-semibold">
              +{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                summary.mtd.deposits
              )}
            </p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Spent</p>
            <p className="font-semibold">
              -{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                summary.mtd.withdrawals
              )}
            </p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Interest</p>
            <p className="font-semibold">
              +{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                summary.mtd.interest
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">12-Month Balance</h2>
        <MonthlyChart data={summary.chart} color={child.display_color} />
      </div>

      {/* Parent quick-add (only when unlocked) */}
      {unlocked && <QuickAdd childId={parseInt(id)} onAdded={load} />}

      {/* Transactions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">
          Transactions ({txPage.total})
        </h2>
        <TransactionList transactions={txPage.transactions} onDelete={handleDelete} />

        {txPage.totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-sm text-indigo-600 disabled:text-gray-300"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-400">
              {page} / {txPage.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(txPage.totalPages, p + 1))}
              disabled={page === txPage.totalPages}
              className="text-sm text-indigo-600 disabled:text-gray-300"
            >
              Next →
            </button>
          </div>
        )}
      </div>
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
    <form
      onSubmit={submit}
      className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-gray-500 mb-3">Add Transaction</h2>
      <div className="flex gap-2 mb-3">
        {(["deposit", "withdrawal"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              type === t
                ? t === "deposit"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {t === "deposit" ? "Deposit" : "Spent"}
          </button>
        ))}
      </div>
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        min="0.01"
        step="0.01"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        required
      />
      <input
        type="text"
        placeholder="Description (e.g. Birthday gift)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        required
      />
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
      >
        {saving ? "Saving…" : "Add"}
      </button>
    </form>
  );
}
