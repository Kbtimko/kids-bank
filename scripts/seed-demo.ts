import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

const DEMO_EMAIL = "demo@kidsbank.app";
const DEMO_PIN = "1234";
const DEMO_FAMILY_NAME = "Demo Family";
const CHILD_NAME = "Todd";
const ANNUAL_RATE = 0.02;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmt(date: Date): string {
  return date.toISOString().split("T")[0];
}

async function seed() {
  console.log("Seeding demo account...");

  await pool.query(`DELETE FROM families WHERE email = $1`, [DEMO_EMAIL]);
  console.log("✓ Cleared existing demo account");

  const pinHash = await bcrypt.hash(DEMO_PIN, 12);
  const familyRes = await pool.query(
    `INSERT INTO families (email, name, pin_hash) VALUES ($1, $2, $3) RETURNING id`,
    [DEMO_EMAIL, DEMO_FAMILY_NAME, pinHash]
  );
  const familyId = familyRes.rows[0].id as number;

  const childRes = await pool.query(
    `INSERT INTO children (family_id, name, display_color, avatar_emoji) VALUES ($1, $2, $3, $4) RETURNING id`,
    [familyId, CHILD_NAME, "#4F46E5", "🚛"]
  );
  const childId = childRes.rows[0].id as number;
  console.log(`✓ Created family + child ${CHILD_NAME}`);

  // Goals
  const legoRes = await pool.query(
    `INSERT INTO goals (child_id, name, target_amount, emoji, is_completed) VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
    [childId, "Lego Police Station", 80.0, "🚓"]
  );
  const legoGoalId = legoRes.rows[0].id as number;

  const switchRes = await pool.query(
    `INSERT INTO goals (child_id, name, target_amount, emoji, is_completed) VALUES ($1, $2, $3, $4, FALSE) RETURNING id`,
    [childId, "Nintendo Switch", 340.0, "🎮"]
  );
  const switchGoalId = switchRes.rows[0].id as number;
  console.log("✓ Created goals");

  // Recurring allowance
  const today = new Date("2026-03-26");
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + (7 - today.getDay()));
  await pool.query(
    `INSERT INTO recurring_transactions (child_id, type, amount, description, frequency, next_due_date, category, is_active)
     VALUES ($1, 'deposit', 5.00, 'Weekly allowance', 'weekly', $2, 'allowance', true)`,
    [childId, fmt(nextSunday)]
  );

  // --- Transactions ---
  type Tx = {
    date: Date;
    type: "deposit" | "withdrawal" | "interest";
    amount: number;
    description: string;
    category: string | null;
    isNeed: boolean | null;
    notes: string | null;
    goalId: number | null;
  };

  const txns: Tx[] = [];
  let balance = 0;
  let legoSaved = 0;
  let legoBought = false;
  let switchSaved = 0;

  // Target: Switch ~65% funded ($221/$340) at end, balance ~$150
  const SWITCH_CAP = 221;

  const chores = [
    { name: "Vacuumed living room", reward: 2 },
    { name: "Helped with groceries", reward: 3 },
    { name: "Cleaned up toys", reward: 2 },
    { name: "Fed the dog", reward: 2 },
    { name: "Washed windows", reward: 5 },
    { name: "Set the table all week", reward: 3 },
    { name: "Helped wash the car", reward: 5 },
    { name: "Took out recycling", reward: 2 },
    { name: "Sorted laundry", reward: 3 },
    { name: "Swept the porch", reward: 2 },
  ];

  const smallPurchases = [
    { desc: "Candy at Target", amount: 1.5, isNeed: false },
    { desc: "Sticker pack", amount: 3.0, isNeed: false },
    { desc: "Small toy car", amount: 4.0, isNeed: false },
    { desc: "Slushie", amount: 2.0, isNeed: false },
    { desc: "Bouncy ball", amount: 1.0, isNeed: false },
    { desc: "Comic book", amount: 5.0, isNeed: false },
    { desc: "Trading cards", amount: 4.0, isNeed: false },
    { desc: "Gummy worms", amount: 1.5, isNeed: false },
  ];

  const bigPurchases = [
    { desc: "Small Lego set", amount: 14.99, isNeed: false },
    { desc: "Toy dinosaur", amount: 12.0, isNeed: false },
    { desc: "Nerf darts refill", amount: 8.0, isNeed: false },
    { desc: "Finger paints kit", amount: 10.0, isNeed: false },
    { desc: "Water balloon kit", amount: 7.5, isNeed: false },
  ];

  const startDate = new Date("2024-03-26");

  for (let week = 0; week < 104; week++) {
    const weekDate = addDays(startDate, week * 7);
    if (weekDate > today) break;

    // Determine goal for deposit
    const depositGoalId = !legoBought
      ? legoGoalId
      : switchSaved < SWITCH_CAP
      ? switchGoalId
      : null;

    // Weekly allowance
    const allowance = 5.0;
    balance += allowance;
    if (!legoBought) legoSaved += allowance;
    else if (switchSaved < SWITCH_CAP) switchSaved += allowance;
    txns.push({
      date: weekDate,
      type: "deposit",
      amount: allowance,
      description: "Weekly allowance",
      category: "allowance",
      isNeed: null,
      notes: null,
      goalId: depositGoalId,
    });

    // Chore bonus every 2-3 weeks
    if (week % 3 === 1) {
      const chore = chores[week % chores.length];
      balance += chore.reward;
      if (!legoBought) legoSaved += chore.reward;
      else if (switchSaved < SWITCH_CAP) switchSaved += chore.reward;
      txns.push({
        date: addDays(weekDate, 2),
        type: "deposit",
        amount: chore.reward,
        description: chore.name,
        category: "chores",
        isNeed: null,
        notes: null,
        goalId: depositGoalId,
      });
    }

    // Small purchase every 3 weeks (even during Lego phase, small amounts)
    if (week % 3 === 2 && balance > 8) {
      const purchase = smallPurchases[week % smallPurchases.length];
      // During Lego phase, only buy if it won't delay goal much
      if (!legoBought || true) {
        balance -= purchase.amount;
        txns.push({
          date: addDays(weekDate, 3),
          type: "withdrawal",
          amount: purchase.amount,
          description: purchase.desc,
          category: "spending",
          isNeed: purchase.isNeed,
          notes: null,
          goalId: null,
        });
      }
    }

    // Bigger purchase every 8 weeks after Lego is bought
    if (legoBought && week % 8 === 6 && balance > 20) {
      const purchase = bigPurchases[Math.floor(week / 8) % bigPurchases.length];
      balance -= purchase.amount;
      txns.push({
        date: addDays(weekDate, 4),
        type: "withdrawal",
        amount: purchase.amount,
        description: purchase.desc,
        category: "spending",
        isNeed: purchase.isNeed,
        notes: null,
        goalId: null,
      });
    }

    // Monthly interest on last week of month
    const nextWeek = addDays(weekDate, 7);
    if (weekDate.getMonth() !== nextWeek.getMonth() && balance > 0) {
      const interest = parseFloat((balance * (ANNUAL_RATE / 12)).toFixed(2));
      if (interest > 0) {
        balance += interest;
        txns.push({
          date: addDays(weekDate, 6),
          type: "interest",
          amount: interest,
          description: "Monthly interest",
          category: null,
          isNeed: null,
          notes: `${(ANNUAL_RATE * 100).toFixed(1)}% annual rate`,
          goalId: null,
        });
      }
    }

    // Buy the Lego Police Station when $80 is saved
    if (!legoBought && legoSaved >= 80 && balance >= 80) {
      balance -= 80;
      txns.push({
        date: addDays(weekDate, 5),
        type: "withdrawal",
        amount: 80.0,
        description: "Lego Police Station 🚓",
        category: "spending",
        isNeed: false,
        notes: "Saved up for it — took 3 months!",
        goalId: legoGoalId,
      });
      legoBought = true;
      console.log(`  → Lego purchased on ${fmt(addDays(weekDate, 5))} (balance: $${balance.toFixed(2)})`);
    }
  }

  console.log(`✓ Generated ${txns.length} transactions`);
  console.log(`  Balance: $${balance.toFixed(2)}`);
  console.log(`  Switch saved: $${switchSaved.toFixed(2)} / $340 (${Math.round((switchSaved / 340) * 100)}%)`);

  // Insert sorted by date
  txns.sort((a, b) => a.date.getTime() - b.date.getTime());
  for (const tx of txns) {
    await pool.query(
      `INSERT INTO transactions (child_id, type, amount, description, transaction_date, category, is_need, notes, goal_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [childId, tx.type, tx.amount, tx.description, fmt(tx.date), tx.category, tx.isNeed, tx.notes, tx.goalId]
    );
  }
  console.log("✓ Inserted all transactions");

  console.log(`\nDemo account ready:`);
  console.log(`  URL:   /login`);
  console.log(`  Email: ${DEMO_EMAIL}`);
  console.log(`  PIN:   ${DEMO_PIN}`);

  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
