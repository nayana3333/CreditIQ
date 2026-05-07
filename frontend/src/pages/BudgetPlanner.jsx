import { useEffect, useState } from "react";
import { Plus, Trash2, Target } from "lucide-react";

import { api, setAuthToken } from "../api";
import { FINANCE_DATA_CHANGED, notifyFinanceDataChanged } from "../events";
import { formatMoney } from "../format";
import PageHeader from "../components/PageHeader";

const statusClass = {
  Healthy: "bg-blue-50 text-blue-900",
  Warning: "bg-blue-50 text-blue-900",
  Exceeded: "bg-blue-900 text-white",
};

export default function BudgetPlanner() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ category: "Food", monthly_limit: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("Login to create and track budgets.");
      return;
    }
    setAuthToken(token);
    const { data } = await api.get("/budgets");
    setItems(data || []);
  };

  useEffect(() => {
    load().catch(() => setItems([]));
    window.addEventListener(FINANCE_DATA_CHANGED, load);
    return () => window.removeEventListener(FINANCE_DATA_CHANGED, load);
  }, []);

  const save = async () => {
    const limit = Number(form.monthly_limit);
    if (!form.category.trim() || !Number.isFinite(limit) || limit <= 0) {
      setMessage("Add a category and a valid monthly limit.");
      return;
    }
    try {
      setLoading(true);
      await api.post("/budgets", { category: form.category.trim(), monthly_limit: limit });
      setForm({ category: "Food", monthly_limit: "" });
      setMessage("Budget saved and synced with dashboard/analytics.");
      await load();
      notifyFinanceDataChanged();
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not save budget.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/budgets/${id}`);
      await load();
      setMessage("Budget deleted.");
      notifyFinanceDataChanged();
    } catch (error) {
      setMessage("Could not delete budget.");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Budget Planner" description="Set category limits and track when spending crosses 80%." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-900">
            <Target className="h-5 w-5 text-blue-900" />
            New Budget
          </h2>
          <div className="space-y-4">
            <input
              list="budget-categories"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-blue-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              placeholder="Category"
            />
            <datalist id="budget-categories">
              <option value="Food" />
              <option value="Travel" />
              <option value="Shopping" />
              <option value="Rent" />
              <option value="Loan/EMI" />
              <option value="Other" />
            </datalist>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-blue-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
              type="number"
              value={form.monthly_limit}
              onChange={(event) => setForm({ ...form, monthly_limit: event.target.value })}
              placeholder="Monthly limit"
            />
            <button onClick={save} disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
              <Plus className="h-4 w-4" />
              {loading ? "Saving..." : "Save Budget"}
            </button>
            {message && <p className="text-sm text-gray-600">{message}</p>}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {items.map((item) => {
              const percent = Math.min(Math.round((item.usage || 0) * 100), 999);
              return (
                <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{item.category}</p>
                      <p className="mt-1 text-sm text-gray-500">{formatMoney(item.spent)} spent of {formatMoney(item.monthly_limit)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[item.status] || statusClass.Healthy}`}>{item.status}</span>
                  </div>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-900" style={{ width: `${Math.min(percent, 100)}%` }} />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-900">{percent}% used</span>
                    <button onClick={() => remove(item.id)} className="rounded-lg p-2 text-blue-900 hover:bg-blue-50" aria-label="Delete budget">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {!items.length && <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">No budgets yet. Add your first category limit.</div>}
        </div>
      </div>
    </div>
  );
}
