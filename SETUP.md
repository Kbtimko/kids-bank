# Kids Bank — Setup Guide

A family savings tracker with compound interest, built with Next.js and deployed to Vercel.

---

## What You Need to Create (free accounts)

1. **GitHub** — github.com (to store the code and auto-deploy)
2. **Vercel** — vercel.com (to host the app, connect with GitHub)
3. **FRED API key** — fredaccount.stlouisfed.org/apikeys (for live Fed rate; takes ~1 min)

---

## Step 1 — Push to GitHub

Open Terminal (`Cmd+Space` → type "Terminal"):

```bash
cd ~/projects/kids-bank
git add .
git commit -m "Initial commit"
```

Then go to **github.com → New repository** → name it `kids-bank` → Create.
Copy the two commands it shows under "push an existing repository" and run them in Terminal.

---

## Step 2 — Deploy to Vercel

1. Go to **vercel.com** → Sign up with GitHub
2. Click **"Add New Project"** → Import your `kids-bank` repo
3. Leave all settings as default → Click **Deploy**

Your app is now live! Vercel gives you a URL like `kids-bank-abc123.vercel.app`.

---

## Step 3 — Add a Database

In the Vercel dashboard:

1. Click your project → **Storage** tab
2. Click **"Create Database"** → choose **Postgres (Neon)** → Free tier → Create
3. Click **"Connect"** to link it to your project

Vercel automatically adds the database connection variables to your project.

---

## Step 4 — Add Your Secret Keys

In Vercel dashboard → **Settings** → **Environment Variables**, add:

### `PARENT_JWT_SECRET`
A random secret for signing parent login sessions. Generate one by running in Terminal:
```bash
openssl rand -base64 32
```
Copy the output and paste it as the value.

### `FRED_API_KEY`
1. Go to **fredaccount.stlouisfed.org** → Create a free account
2. Go to **API Keys** → Request an API key
3. Paste the key as the value

After adding both, go to **Deployments** → click the **⋯** menu on the latest deploy → **Redeploy** (so it picks up the new env vars).

---

## Step 5 — Run Database Setup

Pull the env vars to your local machine:
```bash
cd ~/projects/kids-bank
npx vercel env pull .env.local
```

If that fails, install the Vercel CLI first:
```bash
npm install -g vercel
vercel login
```

Now create the database tables:
```bash
npx tsx scripts/migrate.ts
```

Now seed with initial data:
```bash
npx tsx scripts/seed.ts
```

This creates:
- Default parent PIN: **`1234`** — change it immediately in the admin panel!
- Two placeholder children named "Child 1" and "Child 2" — rename them in admin

---

## Step 6 — Customize Your Kids' Accounts

1. Open your Vercel URL on your phone
2. Tap the 🔒 lock icon → enter PIN `1234`
3. Tap **Admin** → **Change PIN** → set a new PIN
4. Tap **Add Child** → add your kids with their names, emojis, and colors
5. Delete the placeholder "Child 1" and "Child 2" accounts (or just rename them)

---

## Day-to-Day Usage

### For kids (read-only)
- Open the app URL on any phone/iPad
- Tap a card to see balance, history, and the 12-month chart

### For parents
- Tap 🔒 → enter PIN to unlock Parent Mode
- Tap a child's card → use the **Add Transaction** form to record deposits or spending
- Or go to **Admin → Interest** to apply monthly interest

### Applying monthly interest
1. Tap 🔒 → Admin → Interest
2. The Fed rate is fetched automatically from the Federal Reserve
3. Review the computed rate (2× Fed rate, with a 5% minimum floor)
4. Optionally override the rate if you want a different value
5. Tap **Preview Interest** → review each child's interest amount
6. Tap **Confirm & Apply** to post the interest transactions

---

## Local Development

To run on your Mac:
```bash
cd ~/projects/kids-bank
npm run dev
```

Open http://localhost:3000 in your browser.

Every `git push` to the `main` branch automatically redeploys to Vercel.

---

## Interest Rate Formula

```
effective_rate = MAX(floor, fed_rate × multiplier)
monthly_interest = balance × (effective_rate / 100 / 12)
```

Defaults: multiplier = 2×, floor = 5%

Example with Fed rate at 4.33%:
- 2 × 4.33% = 8.66% (above the 5% floor)
- Monthly: $1,000 × (8.66% / 12) = **$7.22/month**

You can adjust the multiplier and floor in Admin → Settings.
