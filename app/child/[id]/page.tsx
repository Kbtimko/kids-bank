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
    category: string | null;
    is_need: boolean | null;
    notes: string | null;
  }[];
  total: number;
  page: number;
  totalPages: number;
};

type Child = { id: number; name: string; display_color: string; avatar_emoji: string };
type Goal = { id: number; name: string; target_amount: string; current_amount: string; emoji: string; is_completed: boolean };
type Chore = { id: number; name: string; reward_amount: string; completed_at: string | null; notes: string | null };
type Badge = { id: string; label: string; emoji: string; description: string; earnedAt: string };
type Projection = { years: number; amount: number; interest: number };
type WithdrawalRequest = { id: number; amount: string; description: string; want_need: string | null; status: string; parent_note: string | null };
type RecurringTx = { id: number; type: string; amount: string; description: string; frequency: string; next_due_date: string; is_active: boolean };

const CATEGORIES = ["allowance", "chore", "gift", "food", "toys", "clothing", "entertainment", "savings", "other"];

export default function ChildPage() {
  const { id } = useParams<{ id: string }>();
  const { unlocked } = useParentAuth();

  const [child, setChild] = useState<Child | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [txPage, setTxPage] = useState<TxPage | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [streaks, setStreaks] = useState<{ currentStreak: number; longestStreak: number } | null>(null);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [recurringTxs, setRecurringTxs] = useState<RecurringTx[]>([]);
  const [page, setPage] = useState(1);
  const [showEdit, setShowEdit] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [sharing, setSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "goals" | "chores" | "history">("overview");
  const [showInterestExplain, setShowInterestExplain] = useState(false);

  const createShareLink = async () => {
    setSharing(true);
    const res = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ childId: parseInt(id) }) });
    const data = await res.json();
    const url = `${window.location.origin}/share/${data.token}`;
    setShareUrl(url);
    await navigator.clipboard.writeText(url).catch(() => {});
    setSharing(false);
  };

  const load = useCallback(async () => {
    const [childrenRes, summaryRes, txRes, goalsRes, choresRes, badgesRes, streaksRes, projectionsRes, wrRes] = await Promise.all([
      fetch("/api/children").then((r) => r.json()),
      fetch(`/api/children/${id}/summary`).then((r) => r.json()),
      fetch(`/api/children/${id}/transactions?page=${page}&limit=20`).then((r) => r.json()),
      fetch(`/api/children/${id}/goals`).then((r) => r.json()),
      fetch(`/api/children/${id}/chores`).then((r) => r.json()),
      fetch(`/api/children/${id}/badges`).then((r) => r.json()),
      fetch(`/api/children/${id}/streaks`).then((r) => r.json()),
      fetch(`/api/children/${id}/projections`).then((r) => r.json()),
      fetch(`/api/children/${id}/withdrawal-requests`).then((r) => r.json()),
    ]);
    setChild(Array.isArray(childrenRes) ? childrenRes.find((c: Child) => c.id === parseInt(id)) ?? null : null);
    setSummary(summaryRes);
    setTxPage(txRes);
    setGoals(Array.isArray(goalsRes) ? goalsRes : []);
    setChores(Array.isArray(choresRes) ? choresRes : []);
    setBadges(Array.isArray(badgesRes?.badges) ? badgesRes.badges : []);
    setStreaks(streaksRes);
    setProjections(Array.isArray(projectionsRes?.projections) ? projectionsRes.projections : []);
    setWithdrawalRequests(Array.isArray(wrRes) ? wrRes : []);
    if (unlocked) {
      const rrRes = await fetch(`/api/children/${id}/recurring`).then((r) => r.json());
      setRecurringTxs(Array.isArray(rrRes) ? rrRes : []);
    }
  }, [id, page, unlocked]);

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
  const pendingChores = chores.filter((c) => !c.completed_at);
  const pendingRequests = withdrawalRequests.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(145deg, #dbeafe 0%, #f0fdf4 50%, #fefce8 100%)" }}>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-xl leading-none">←</Link>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold text-base shadow-md" style={{ backgroundColor: child.display_color }}>
            <span>{child.avatar_emoji}</span>
            <span>{child.name}</span>
          </div>
        </div>

        {/* Balance card */}
        <div className="relative rounded-3xl p-6 text-white overflow-hidden shadow-lg" style={{ background: "linear-gradient(135deg, #3b5bdb 0%, #7048e8 100%)" }}>
          <span className="absolute right-4 bottom-3 text-8xl opacity-10 select-none font-bold">$</span>
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={createShareLink} disabled={sharing} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm transition">
              {sharing ? "…" : "🔗 Share"}
            </button>
            {unlocked && (
              <button onClick={() => setShowEdit((v) => !v)} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm transition">
                ✏️ Edit
              </button>
            )}
          </div>
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">{child.name}&apos;s Balance</p>
          <p className="text-5xl font-bold tracking-tight mb-4">{usd(summary.balance)}</p>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium">
              <span>✨</span>
              <span>{summary.effectiveRate.toFixed(2)}%/yr · {monthlyRate.toFixed(2)}%/mo</span>
            </div>
            <button onClick={() => setShowInterestExplain(true)} className="bg-white/20 rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center">?</button>
          </div>
        </div>

        {/* Interest explanation modal */}
        {showInterestExplain && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowInterestExplain(false)}>
            <div className="bg-white rounded-3xl p-6 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-gray-800 mb-3">✨ How Interest Works</h2>
              <p className="text-sm text-gray-600 mb-3">Your money earns <strong>{summary.effectiveRate.toFixed(2)}% per year</strong> — that&apos;s <strong>{monthlyRate.toFixed(2)}% every month</strong>.</p>
              <p className="text-sm text-gray-600 mb-3">Each month, a small amount is added to your balance just for keeping money saved. The more you save, the more you earn!</p>
              <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-700 mb-4">
                <p>Current balance: <strong>{usd(summary.balance)}</strong></p>
                <p>Next month interest: <strong>+{usd(summary.nextMonthInterest)}</strong></p>
              </div>
              <button onClick={() => setShowInterestExplain(false)} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold">Got it!</button>
            </div>
          </div>
        )}

        {/* Share link */}
        {shareUrl && (
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 truncate">{shareUrl}</p>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="text-xs text-indigo-600 font-semibold">Copy</button>
              <button onClick={() => setShareUrl("")} className="text-xs text-gray-400">✕</button>
            </div>
          </div>
        )}

        {/* Edit / QuickAdd panel */}
        {unlocked && showEdit && (
          <QuickAdd childId={parseInt(id)} goals={goals} onAdded={() => { load(); setShowEdit(false); }} />
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">🏅 Badges Earned</h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <div key={b.id} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full" title={b.description}>
                  <span className="text-lg">{b.emoji}</span>
                  <span className="text-xs font-semibold text-amber-700">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Streak */}
        {streaks && streaks.currentStreak > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <p className="font-bold text-orange-700">{streaks.currentStreak}-Month Saving Streak!</p>
              <p className="text-xs text-orange-500">Longest ever: {streaks.longestStreak} months</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            { key: "overview", label: "Overview" },
            { key: "goals", label: `Goals${goals.filter(g => !g.is_completed).length > 0 ? ` (${goals.filter(g => !g.is_completed).length})` : ""}` },
            { key: "chores", label: `Chores${pendingChores.length > 0 ? ` (${pendingChores.length})` : ""}` },
            { key: "history", label: "History" },
          ] as const).map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.key ? "bg-indigo-600 text-white" : "bg-white text-gray-500 border border-gray-200"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <>
            {/* Stat grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard emoji="💵" label="TOTAL DEPOSITED" amount={summary.totals.deposits} color="#16a34a" />
              <StatCard emoji="✨" label="INTEREST EARNED" amount={summary.totals.interest} color="#d97706" />
              <StatCard emoji="🛍️" label="TOTAL SPENT" amount={summary.totals.withdrawals} color="#dc2626" />
              <StatCard emoji="📈" label="NEXT MONTH'S INTEREST" amount={summary.nextMonthInterest} color="#1e293b" />
            </div>

            {/* Interest projections */}
            {projections.length > 0 && summary.balance > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">🔭 If You Keep Saving…</h2>
                <div className="space-y-3">
                  {projections.map((p) => (
                    <div key={p.years} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">In {p.years} year{p.years > 1 ? "s" : ""}</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-800">{usd(p.amount)}</span>
                        <span className="text-xs text-green-600 ml-2">+{usd(p.interest)} interest</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">Based on current balance and current interest rate. Assumes no deposits or withdrawals.</p>
              </div>
            )}

            {/* Chart */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span>📈</span> Balance Over Time</h2>
              <MonthlyChart data={summary.chart} color={child.display_color} />
            </div>

            {/* Withdrawal requests (kid view) */}
            {!unlocked && (
              <div className="bg-white rounded-3xl p-5 shadow-sm">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">💸 Spend Requests</h2>
                {pendingRequests.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {pendingRequests.map((r) => (
                      <div key={r.id} className="flex items-center justify-between bg-yellow-50 rounded-xl px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{r.description}</p>
                          <p className="text-xs text-gray-400">{usd(parseFloat(r.amount))} · Pending</p>
                        </div>
                        <span className="text-yellow-500">⏳</span>
                      </div>
                    ))}
                  </div>
                )}
                <WithdrawalRequestForm childId={parseInt(id)} onSubmitted={load} />
              </div>
            )}

            {/* Recurring transactions (parent view) */}
            {unlocked && recurringTxs.length > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">🔄 Recurring</h2>
                <div className="space-y-2">
                  {recurringTxs.map((r) => {
                    const isDue = new Date(r.next_due_date) <= new Date();
                    return (
                      <div key={r.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{r.description}</p>
                          <p className="text-xs text-gray-400">{r.frequency} · {r.type === "deposit" ? "+" : "-"}{usd(parseFloat(r.amount))}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isDue && (
                            <button onClick={async () => { await fetch(`/api/recurring/${r.id}/apply`, { method: "POST" }); load(); }}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-semibold">Apply</button>
                          )}
                          <span className="text-xs text-gray-400">Due {r.next_due_date}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Withdrawal requests (parent approve/deny) */}
            {unlocked && withdrawalRequests.filter((r) => r.status === "pending").length > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">💸 Pending Requests</h2>
                <div className="space-y-3">
                  {withdrawalRequests.filter((r) => r.status === "pending").map((r) => (
                    <div key={r.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex justify-between mb-2">
                        <p className="font-medium text-gray-800">{r.description}</p>
                        <p className="font-bold text-gray-700">{usd(parseFloat(r.amount))}</p>
                      </div>
                      {r.want_need && <p className="text-xs text-gray-400 mb-2">Tagged as: {r.want_need}</p>}
                      <div className="flex gap-2">
                        <button onClick={async () => { await fetch(`/api/withdrawal-requests/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) }); load(); }}
                          className="flex-1 bg-green-100 text-green-700 text-sm font-semibold py-2 rounded-xl">✓ Approve</button>
                        <button onClick={async () => { await fetch(`/api/withdrawal-requests/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "denied" }) }); load(); }}
                          className="flex-1 bg-red-100 text-red-700 text-sm font-semibold py-2 rounded-xl">✗ Deny</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* GOALS TAB */}
        {activeTab === "goals" && (
          <div className="space-y-3">
            {goals.filter((g) => !g.is_completed).map((g) => {
              const current = parseFloat(g.current_amount);
              const target = parseFloat(g.target_amount);
              const pct = Math.min(100, Math.round((current / target) * 100));
              return (
                <div key={g.id} className="bg-white rounded-3xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{g.emoji}</span>
                      <span className="font-semibold text-gray-800">{g.name}</span>
                    </div>
                    {unlocked && (
                      <button onClick={async () => { await fetch(`/api/goals/${g.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_completed: true }) }); load(); }}
                        className="text-xs text-gray-400 hover:text-gray-600">Mark done</button>
                    )}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                    <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: child.display_color }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{usd(current)} saved</span>
                    <span>{pct}% of {usd(target)}</span>
                  </div>
                  {pct >= 100 && <p className="text-center text-green-600 font-semibold text-sm mt-2">🎉 Goal reached!</p>}
                </div>
              );
            })}
            {goals.filter((g) => g.is_completed).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Completed</p>
                {goals.filter((g) => g.is_completed).map((g) => (
                  <div key={g.id} className="bg-white/60 rounded-2xl px-4 py-3 flex items-center gap-2 mb-2 opacity-60">
                    <span>{g.emoji}</span>
                    <span className="text-sm text-gray-600 line-through">{g.name}</span>
                    <span className="ml-auto text-xs text-gray-400">{usd(parseFloat(g.target_amount))}</span>
                  </div>
                ))}
              </div>
            )}
            {unlocked && <AddGoalForm childId={parseInt(id)} onAdded={load} />}
            {!unlocked && goals.length === 0 && (
              <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">🎯</p><p>No goals set yet</p><p className="text-sm">Ask a parent to add a savings goal!</p></div>
            )}
          </div>
        )}

        {/* CHORES TAB */}
        {activeTab === "chores" && (
          <div className="space-y-3">
            {pendingChores.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">To Do</p>
                {pendingChores.map((c) => (
                  <div key={c.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-800">{c.name}</p>
                      {parseFloat(c.reward_amount) > 0 && <p className="text-xs text-green-600">+{usd(parseFloat(c.reward_amount))}</p>}
                      {c.notes && <p className="text-xs text-gray-400">{c.notes}</p>}
                    </div>
                    {unlocked && (
                      <button onClick={async () => { await fetch(`/api/chores/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ complete: true }) }); load(); }}
                        className="bg-green-100 text-green-700 text-sm font-semibold px-3 py-2 rounded-xl">Done ✓</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {chores.filter((c) => c.completed_at).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Completed</p>
                {chores.filter((c) => c.completed_at).slice(0, 5).map((c) => (
                  <div key={c.id} className="bg-white/60 rounded-2xl px-4 py-3 flex items-center justify-between mb-2 opacity-70">
                    <p className="text-sm text-gray-500 line-through">{c.name}</p>
                    <p className="text-xs text-green-600">{parseFloat(c.reward_amount) > 0 ? `+${usd(parseFloat(c.reward_amount))}` : "Done"}</p>
                  </div>
                ))}
              </div>
            )}
            {unlocked && <AddChoreForm childId={parseInt(id)} onAdded={load} />}
            {!unlocked && pendingChores.length === 0 && (
              <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">🧹</p><p>No chores assigned</p></div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && txPage && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Transactions ({txPage.total})</h2>
            <TransactionList transactions={txPage.transactions} onDelete={unlocked ? handleDelete : undefined} />
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
      <p className="text-2xl font-bold font-mono tabular-nums" style={{ color }}>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)}</p>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center leading-tight">{label}</p>
    </div>
  );
}

const GOAL_EMOJIS = ["🎯", "🚲", "🎮", "👟", "📚", "🏕️", "🎸", "⚽", "🏄", "✈️"];

function QuickAdd({ childId, goals, onAdded }: { childId: number; goals: Goal[]; onAdded: () => void }) {
  const [type, setType] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isNeed, setIsNeed] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [goalId, setGoalId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    setSaving(true);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        child_id: childId, type, amount: parseFloat(amount), description,
        category: category || null, is_need: type === "withdrawal" ? isNeed : null,
        notes: notes || null, goal_id: goalId,
      }),
    });
    setAmount(""); setDescription(""); setCategory(""); setIsNeed(null); setNotes(""); setGoalId(null);
    setSaving(false);
    onAdded();
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl p-5 shadow-sm">
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Add Transaction</h2>
      <div className="flex gap-2 mb-3">
        {(["deposit", "withdrawal"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${type === t ? (t === "deposit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700") : "bg-gray-100 text-gray-400"}`}>
            {t === "deposit" ? "💵 Deposit" : "🛍️ Spend"}
          </button>
        ))}
      </div>
      <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} min="0.01" step="0.01" required
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      <select value={category} onChange={(e) => setCategory(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
        <option value="">Category (optional)</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      {type === "withdrawal" && (
        <div className="flex gap-2 mb-2">
          {[{ label: "🎁 Want", val: false }, { label: "✅ Need", val: true }].map(({ label, val }) => (
            <button key={label} type="button" onClick={() => setIsNeed(isNeed === val ? null : val)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${isNeed === val ? "bg-indigo-100 text-indigo-700 font-semibold" : "bg-gray-100 text-gray-400"}`}>
              {label}
            </button>
          ))}
        </div>
      )}
      {type === "deposit" && goals.filter((g) => !g.is_completed).length > 0 && (
        <select value={goalId ?? ""} onChange={(e) => setGoalId(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">Link to goal (optional)</option>
          {goals.filter((g) => !g.is_completed).map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
        </select>
      )}
      <input type="text" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
        {saving ? "Saving…" : "Add"}
      </button>
    </form>
  );
}

function AddGoalForm({ childId, onAdded }: { childId: number; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/children/${childId}/goals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, target_amount: parseFloat(target), emoji }) });
    setName(""); setTarget(""); setEmoji("🎯");
    setSaving(false);
    onAdded();
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl p-5 shadow-sm">
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Add Goal</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        {GOAL_EMOJIS.map((e) => (
          <button key={e} type="button" onClick={() => setEmoji(e)} className={`text-2xl p-2 rounded-xl ${emoji === e ? "bg-indigo-100 ring-2 ring-indigo-400" : "bg-gray-50"}`}>{e}</button>
        ))}
      </div>
      <input type="text" placeholder="What are you saving for?" value={name} onChange={(e) => setName(e.target.value)} required
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      <input type="number" placeholder="Target amount ($)" value={target} onChange={(e) => setTarget(e.target.value)} min="1" step="0.01" required
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
        {saving ? "Adding…" : "Add Goal"}
      </button>
    </form>
  );
}

