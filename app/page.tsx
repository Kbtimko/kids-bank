import { ChildCard } from "@/components/ChildCard";

async function getChildrenWithSummaries() {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/children`, { cache: "no-store" });
    if (!res.ok) return [];
    const children = await res.json();
    if (!Array.isArray(children) || children.length === 0) return [];

    const summaries = await Promise.all(
      children.map((c: { id: number }) =>
        fetch(`${baseUrl}/api/children/${c.id}/summary`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : { balance: 0, mtd: { interest: 0, deposits: 0, withdrawals: 0 } }))
          .catch(() => ({ balance: 0, mtd: { interest: 0, deposits: 0, withdrawals: 0 } }))
      )
    );

    return children.map(
      (
        c: { id: number; name: string; display_color: string; avatar_emoji: string },
        i: number
      ) => ({
        ...c,
        ...summaries[i],
      })
    );
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const children = await getChildrenWithSummaries();

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
          {children.map(
            (child: {
              id: number;
              name: string;
              avatar_emoji: string;
              display_color: string;
              balance: number;
              mtd: { interest: number; deposits: number; withdrawals: number };
            }) => (
              <ChildCard
                key={child.id}
                id={child.id}
                name={child.name}
                emoji={child.avatar_emoji}
                color={child.display_color}
                balance={child.balance}
                mtdInterest={child.mtd.interest}
                mtdDeposits={child.mtd.deposits}
                mtdWithdrawals={child.mtd.withdrawals}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
