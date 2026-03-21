"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== confirm) { setError("PINs don't match"); return; }
    if (pin.length < 4) { setError("PIN must be at least 4 digits"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/families/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, familyName, pin }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error ?? "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-indigo-600 mb-2">🏦 Kids Bank</h1>
        <p className="text-center text-gray-500 text-sm mb-8">Set up your family account</p>

        <form onSubmit={submit} className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Create Account</h2>

          <label className="text-xs text-gray-500 block mb-1">Family Name</label>
          <input
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            required
            placeholder="The Smith Family"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />

          <label className="text-xs text-gray-500 block mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />

          <label className="text-xs text-gray-500 block mb-1">PIN (4–8 digits)</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            required
            placeholder="••••"
            maxLength={8}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />

          <label className="text-xs text-gray-500 block mb-1">Confirm PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
            required
            placeholder="••••"
            maxLength={8}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 mb-3"
          >
            {loading ? "Creating…" : "Create Account"}
          </button>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