function AddChoreForm({ childId, onAdded }: { childId: number; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [reward, setReward] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/children/${childId}/chores`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, reward_amount: reward ? parseFloat(reward) : 0, notes: notes || null }) });
    setName(""); setReward(""); setNotes("");
    setSaving(false);
    onAdded();
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl p-5 shadow-sm">
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Add Chore</h2>
      <input type="text" placeholder="Chore name" value={name} onChange={(e) => setName(e.target.value)} required
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      <input type="number" placeholder="Reward amount (optional)" value={reward} onChange={(e) => setReward(e.target.value)} min="0" step="0.01"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      <input type="text" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
        {saving ? "Adding…" : "Add Chore"}
      </button>
    </form>
  );
}

function WithdrawalRequestForm({ childId, onSubmitted }: { childId: number; onSubmitted: () => void }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [wantNeed, setWantNeed] = useState<"want" | "need" | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/children/${childId}/withdrawal-requests`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(amount), description, want_need: wantNeed }),
    });
    setSaving(false);
    if (res.ok) { setMsg("✓ Request sent to parent!"); setAmount(""); setDescription(""); setWantNeed(null); onSubmitted(); }
    else { setMsg("Failed to send"); }
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <form onSubmit={submit}>
      <p className="text-xs text-gray-500 mb-3">Ask a parent to approve a spend:</p>
      <input type="number" placeholder="How much?" value={amount} onChange={(e) => setAmount(e.target.value)} min="0.01" step="0.01" required
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      <input type="text" placeholder="What for?" value={description} onChange={(e) => setDescription(e.target.value)} required
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      <div className="flex gap-2 mb-3">
        {([{ label: "🎁 Want", val: "want" as const }, { label: "✅ Need", val: "need" as const }]).map(({ label, val }) => (
          <button key={val} type="button" onClick={() => setWantNeed(wantNeed === val ? null : val)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${wantNeed === val ? "bg-indigo-100 text-indigo-700 font-semibold" : "bg-gray-100 text-gray-400"}`}>
            {label}
          </button>
        ))}
      </div>
      {msg && <p className={`text-sm mb-2 ${msg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{msg}</p>}
      <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
        {saving ? "Sending…" : "Send Request"}
      </button>
    </form>
  );
}
