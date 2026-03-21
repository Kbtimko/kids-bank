# 🏦 Kids Bank

A family savings tracker with real compound interest, built with Next.js. Each child gets their own account with a balance, transaction history, and monthly interest tied to the Federal Reserve rate.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Kbtimko/kids-bank&env=PARENT_JWT_SECRET,FRED_API_KEY&envDescription=See%20SETUP.md%20for%20instructions&project-name=kids-bank&repository-name=kids-bank)

## Features

- 👨‍👩‍👧‍👦 Multiple child accounts with emoji + color customization
- 💰 Deposits, withdrawals, and automatic monthly interest
- 📈 Interest tied to the live Fed Funds Rate (via FRED API) with a configurable multiplier and floor
- 🔒 PIN-protected parent mode
- 🔗 Shareable read-only snapshots for blog posts or sharing highlights
- 📊 12-month balance chart

## Quick Start

Click **Deploy with Vercel** above, then follow [SETUP.md](SETUP.md) to:
1. Add a Postgres (Neon) database
2. Set your `PARENT_JWT_SECRET` and `FRED_API_KEY`
3. Run the migration + seed scripts
4. Set your PIN and add your kids

## Interest Rate Formula

```
effective_rate = MAX(floor, fed_rate × multiplier)
monthly_interest = balance × (effective_rate / 100 / 12)
```

Defaults: 2× Fed rate, 5% floor. Both adjustable in Admin → Settings.

## Tech Stack

- [Next.js 14](https://nextjs.org) (App Router)
- [Vercel Postgres / Neon](https://neon.tech)
- [Tailwind CSS](https://tailwindcss.com)
- [Recharts](https://recharts.org)
- [FRED API](https://fred.stlouisfed.org) for live Fed rate
