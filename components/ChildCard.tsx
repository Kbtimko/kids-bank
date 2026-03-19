"use client";

import Link from "next/link";
import { AmountDisplay } from "./AmountDisplay";

type Props = {
  id: number;
  name: string;
  emoji: string;
  color: string;
  balance: number;
  mtdInterest: number;
  mtdDeposits: number;
  mtdWithdrawals: number;
};

export function ChildCard({
  id,
  name,
  emoji,
  color,
  balance,
  mtdInterest,
  mtdDeposits,
  mtdWithdrawals,
}: Props) {
  const netChange = mtdDeposits + mtdInterest - mtdWithdrawals;

  return (
    <Link href={`/child/${id}`}>
      <div
        className="rounded-3xl p-6 text-white shadow-lg active:scale-95 transition-transform cursor-pointer"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm font-medium">Savings</p>
            <p className="text-2xl font-bold">{name}</p>
          </div>
          <span className="text-5xl">{emoji}</span>
        </div>

        <div className="mt-2">
          <p className="text-white/70 text-xs uppercase tracking-wider mb-1">Balance</p>
          <p className="text-4xl font-bold">
            <AmountDisplay amount={balance} />
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-sm">
          <div>
            <p className="text-white/60 text-xs">This month</p>
            <p className={`font-semibold ${netChange >= 0 ? "text-white" : "text-red-200"}`}>
              {netChange >= 0 ? "+" : ""}
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                netChange
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs">Interest earned</p>
            <p className="font-semibold text-white">
              +{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                mtdInterest
              )}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
