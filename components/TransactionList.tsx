"use client";

import { AmountDisplay } from "./AmountDisplay";
import { useParentAuth } from "./ParentAuthContext";

type Transaction = {
  id: number;
  type: "deposit" | "withdrawal" | "interest";
  amount: string;
  description: string;
  transaction_date: string;
};

type Props = {
  transactions: Transaction[];
  onDelete?: (id: number) => void;
};

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  deposit: { label: "Deposit", cls: "bg-green-100 text-green-700" },
  withdrawal: { label: "Spent", cls: "bg-red-100 text-red-700" },
  interest: { label: "Interest", cls: "bg-blue-100 text-blue-700" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function TransactionList({ transactions, onDelete }: Props) {
  const { unlocked } = useParentAuth();

  if (transactions.length === 0) {
    return <p className="text-center text-gray-400 py-8">No transactions yet</p>;
  }

  return (
    <ul className="divide-y divide-gray-100">
      {transactions.map((tx) => {
        const badge = TYPE_BADGE[tx.type];
        return (
          <li key={tx.id} className="flex items-center gap-3 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
                  {badge.label}
                </span>
                <span className="text-xs text-gray-400">{formatDate(tx.transaction_date)}</span>
              </div>
              <p className="text-sm text-gray-700 truncate">{tx.description}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <AmountDisplay
                amount={parseFloat(tx.amount)}
                type={tx.type}
                className="font-semibold text-sm"
              />
              {unlocked && onDelete && (
                <button
                  onClick={() => onDelete(tx.id)}
                  className="text-gray-300 hover:text-red-400 text-lg leading-none"
                  title="Delete transaction"
                >
                  ×
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
