"use client";

import { useState, useEffect } from "react";
import { useParentAuth } from "./ParentAuthContext";

type Props = {
  onClose: () => void;
};

export function PinModal({ onClose }: Props) {
  const { refresh } = useParentAuth();
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (pin: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok) {
        await refresh();
        onClose();
      } else {
        setError(data.error ?? "Incorrect PIN");
        setDigits([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const pressDigit = (d: string) => {
    if (loading) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      submit(next.join(""));
    }
  };

  const backspace = () => {
    if (loading) return;
    setDigits((prev) => prev.slice(0, -1));
    setError("");
  };

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") pressDigit(e.key);
      if (e.key === "Backspace") backspace();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 w-80 shadow-2xl">
        <h2 className="text-center text-xl font-bold mb-1 text-gray-800">Parent Mode</h2>
        <p className="text-center text-sm text-gray-500 mb-6">Enter your PIN</p>

        {/* Dots */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                digits[i] !== undefined
                  ? "bg-indigo-600 border-indigo-600"
                  : "border-gray-300"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-red-500 text-sm mb-4 font-medium">{error}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {DIGITS.map((d, i) => {
            if (d === "") return <div key={i} />;
            if (d === "⌫") {
              return (
                <button
                  key={i}
                  onClick={backspace}
                  className="h-16 rounded-2xl text-2xl font-bold text-gray-500 bg-gray-100 active:bg-gray-200 flex items-center justify-center"
                >
                  {d}
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => pressDigit(d)}
                disabled={loading}
                className="h-16 rounded-2xl text-2xl font-bold text-gray-800 bg-gray-100 active:bg-indigo-100 active:text-indigo-700 flex items-center justify-center transition-colors"
              >
                {d}
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-gray-400 py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
