// In-memory store for local preview (no DB). Resets on server restart.
import type { Child, Transaction } from "./db";

let nextChildId = 1;
let nextTxId = 1;

export const mockChildren: Child[] = [];
export const mockTransactions: Transaction[] = [];
export let mockPinHash: string | null = null;
export let mockSettings = { interest_multiplier: "2", interest_floor_percent: "5" };

export function addChild(name: string, display_color: string, avatar_emoji: string): Child {
  const child: Child = {
    id: nextChildId++,
    name,
    display_color,
    avatar_emoji,
    created_at: new Date().toISOString(),
  };
  mockChildren.push(child);
  return child;
}

export function addTransaction(
  child_id: number,
  type: Transaction["type"],
  amount: string,
  description: string,
  transaction_date: string
): Transaction {
  const tx: Transaction = {
    id: nextTxId++,
    child_id,
    type,
    amount,
    description,
    transaction_date,
    created_at: new Date().toISOString(),
  };
  mockTransactions.push(tx);
  return tx;
}

export function getBalance(child_id: number): number {
  return mockTransactions
    .filter((t) => t.child_id === child_id)
    .reduce((sum, t) => {
      const amt = parseFloat(t.amount);
      return t.type === "withdrawal" ? sum - amt : sum + amt;
    }, 0);
}

export function getBalanceAsOf(child_id: number, date: string): number {
  return mockTransactions
    .filter((t) => t.child_id === child_id && t.transaction_date <= date)
    .reduce((sum, t) => {
      const amt = parseFloat(t.amount);
      return t.type === "withdrawal" ? sum - amt : sum + amt;
    }, 0);
}

export function setMockPinHash(hash: string) {
  mockPinHash = hash;
}

export function setMockSettings(s: typeof mockSettings) {
  mockSettings = { ...mockSettings, ...s };
}
