import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  CheckCircle,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { api, setAuthToken } from "../api";
import { FINANCE_DATA_CHANGED } from "../events";
import { formatMoney, formatTrend } from "../format";

const COLORS = ["#1E3A8A", "#2563EB", "#16A34A", "#F59E0B", "#DC2626", "#6B7280"];

export default function Dashboard() {
  const [data, setData] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const refreshDashboardData = () => {
    const token = localStorage.getItem("token");
    if (token) {
      setAuthToken(token);
      api.get("/dashboard").then((res) => setData(res.data || {})).catch(() => setData({}));
      api.get("/analysis/summary").then((res) => setAnalysis(res.data || {})).catch(() => setAnalysis(null));
      api.get("/transactions").then((res) => {
        const latest = (res.data || []).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        setRecentTransactions(latest);
        localStorage.setItem("transactions_local", JSON.stringify(res.data || []));
      }).catch(() => setRecentTransactions([]));
    }
  };

  useEffect(() => {
    refreshDashboardData();
    
    // Listen for transaction updates
    const handleTransactionUpdate = () => {
      refreshDashboardData();
    };
    
    window.addEventListener(FINANCE_DATA_CHANGED, handleTransactionUpdate);
    window.addEventListener('auth-changed', handleTransactionUpdate);
    
    return () => {
      window.removeEventListener(FINANCE_DATA_CHANGED, handleTransactionUpdate);
      window.removeEventListener('auth-changed', handleTransactionUpdate);
    };
  }, []);

  const totals = data?.totals || { income: 0, expenses: 0, savings: 0 };
  const creditScore = Number(data?.credit_score ?? 700);
  const riskLevel = data?.risk_level || "Medium";
  const scoreLabel = data?.score_label || "Fair";
  const trends = data?.trends || {};

  const chartData = (analysis?.category_breakdown ? Object.entries(analysis.category_breakdown).map(([name, value]) => ({ name, value })) : []).slice(0, 6);

  const topCategory = chartData[0]?.name || "No category";
  const foodPercent = analysis?.expenses && chartData[0]?.value ? Math.round((chartData[0].value / analysis.expenses) * 100) : 0;
  const healthStatus = foodPercent < 35 ? "healthy" : "caution";

  return (
    <div className="space-y-8">
      {/* Hero Section with Gradient */}
      <section className="relative rounded-2xl bg-blue-900 p-8 text-white overflow-hidden">
        <div className="absolute top-0 right-0 -m-24 w-96 h-96 bg-white/10 rounded-3xl blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome to Credit Intelligence!</h1>
          <p className="text-white/80 text-lg">Your AI-powered financial coach is ready to help you succeed! </p>
        </div>
      </section>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Income Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <ArrowDownLeft className="w-6 h-6 text-blue-900" />
            </div>
            <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full">{formatTrend(trends.income)}</span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Total Income</p>
          <p className="text-3xl font-bold text-gray-900">{formatMoney(totals.income)}</p>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>

        {/* Expenses Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <ArrowUpRight className="w-6 h-6 text-blue-900" />
            </div>
            <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full">{formatTrend(trends.expenses)}</span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Total Expenses</p>
          <p className="text-3xl font-bold text-gray-900">{formatMoney(totals.expenses)}</p>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>

        {/* Savings Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Wallet className="w-6 h-6 text-blue-900" />
            </div>
            <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full">{formatTrend(trends.savings)}</span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Total Savings</p>
          <p className="text-3xl font-bold text-gray-900">{formatMoney(totals.savings)}</p>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>

        {/* Credit Score Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Zap className="w-6 h-6 text-blue-900" />
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${riskLevel === "Low" ? "text-green-600 bg-green-50" : riskLevel === "Medium" ? "text-yellow-600 bg-yellow-50" : "text-red-600 bg-red-50"}`}>
              {riskLevel} Risk
            </span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Credit Score</p>
          <p className="text-3xl font-bold text-gray-900">{creditScore}</p>
          <p className="text-xs text-gray-500 mt-2">{scoreLabel} range</p>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-900 rounded-full"></div>
            Spending Breakdown
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={chartData} dataKey="value" innerRadius={60} outerRadius={100}>
                  {chartData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">No data available</div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {chartData.slice(0, 4).map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                <span className="text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-900 rounded-full"></div>
            Recent Transactions
          </h3>
          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.slice(0, 5).map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50`}>
                      {tx.type === "income" ? <TrendingUp className="w-5 h-5 text-blue-900" /> : <TrendingDown className="w-5 h-5 text-blue-900" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tx.category}</p>
                      <p className="text-xs text-gray-500">{tx.date}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold text-blue-600`}>
                    {tx.type === "income" ? "+" : "-"}{formatMoney(tx.amount)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 text-sm py-6">No transactions yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Insights & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Insights */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-900" />
            Smart Insights
          </h3>
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border-l-4 ${healthStatus === "healthy" ? "bg-green-50 border-green-500" : "bg-yellow-50 border-yellow-500"}`}>
              <div className="flex items-start gap-3">
                {healthStatus === "healthy" ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />}
                <div>
                  <p className={`font-semibold text-sm ${healthStatus === "healthy" ? "text-green-900" : "text-yellow-900"}`}>
                    {healthStatus === "healthy" ? "Spending under control" : "High spending detected"}
                  </p>
                  <p className={`text-xs mt-1 ${healthStatus === "healthy" ? "text-green-700" : "text-yellow-700"}`}>
                    {foodPercent}% of expenses are from {topCategory.toLowerCase()}. {healthStatus === "healthy" ? "Keep it up!" : "Consider reducing."}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 border-l-4 border-blue-900">
              <p className="text-sm font-medium text-blue-900">Savings Rate: {totals.income > 0 ? Math.round((totals.savings / totals.income) * 100) : 0}%</p>
              <p className="text-xs text-blue-700 mt-1">On track with financial goals</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-900" />
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 rounded-lg bg-blue-900 text-white font-medium text-sm hover:bg-blue-800 transition-all duration-300 hover:-translate-y-0.5">
              Add Transaction
            </button>
            <button className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 text-gray-700 font-medium text-sm hover:border-gray-300 hover:bg-gray-50 transition-all duration-300">
              View Full Reports
            </button>
            <button className="w-full px-4 py-3 rounded-lg bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 transition-all duration-300">
              Download Statement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
