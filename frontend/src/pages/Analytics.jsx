import { useEffect, useState } from "react";
import { AlertCircle, BarChart3, LineChart as LineChartIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api, setAuthToken } from "../api";
import { FINANCE_DATA_CHANGED } from "../events";
import { formatMoney } from "../format";
import PageHeader from "../components/PageHeader";

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Login to view analytics.");
      return;
    }
    setAuthToken(token);
    api.get("/analytics").then((res) => {
      setData(res.data);
      setError("");
    }).catch((err) => {
      setData(null);
      setError(err.response?.data?.error || "Analytics could not be loaded.");
    });
  };

  useEffect(() => {
    load();
    window.addEventListener(FINANCE_DATA_CHANGED, load);
    return () => window.removeEventListener(FINANCE_DATA_CHANGED, load);
  }, []);

  const monthly = data?.monthly || [];
  const categories = data?.category_breakdown || [];
  const scoreHistory = data?.score_history || monthly.map((item) => ({ date: item.month, credit_score: item.credit_score }));

  return (
    <div className="space-y-8">
      <PageHeader title="Financial Analytics" description="Monthly trends, spending concentration, score history, and risk alerts." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
            <BarChart3 className="h-5 w-5 text-blue-900" />
            Income vs Expenses
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly.length ? monthly : [{ month: "No data", income: 0, expenses: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatMoney(value)} />
              <Bar dataKey="income" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" fill="#93c5fd" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
            <AlertCircle className="h-5 w-5 text-blue-900" />
            Alerts
          </h2>
          <div className="space-y-3">
            {error && <div className="rounded-xl border-l-4 border-blue-900 bg-blue-50 p-3 text-sm text-blue-900">{error}</div>}
            {(data?.alerts || []).map((alert) => (
              <div key={alert} className="rounded-xl border-l-4 border-blue-900 bg-blue-50 p-3 text-sm text-blue-900">
                {alert}
              </div>
            ))}
            {!data?.alerts?.length && <p className="text-sm text-gray-500">No unusual spending alerts right now.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
            <LineChartIcon className="h-5 w-5 text-blue-900" />
            Credit Score History
          </h2>
          <ResponsiveContainer width="100%" height={260}>
              <LineChart data={scoreHistory.length ? scoreHistory : monthly.map((item) => ({ date: item.month, credit_score: item.credit_score }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[300, 900]} />
              <Tooltip />
              <Line type="monotone" dataKey="credit_score" stroke="#1e3a8a" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold">Top Spending Categories</h2>
          <div className="space-y-4">
            {categories.slice(0, 6).map((item) => (
              <div key={item.category}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium text-gray-900">{item.category}</span>
                  <span className="text-gray-500">{formatMoney(item.amount)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-blue-900" style={{ width: `${Math.min((item.amount / Math.max(categories[0]?.amount || 1, 1)) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
            {!categories.length && <p className="text-sm text-gray-500">Add transactions to unlock spending analytics.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
