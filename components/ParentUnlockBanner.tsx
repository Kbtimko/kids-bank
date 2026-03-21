"use client";

import { useState } from "react";
import Link from "next/link";
import { useParentAuth } from "./ParentAuthContext";
import { PinModal } from "./PinModal";

export function ParentUnlockBanner() {
  const { unlocked, familyName, lock, logout } = useParentAuth();
  const [showPin, setShowPin] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur border-b border-gray-100">
        <Link href="/" className="text-xl font-bold text-indigo-600 tracking-tight">
          🏦 Kids Bank
        </Link>
        <div className="flex items-center gap-3">
          {familyName && (
            <span className="text-xs text-gray-400 hidden sm:block">{familyName}</span>
          )}
          {unlocked ? (
            <>
              <Link
                href="/parent"
                className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full"
              >
                Admin
              </Link>
              <button
                onClick={lock}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                title="Lock parent mode"
              >
                <span className="text-lg">🔓</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowPin(true)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              title="Parent login"
            >
              <span className="text-lg">🔒</span>
            </button>
          )}
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-gray-600"
            title="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>

      {showPin && <PinModal onClose={() => setShowPin(false)} />}
    </>
  );
}
