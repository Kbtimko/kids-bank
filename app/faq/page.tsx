export default function FaqPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Help & FAQ</h1>
      <p className="text-gray-500 mb-10">Everything you need to know about using Kids Bank.</p>

      <div className="space-y-6">
        {faqs.map((section) => (
          <div key={section.section}>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              {section.section}
            </h2>
            <div className="space-y-3">
              {section.items.map((item) => (
                <div key={item.q} className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="font-semibold text-gray-800 mb-2">{item.q}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const faqs = [
  {
    section: "Getting Started",
    items: [
      {
        q: "Is this a real bank account?",
        a: "No — Kids Bank is a tracker, not a real bank. The balance lives in the app; the actual money stays in your account. It's a way to make saving tangible and visible for kids before they're ready for a custodial account.",
      },
      {
        q: "How do I add a child?",
        a: "Log in, unlock parent mode using your PIN, then tap Admin → Add Child. Enter a name, pick a color and emoji, and save. The child's account will appear on the home screen immediately.",
      },
      {
        q: "How do I unlock parent mode?",
        a: "Tap the 🔒 icon in the top right corner and enter your PIN. Parent mode stays active for 2 hours, then locks automatically. You can lock it manually by tapping 🔓.",
      },
    ],
  },
  {
    section: "Transactions",
    items: [
      {
        q: "How do I add a deposit or withdrawal?",
        a: "Open a child's account, unlock parent mode, then use the Quick Add form at the bottom of the page. Choose Deposit or Withdrawal, enter the amount and a description, and tap Save.",
      },
      {
        q: "Can I backdate a transaction?",
        a: "Yes. In the Quick Add form, expand the Date field to pick any past date. This is useful if you forgot to log a chore reward or allowance payment.",
      },
      {
        q: "How do I delete a transaction?",
        a: "In the History tab on a child's account, unlock parent mode and tap the × next to any transaction. Deleting a transaction adjusts the balance immediately.",
      },
      {
        q: "What are categories and want vs. need?",
        a: "When adding a withdrawal, you can tag it with a category (e.g. food, fun, clothes) and mark it as a Want or Need. This helps kids learn to distinguish between spending types and see patterns over time.",
      },
    ],
  },
  {
    section: "Allowance & Chores",
    items: [
      {
        q: "How do I set up a recurring allowance?",
        a: "Unlock parent mode, go to Admin → Allowance, and create a recurring transaction with the amount and frequency (weekly, biweekly, or monthly). When allowance is due, open the Allowance tab and tap Apply next to any overdue entries.",
      },
      {
        q: "Does allowance apply automatically?",
        a: "Not yet — you tap Apply manually when it's due. The app shows a green Apply button when a recurring transaction is overdue, so it's easy to see what needs processing.",
      },
      {
        q: "How do chores work?",
        a: "Unlock parent mode and open a child's account → Chores tab → add a chore with an optional reward amount. When your child completes the chore, tap Mark Done. If the chore has a reward, a deposit is automatically added to their balance.",
      },
    ],
  },
  {
    section: "Savings Goals",
    items: [
      {
        q: "How do I set up a savings goal?",
        a: "Open a child's account, unlock parent mode, and go to the Goals tab. Tap Add Goal, enter a name, target amount, and pick an emoji. A progress bar will track how much has been saved toward that goal.",
      },
      {
        q: "How do I link a deposit to a goal?",
        a: "When adding a deposit in Quick Add, select the goal from the Goal dropdown. The deposit will count toward that goal's progress bar.",
      },
      {
        q: "What happens when a goal is reached?",
        a: "The progress bar fills to 100% and shows a 🎉 message. You can mark the goal as complete from the Goals tab, which moves it to a completed list.",
      },
    ],
  },
  {
    section: "Interest",
    items: [
      {
        q: "How does interest work?",
        a: "Interest is calculated based on each child's current balance using an annual rate. The default rate is set to 2× the Fed Funds Rate with a 5% minimum floor — meant to be generous to make saving feel rewarding. You can override the rate manually each month.",
      },
      {
        q: "How do I apply interest?",
        a: "Unlock parent mode, go to Admin → Interest. The default rate and a preview of each child's interest amount are shown automatically. Tap Confirm & Apply Interest to add the interest deposits.",
      },
      {
        q: "Can I change the interest rate?",
        a: "Yes. On the Interest page, tap Use a different rate to enter a custom annual percentage. You can also adjust the multiplier and floor permanently in Admin → Settings.",
      },
      {
        q: "Can interest be applied automatically?",
        a: "Not currently — it requires a manual tap each month. Automatic monthly interest via a scheduled job is on the roadmap.",
      },
    ],
  },
  {
    section: "Spending Requests",
    items: [
      {
        q: "How can my child request to spend money?",
        a: "On their account page, a child can tap Request to Spend, enter an amount and what it's for, and mark it as a Want or Need. The request goes to the parent for approval.",
      },
      {
        q: "How do I approve or deny a request?",
        a: "Unlock parent mode on your child's account page. Pending requests appear at the top of the Overview tab. Tap Approve to automatically create a withdrawal, or Deny and add an optional note explaining why.",
      },
    ],
  },
  {
    section: "Sharing & Privacy",
    items: [
      {
        q: "Can my child check their own balance?",
        a: "Yes. They can open the app and view their account without needing the parent PIN. They just can't add transactions or access admin features.",
      },
      {
        q: "Can I share a read-only view of my child's account?",
        a: "Yes — open a child's account and tap the Share button to generate a shareable link. Anyone with the link can view the balance and transaction history without logging in.",
      },
      {
        q: "Is my family's data shared with other families?",
        a: "No. Each family's data is completely isolated. Other families cannot see your children's accounts or balances.",
      },
    ],
  },
];
