"use client";

import { useEffect, useState, useCallback } from "react";
import { useParentAuth } from "@/components/ParentAuthContext";
import { PinModal } from "@/components/PinModal";

type Child = { id: number; name: string; avatar_emoji: string; display_color: string };

type InterestPreview = {
  preview: { childId: number; name: string; balance: number; interest: number }[];
  effectiveRate: number;
  fedRate: number;
  multiplier: number;
  floor: number;
  month: string;
};

export default function ParentPage() {
  const { unlocked } = useParentAuth();
  const [showPin, setShowPin] = useState(false);

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-5xl">🔒</p>
        <p className="text-gray-600 font-medium">Parent login required</p>
        <button
          onClick={() => setShowPin(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-semibold"
        >
          Enter PIN
        </button>
        {showPin && <PinModal onClose={() => setShowPin(false)} />}
      </div>
    );
  }

  return <AdminPanel />;
}

function AdminPanel() {
  const [children, setChildren] = useState<Child[]>([]);
  const [settings, setSettings] = useState({ interest_multiplier: "2", interest_floor_percent: "5" });
  const [fedRate, setFedRate] = useState<{ rate: number; cachedDate: string; source: string } | null>(null);
  const [interestPreview, setInterestPreview] = useState<InterestPreview | null>(null);
  const [overrideRate, setOverrideRate] = useState("");
  const [applyMsg, setApplyMsg] = useState("");
  const [activeSection, setActiveSection] = useState<"interest" | "add-child" | "settings" | "pin">("interest");

  const load = useCallback(async () => {
    const [ch, st, fr] = await Promise.all([
      fetch("/api/children").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/fed-rate").then((r) => r.json()),
    ]);
    setChildren(ch);
    setSettings(st);
    setFedRate(fr);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fetchInterestPreview = async (customRate?: string) => {
    const res = await fetch("/api/interest/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        customRate ? { override_rate: parseFloat(customRate) } : {}
      ),
    });
    const data = await res.json();
    if (res.status === 409) {
      setApplyMsg(data.error);
      setInterestPreview(null);
    } else {
      setInterestPreview(data);
      setApplyMsg("");
    }
  };

  const applyInterest = async () => {
    if (!interestPreview) return;
    const res = await fetch("/api/interest/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirm: true,
        ...(overrideRate ? { override_rate: parseFloat(overrideRate) } : {}),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setApplyMsg(`✓ Interest applied for ${data.month}`);
      setInterestPreview(null);
      setOverrideRate("");
    } else {
      setApplyMsg(data.error);
    }
  };

  const refreshFedRate = async () => {
    // Force a fresh fetch by temporarily clearing cache
    const fr = await fetch("/api/fed-rate").then((r) => r.json());
    setFedRate(fr);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Parent Admin</h1>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
        {(
          [
            { key: "interest", label: "Interest" },
            { key: "add-child", label: "Add Child" },
            { key: "settings", label: "Settings" },
            { key: "pin", label: "Change PIN" },
          ] as const
        ).map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeSection === s.key
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-500 border border-gray-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Interest section */}
      {activeSection === "interest" && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Apply Monthly Interest</h2>

          {/* Fed rate info */}
          {fedRate && (
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-xs">Fed Funds Rate (FRED)</p>
                  <p className="font-bold text-gray-800 text-lg">{fedRate.rate.toFixed(2)}%</p>
                  <p className="text-gray-400 text-xs">
                    {fedRate.source === "FRED" ? "Live" : `Cached`} · {fedRate.cachedDate}
                  </p>
                </div>
                <button
                  onClick={refreshFedRate}
                  className="text-xs text-indigo-500 border border-indigo-200 px-3 py-1.5 rounded-lg"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}

          {/* Rate formula */}
          <div className="bg-indigo-50 rounded-xl p-3 mb-4 text-sm text-indigo-700">
            <p>
              Computed rate: max({fedRate?.rate.toFixed(2)}% × {settings.interest_multiplier},{" "}
              {settings.interest_floor_percent}% floor) ={" "}
              <strong>
                {Math.max(
                  (fedRate?.rate ?? 4.33) * parseFloat(settings.interest_multiplier),
                  parseFloat(settings.interest_floor_percent)
                ).toFixed(2)}
                % annual
              </strong>
            </p>
          </div>

          {/* Override rate */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-1">
              Override rate (optional — leave blank to use computed)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="e.g. 8.5"
                value={overrideRate}
                onChange={(e) => setOverrideRate(e.target.value)}
                step="0.01"
                min="0"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <span className="text-sm text-gray-500 self-center">%</span>
            </div>
          </div>

          <button
            onClick={() => fetchInterestPreview(overrideRate)}
            className="w-full bg-indigo-50 text-indigo-700 py-2.5 rounded-xl text-sm font-semibold mb-3"
          >
            Preview Interest
          </button>

          {applyMsg && (
            <p className={`text-sm text-center mb-3 ${applyMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
              {applyMsg}
            </p>
          )}

          {interestPreview && (
            <div className="border border-gray-100 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-400 mb-2">
                Using {interestPreview.effectiveRate.toFixed(2)}% annual · {interestPreview.month}
              </p>
              {interestPreview.preview.map((p) => (
                <div key={p.childId} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      Balance: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(p.balance)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-blue-600">
                    +{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(p.interest)}
                  </p>
                </div>
              ))}
              <button
                onClick={applyInterest}
                className="w-full mt-3 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold"
              >
                Confirm & Apply
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add child section */}
      {activeSection === "add-child" && (
        <AddChildForm
          onAdded={() => {
            load();
            setActiveSection("interest");
          }}
        />
      )}

      {/* Settings section */}
      {activeSection === "settings" && (
        <SettingsForm
          settings={settings}
          onSaved={() => {
            load();
            setApplyMsg("");
          }}
        />
      )}

      {/* Change PIN section */}
      {activeSection === "pin" && <ChangePinForm />}

      {/* Children overview */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">Accounts ({children.length})</h2>
        <div className="flex flex-col gap-2">
          {children.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm"
            >
              <span className="text-2xl">{c.avatar_emoji}</span>
              <div>
                <p className="font-medium text-gray-800">{c.name}</p>
              </div>
              <div
                className="ml-auto w-4 h-4 rounded-full"
                style={{ backgroundColor: c.display_color }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddChildForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  const [color, setColor] = useState("#4F46E5");
  const [saving, setSaving] = useState(false);

  const EMOJIS = ["⭐", "🚀", "🦋", "🐸", "🦁", "🐼", "🌈", "🎯", "🏆", "💎"];
  const COLORS = [
    "#4F46E5", "#059669", "#DC2626", "#D97706",
    "#7C3AED", "#0891B2", "#DB2777", "#65A30D",
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, avatar_emoji: emoji, display_color: color }),
    });
    setSaving(false);
    onAdded();
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="font-semibold text-gray-700 mb-4">Add a Child</h2>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />

      <p className="text-xs text-gray-500 mb-2">Pick an emoji</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={`text-2xl p-2 rounded-xl ${emoji === e ? "bg-indigo-100 ring-2 ring-indigo-400" : "bg-gray-50"}`}
          >
            {e}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 mb-2">Pick a color</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            style={{ backgroundColor: c }}
            className={`w-8 h-8 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-gray-400" : ""}`}
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
      >
        {saving ? "Adding…" : "Add Child"}
      </button>
    </form>
  );
}

function SettingsForm({
  settings,
  onSaved,
}: {
  settings: { interest_multiplier: string; interest_floor_percent: string };
  onSaved: () => void;
}) {
  const [multiplier, setMultiplier] = useState(settings.interest_multiplier);
  const [floor, setFloor] = useState(settings.interest_floor_percent);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interest_multiplier: multiplier,
        interest_floor_percent: floor,
      }),
    });
    setSaving(false);
    setMsg("✓ Saved");
    onSaved();
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="font-semibold text-gray-700 mb-4">Interest Settings</h2>

      <label className="text-xs text-gray-500 block mb-1">
        Fed Rate Multiplier (e.g. 2 = 2× Fed rate)
      </label>
      <input
        type="number"
        value={multiplier}
        onChange={(e) => setMultiplier(e.target.value)}
        step="0.1"
        min="0"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />

      <label className="text-xs text-gray-500 block mb-1">
        Minimum Interest Rate Floor (%)
      </label>
      <input
        type="number"
        value={floor}
        onChange={(e) => setFloor(e.target.value)}
        step="0.1"
        min="0"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />

      {msg && <p className="text-green-600 text-sm mb-3">{msg}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}

function ChangePinForm() {
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirm) {
      setMsg("PINs don't match");
      return;
    }
    if (newPin.length < 4) {
      setMsg("PIN must be at least 4 digits");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_pin: newPin }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("✓ PIN updated");
      setNewPin("");
      setConfirm("");
    } else {
      const d = await res.json();
      setMsg(d.error ?? "Error");
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="font-semibold text-gray-700 mb-4">Change PIN</h2>
      <input
        type="password"
        inputMode="numeric"
        maxLength={8}
        placeholder="New PIN"
        value={newPin}
        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        required
      />
      <input
        type="password"
        inputMode="numeric"
        maxLength={8}
        placeholder="Confirm PIN"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        required
      />
      {msg && (
        <p className={`text-sm mb-3 ${msg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
      >
        {saving ? "Saving…" : "Update PIN"}
      </button>
    </form>
  );
}
