import { useEffect, useState } from "react";
import { Plus, TrendingDown, AlertCircle, CheckCircle, Calendar, Percent, DollarSign } from "lucide-react";

import { api, setAuthToken } from "../api";

export default function Loans() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ loan_amount: "", emi: "", interest_rate: "" });
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setAuthToken(token);
    try {
      const { data } = await api.get("/loans");
      setItems(data || []);
    } catch (e) {
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!form.loan_amount || !form.emi || !form.interest_rate) {
      setMessage("Please fill all fields");
      return;
    }
    try {
      await api.post("/loans", {
        loan_amount: Number(form.loan_amount),
        emi: Number(form.emi),
        interest_rate: Number(form.interest_rate),
      });
      setForm({ loan_amount: "", emi: "", interest_rate: "" });
      setMessage("Loan added successfully");
      setShowForm(false);
      await load();
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setMessage("Failed to add loan");
    }
  };

  const totalLoanAmount = items.reduce((sum, item) => sum + (Number(item.loan_amount) || 0), 0);
  const totalEMI = items.reduce((sum, item) => sum + (Number(item.emi) || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="relative rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white overflow-hidden">
        <div className="absolute top-0 right-0 -m-24 w-96 h-96 bg-white/10 rounded-3xl blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Loan & EMI Management</h1>
          <p className="text-white/80">Track and manage all your loans and EMI obligations</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Total</span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Total Loan Amount</p>
          <p className="text-3xl font-bold text-gray-900">₹{totalLoanAmount.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">Monthly</span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Total EMI Payment</p>
          <p className="text-3xl font-bold text-gray-900">₹{totalEMI.toLocaleString()}</p>
        </div>
      </div>

      {/* Add Loan Button and Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full px-6 py-6 flex items-center justify-center gap-2 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Loan / EMI
          </button>
        ) : (
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Add New Loan / EMI</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Loan Amount (₹)</label>
                <input
                  type="number"
                  placeholder="Enter total loan amount"
                  value={form.loan_amount}
                  onChange={(e) => setForm({ ...form, loan_amount: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Monthly EMI (₹)</label>
                <input
                  type="number"
                  placeholder="Enter monthly EMI amount"
                  value={form.emi}
                  onChange={(e) => setForm({ ...form, emi: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Enter annual interest rate"
                  value={form.interest_rate}
                  onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${message.includes("successfully") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {message}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={add}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium text-sm transition-all hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Save Loan
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setMessage("");
                  }}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium text-sm transition-all hover:border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loans List */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Loans</h2>
        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Loan #{item.id}</h3>
                    <p className="text-sm text-gray-500 mt-1">Active loan</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Active
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium mb-1">Loan Amount</p>
                    <p className="text-2xl font-bold text-blue-900">₹{Number(item.loan_amount || 0).toLocaleString()}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-xs text-red-600 font-medium mb-1 flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        Monthly EMI
                      </p>
                      <p className="text-xl font-bold text-red-900">₹{Number(item.emi || 0).toLocaleString()}</p>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5" />
                        Interest Rate
                      </p>
                      <p className="text-xl font-bold text-amber-900">{Number(item.interest_rate || 0).toFixed(2)}%</p>
                    </div>
                  </div>

                  {item.loan_amount && item.emi && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-600 font-medium mb-1">Estimated Duration</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {Math.ceil(Number(item.loan_amount) / Number(item.emi))} months (~{Math.ceil(Number(item.loan_amount) / Number(item.emi) / 12)} years)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No loans yet</p>
            <p className="text-gray-500 text-sm mt-1">Add your first loan above to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

