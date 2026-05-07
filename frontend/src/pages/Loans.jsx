import { useEffect, useState } from "react";
import { Plus, TrendingDown, AlertCircle, CheckCircle, Calendar, Percent, DollarSign } from "lucide-react";

import { api, setAuthToken } from "../api";
import { notifyFinanceDataChanged } from "../events";
import { estimateLoanMonths, formatMoney } from "../format";
import PageHeader from "../components/PageHeader";

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
    const loanAmount = Number(form.loan_amount);
    const emi = Number(form.emi);
    const interestRate = Number(form.interest_rate);
    if (!Number.isFinite(loanAmount) || loanAmount <= 0 || !Number.isFinite(emi) || emi <= 0 || !Number.isFinite(interestRate) || interestRate < 0) {
      setMessage("Enter a valid loan amount, EMI, and non-negative interest rate.");
      return;
    }
    try {
      await api.post("/loans", {
        loan_amount: loanAmount,
        emi,
        interest_rate: interestRate,
      });
      setForm({ loan_amount: "", emi: "", interest_rate: "" });
      setMessage("Loan added successfully");
      setShowForm(false);
      await load();
      notifyFinanceDataChanged();
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setMessage(e.response?.data?.error || "Failed to add loan");
    }
  };

  const totalLoanAmount = items.reduce((sum, item) => sum + (Number(item.loan_amount) || 0), 0);
  const totalEMI = items.reduce((sum, item) => sum + (Number(item.emi) || 0), 0);
  const pendingLoanAmount = Number(form.loan_amount) || 0;
  const pendingEMI = Number(form.emi) || 0;
  const previewLoanAmount = totalLoanAmount + (showForm ? pendingLoanAmount : 0);
  const previewTotalEMI = totalEMI + (showForm ? pendingEMI : 0);
  const showLoanPreview = showForm && pendingLoanAmount > 0;
  const previewMonths = estimateLoanMonths(pendingLoanAmount, Number(form.interest_rate) || 0, pendingEMI);

  return (
    <div className="space-y-8">
      <PageHeader title="Loan & EMI Management" description="Track and manage all your loans and EMI obligations" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-900" />
            </div>
            <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full">Total</span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Total Loan Amount</p>
          <p className="text-3xl font-bold text-gray-900">{formatMoney(showLoanPreview ? previewLoanAmount : totalLoanAmount)}</p>
          {showLoanPreview && <p className="text-xs text-gray-500 mt-2">Projected with current draft loan</p>}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingDown className="w-6 h-6 text-blue-900" />
            </div>
            <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full">Monthly</span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Total EMI Payment</p>
          <p className="text-3xl font-bold text-gray-900">{formatMoney(showLoanPreview ? previewTotalEMI : totalEMI)}</p>
          {showLoanPreview && <p className="text-xs text-gray-500 mt-2">Projected monthly payment</p>}
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
                <label className="text-sm font-medium text-gray-700 block mb-2">Loan Amount (INR)</label>
                <input
                  type="number"
                  placeholder="Enter total loan amount"
                  value={form.loan_amount}
                  onChange={(e) => setForm({ ...form, loan_amount: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Monthly EMI (INR)</label>
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

              {showLoanPreview && pendingEMI > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-blue-50 p-4 text-sm text-blue-700">
                  <p className="font-semibold">Projected loan summary</p>
                  {previewMonths ? (
                    <p className="mt-2">Estimated term: {previewMonths} months (~{Math.ceil(previewMonths / 12)} years)</p>
                  ) : (
                    <p className="mt-2">This EMI is too low to cover monthly interest.</p>
                  )}
                </div>
              )}

              {message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${message.includes("successfully") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {message}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={add}
                  className="flex-1 px-6 py-3 rounded-xl bg-blue-900 text-white font-medium text-sm transition-all hover:bg-blue-800 hover:-translate-y-0.5 flex items-center justify-center gap-2"
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
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-900 text-xs font-semibold px-3 py-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Active
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-900 font-medium mb-1">Loan Amount</p>
                    <p className="text-2xl font-bold text-blue-900">{formatMoney(item.loan_amount)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-900 font-medium mb-1 flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        Monthly EMI
                      </p>
                      <p className="text-xl font-bold text-blue-900">{formatMoney(item.emi)}</p>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-900 font-medium mb-1 flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5" />
                        Interest Rate
                      </p>
                      <p className="text-xl font-bold text-blue-900">{Number(item.interest_rate || 0).toFixed(2)}%</p>
                    </div>
                  </div>

                  {item.loan_amount && item.emi && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-600 font-medium mb-1">Estimated Duration</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.estimated_months || estimateLoanMonths(item.loan_amount, item.interest_rate, item.emi)
                          ? `${item.estimated_months || estimateLoanMonths(item.loan_amount, item.interest_rate, item.emi)} months (~${Math.ceil((item.estimated_months || estimateLoanMonths(item.loan_amount, item.interest_rate, item.emi)) / 12)} years)`
                          : "EMI is too low for the interest rate"}
                      </p>
                    </div>
                  )}

                  {item.estimated_total_payable && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium mb-1">Est. Interest</p>
                        <p className="text-sm font-semibold text-gray-900">{formatMoney(item.estimated_interest)}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium mb-1">Total Payable</p>
                        <p className="text-sm font-semibold text-gray-900">{formatMoney(item.estimated_total_payable)}</p>
                      </div>
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
