import { useEffect, useState } from "react";
import { Plus, Upload, Zap, Trash2, DollarSign, TrendingUp, TrendingDown, Pencil, Search } from "lucide-react";

import { api, setAuthToken } from "../api";
import { notifyFinanceDataChanged } from "../events";
import { formatMoney } from "../format";
import PageHeader from "../components/PageHeader";

export default function Transactions() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ amount: "", type: "expense", category: "Food", date: "", description: "" });
  const [smartText, setSmartText] = useState("Paid 300 for Zomato");
  const [csvFile, setCsvFile] = useState(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("manual");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ search: "", type: "all", month: "" });

  const load = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      setAuthToken(token);
      try {
        const params = {};
        if (filters.search) params.search = filters.search;
        if (filters.type !== "all") params.type = filters.type;
        if (filters.month) params.month = filters.month;
        const { data } = await api.get("/transactions", { params });
        setItems(data || []);
        localStorage.setItem("transactions_local", JSON.stringify(data || []));
      } catch (e) {
        const localItems = JSON.parse(localStorage.getItem("transactions_local") || "[]");
        setItems(localItems);
      }
    } else {
      const localItems = JSON.parse(localStorage.getItem("transactions_local") || "[]");
      setItems(localItems);
    }
  };

  useEffect(() => {
    load();
  }, [filters.search, filters.type, filters.month]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ amount: "", type: "expense", category: "Food", date: "", description: "" });
  };

  const save = async () => {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid amount greater than zero.");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      setAuthToken(token);
      if (!token) {
        const next = {
          id: Date.now(),
          ...form,
          amount,
          date: form.date || new Date().toISOString().slice(0, 10),
        };
        const merged = [next, ...items];
        setItems(merged);
        localStorage.setItem("transactions_local", JSON.stringify(merged));
      } else {
        const payload = {
          ...form,
          amount,
          date: form.date || new Date().toISOString().slice(0, 10),
        };
        if (editingId) {
          await api.put(`/transactions/${editingId}`, payload);
        } else {
          await api.post("/transactions", payload);
        }
        await load();
      }
      resetForm();
      setMessage("Transaction saved. Dashboard, analytics, budgets, and assistant data refreshed.");
      notifyFinanceDataChanged();
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not save transaction.");
    } finally {
      setLoading(false);
    }
  };

  const parseSmartText = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setAuthToken(token);
    const { data } = await api.post("/transactions/parse-text", { text: smartText });
    setForm({
      amount: String(data.amount || ""),
      type: data.type || "expense",
      category: data.category || "Other",
      date: new Date().toISOString().slice(0, 10),
      description: data.description || "",
    });
    setMessage("Smart input parsed. Review and click Add.");
  };

  const uploadCsv = async () => {
    const token = localStorage.getItem("token");
    if (!token || !csvFile) return;
    setAuthToken(token);

    const payload = new FormData();
    payload.append("file", csvFile);

    const { data } = await api.post("/transactions/upload-csv", payload);
    setMessage(`CSV uploaded: ${data.inserted} transactions imported.`);
    setCsvFile(null);
    await load();
    notifyFinanceDataChanged();
  };

  const removeTx = async (id) => {
    const token = localStorage.getItem("token");
    try {
      if (token && Number.isInteger(id)) {
        setAuthToken(token);
        await api.delete(`/transactions/${id}`);
        await load();
      } else {
        const filtered = items.filter((t) => t.id !== id);
        setItems(filtered);
        localStorage.setItem("transactions_local", JSON.stringify(filtered));
      }
      setMessage("Transaction deleted. Reports refreshed.");
      notifyFinanceDataChanged();
    } catch (error) {
      setMessage("Could not delete transaction.");
    }
  };

  const totalIncome = items.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = items.filter(t => t.type === "expense" || t.type === "emi").reduce((sum, t) => sum + t.amount, 0);
  const pendingAmount = Number(form.amount) || 0;
  const pendingType = form.type;
  const previewIncome = totalIncome + (pendingType === "income" ? pendingAmount : 0);
  const previewExpense = totalExpense + (pendingType === "expense" || pendingType === "emi" ? pendingAmount : 0);
  const previewBalance = previewIncome - previewExpense;
  const shouldShowPreview = pendingAmount > 0 && activeTab !== "import";

  return (
    <div className="space-y-8">
      <PageHeader title="Transaction Management" description="Track, manage, and analyze all your financial transactions" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-900" />
            </div>
            <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full">Total</span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Income</p>
          <p className="text-3xl font-bold text-gray-900">{formatMoney(shouldShowPreview ? previewIncome : totalIncome)}</p>
          {shouldShowPreview && <p className="text-xs text-gray-500 mt-2">Includes draft transaction</p>}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingDown className="w-6 h-6 text-blue-900" />
            </div>
            <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full">Total</span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Expenses</p>
          <p className="text-3xl font-bold text-gray-900">{formatMoney(shouldShowPreview ? previewExpense : totalExpense)}</p>
          {shouldShowPreview && <p className="text-xs text-gray-500 mt-2">Includes draft transaction</p>}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-900" />
            </div>
            <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full">Net</span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Balance</p>
          <p className={`text-3xl font-bold ${previewBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatMoney(shouldShowPreview ? previewBalance : totalIncome - totalExpense)}
          </p>
          {shouldShowPreview && <p className="text-xs text-gray-500 mt-2">Projected balance with current entry</p>}
        </div>
      </div>

      {/* Input Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tab buttons */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all ${activeTab === "manual" ? "text-blue-900 border-b-2 border-blue-900" : "text-gray-600 hover:text-blue-900"}`}
          >
            <Plus className="w-5 h-5" />
            Add Transaction
          </button>
          <button
            onClick={() => setActiveTab("smart")}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all ${activeTab === "smart" ? "text-blue-900 border-b-2 border-blue-900" : "text-gray-600 hover:text-blue-900"}`}
          >
            <Zap className="w-5 h-5" />
            Smart Input
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all ${activeTab === "import" ? "text-blue-900 border-b-2 border-blue-900" : "text-gray-600 hover:text-blue-900"}`}
          >
            <Upload className="w-5 h-5" />
            Import CSV
          </button>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {/* Manual Add */}
          {activeTab === "manual" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Amount (INR)</label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="emi">EMI</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Category</label>
                  <input
                    type="text"
                    placeholder="e.g., Food, Travel"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 block mb-2">Description</label>
                  <input
                    type="text"
                    placeholder="Optional notes"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              <button
                onClick={save}
                disabled={loading}
                className="w-full md:w-auto px-6 py-3 rounded-xl bg-blue-900 text-white font-medium text-sm transition-all hover:bg-blue-800 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {loading ? "Saving..." : editingId ? "Update Transaction" : "Add Transaction"}
              </button>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="w-full md:w-auto px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm transition-all hover:bg-gray-50"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          )}

          {/* Smart Input */}
          {activeTab === "smart" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Natural language input</label>
                <input
                  type="text"
                  placeholder="e.g., Paid 300 for Zomato"
                  value={smartText}
                  onChange={(e) => setSmartText(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={parseSmartText}
                  className="px-6 py-3 rounded-xl bg-blue-900 text-white font-medium text-sm transition-all hover:bg-blue-800 hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  Parse
                </button>
                {form.amount && (
                  <button
                    onClick={save}
                    className="px-6 py-3 rounded-xl border-2 border-blue-900 text-blue-900 font-medium text-sm transition-all hover:bg-blue-50 flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CSV Import */}
          {activeTab === "import" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Select CSV file</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="text-xs text-gray-500 mt-2">Expected columns: amount, type, category, date, description</p>
              </div>
              <button
                onClick={uploadCsv}
                disabled={!csvFile}
                className="px-6 py-3 rounded-xl bg-blue-900 text-white font-medium text-sm transition-all hover:bg-blue-800 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Import CSV
              </button>
            </div>
          )}

          {message && (
            <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${message.includes("successful") || message.includes("parsed") ? "bg-green-50 text-green-700 border border-green-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-900 focus:bg-white"
                placeholder="Search category or notes"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <select
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-900 focus:bg-white"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="emi">EMI</option>
            </select>
            <input
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-900 focus:bg-white"
              type="month"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {items.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-700 font-semibold">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{t.date}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">
                        {t.type === "income" ? <TrendingUp className="w-3.5 h-3.5" /> : t.type === "emi" ? <DollarSign className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{t.category}</td>
                    <td className={`px-6 py-4 font-bold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "income" ? "+" : "-"}{formatMoney(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{t.description || "-"}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setEditingId(t.id);
                          setActiveTab("manual");
                          setForm({
                            amount: String(t.amount || ""),
                            type: t.type || "expense",
                            category: t.category || "Other",
                            date: t.date || "",
                            description: t.description || "",
                          });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="mr-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-900 text-xs font-medium transition-all hover:bg-blue-100"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => removeTx(t.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium transition-all hover:bg-red-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500 text-sm">No transactions yet. Add your first transaction above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
