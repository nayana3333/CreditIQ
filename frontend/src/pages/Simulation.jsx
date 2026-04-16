import { useState } from "react";
import { ArrowRightLeft, Gauge, ShieldAlert } from "lucide-react";

import { api } from "../api";

export default function Simulation() {
  const [form, setForm] = useState({ current_score: 700, income_delta: 0, expense_delta: 0 });
  const [result, setResult] = useState(null);

  const run = async () => {
    const { data } = await api.post("/simulation/run", {
      current_score: Number(form.current_score),
      income_delta: Number(form.income_delta),
      expense_delta: Number(form.expense_delta),
    });
    setResult(data);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h2 className="text-xl font-semibold">What-If Simulation</h2>
        <p className="mt-1 text-sm text-gray-500">Adjust income and expense assumptions to project credit outcomes.</p>
        <div className="mt-5 space-y-4">
          <input className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Current Credit Score" value={form.current_score} onChange={(e) => setForm({ ...form, current_score: e.target.value })} />
          <input className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Income Change (e.g. 2000)" value={form.income_delta} onChange={(e) => setForm({ ...form, income_delta: e.target.value })} />
          <input className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Expense Change (e.g. -1000)" value={form.expense_delta} onChange={(e) => setForm({ ...form, expense_delta: e.target.value })} />
          <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90" onClick={run}>
            <ArrowRightLeft size={16} />
            Run Simulation
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h3 className="text-xl font-semibold">Projected Result</h3>
        {!result ? (
          <p className="mt-3 text-sm text-gray-500">Run a simulation to view updated credit score and risk level.</p>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="mb-1 flex items-center gap-2 text-sm text-gray-500"><Gauge size={16} /> Updated Credit Score</p>
              <p className="text-2xl font-bold text-blue-700">{result.projected_score}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="mb-1 flex items-center gap-2 text-sm text-gray-500"><ShieldAlert size={16} /> Updated Risk Level</p>
              <p
                className={`text-xl font-bold ${
                  result.projected_risk === "Low"
                    ? "text-green-600"
                    : result.projected_risk === "Medium"
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {result.projected_risk}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
