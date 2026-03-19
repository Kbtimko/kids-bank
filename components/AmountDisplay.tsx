"use client";

type Props = {
  amount: number;
  className?: string;
  showSign?: boolean;
  type?: "deposit" | "withdrawal" | "interest";
};

export function AmountDisplay({ amount, className = "", showSign, type }: Props) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));

  const sign = type === "withdrawal" ? "-" : showSign ? "+" : "";
  const color =
    type === "withdrawal"
      ? "text-red-500"
      : type === "interest"
      ? "text-blue-500"
      : type === "deposit"
      ? "text-green-600"
      : "";

  return (
    <span className={`${color} ${className}`}>
      {sign}
      {formatted}
    </span>
  );
}
