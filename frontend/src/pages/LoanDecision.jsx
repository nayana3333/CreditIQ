import { useEffect, useState } from "react";
import { Calculator, Scale } from "lucide-react";

import { api, setAuthToken } from "../api";
import { formatMoney } from "../format";
import PageHeader from "../components/PageHeader";

export default function LoanDecision() {
  const [form, setForm] = useState({
    loan_amount: "500000",
    interest_rate: "10.5",
    tenure_months: "60",
    current_score: "720",
    income: "",
    expenses: "",
    existing_emi: "",
  });
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setAuthToken(token);
    Promise.all([
      api.get("/dashboard").catch(() => ({ data: null })),
      api.get("/loans").catch(() => ({ data: [] })),
    ]).then(([dashboard, loans]) => {
      const totalEmi = (loans.data || []).reduce((sum, loan) => sum + (Number(loan.emi) || 0), 0);
      setForm((prev) => ({
        ...prev,
        income: dashboard.data?.totals?.income ? String(dashboard.data.totals.income) : prev.income,
        expenses: dashboard.data?.totals?.expenses ? String(dashboard.data.totals.expenses) : prev.expenses,
        current_score: dashboard.data?.credit_score ? String(dashboard.data.credit_score) : prev.current_score,
        existing_emi: totalEmi ? String(totalEmi) : prev.existing_emi,
      }));
    });
  }, []);

  const run = async () => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);
    const loanAmount = Number(form.loan_amount);
    const rate = Number(form.interest_rate);
    const months = Number(form.tenure_months);
    if (!Number.isFinite(loanAmount) || loanAmount <= 0 || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(months) || months <= 0) {
      setMessage("Enter a valid loan amount, interest rate, and tenure.");
      return;
    }
    try {
      const { data } = await api.post("/decision/loan", {
        loan_amount: loanAmount,
        interest_rate: rate,
        tenure_months: months,
        current_score: Number(form.current_score),
        income: Number(form.income) || undefined,
        expenses: Number(form.expenses) || undefined,
        existing_emi: Number(form.existing_emi) || undefined,
      });
      setResult(data);
      setMessage("");
    } catch (error) {
      setResult(null);
      setMessage(error.response?.data?.error || "Loan analysis could not be completed.");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Loan Decision Support" description="Research-backed fuzzy risk rules with EMI and amortization output." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
            <Calculator className="h-5 w-5 text-blue-900" />
            Loan Inputs
          </h2>
          <div className="space-y-4">
            {[
              ["loan_amount", "Loan amount"],
              ["interest_rate", "Interest rate (%)"],
              ["tenure_months", "Tenure months"],
              ["current_score", "Current credit score"],
              ["income", "Monthly income"],
              ["expenses", "Monthly expenses"],
              ["existing_emi", "Existing EMI"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
                <input
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-blue-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  value={form[key]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  type="number"
                />
              </div>
            ))}
            <button onClick={run} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-medium text-white hover:bg-blue-800">
              <Scale className="h-4 w-4" />
              Evaluate Loan
            </button>
            {message && <p className="text-sm text-gray-600">{message}</p>}
          </div>
        </div>

        <div className="space-y-6 xl:col-span-2">
          {result ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {[
                  ["Decision", result.decision],
                  ["Projected Score", result.projected_score],
                  ["Proposed EMI", formatMoney(result.proposed_emi)],
                  ["Total Payable", formatMoney(result.total_payable)],
                  ["EMI Burden", `${Math.round((result.emi_to_income_ratio || 0) * 100)}%`],
                  ["Outflow Ratio", `${Math.round((result.expense_to_income_ratio || 0) * 100)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="mt-2 text-xl font-bold text-blue-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold">Decision Reasons</h3>
                <div className="space-y-3">
                  {result.reasons.map((reason) => (
                    <div key={reason} className="rounded-xl border-l-4 border-blue-900 bg-blue-50 p-3 text-sm text-blue-900">
                      {reason}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold">First 12 Months Amortization</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Month</th>
                        <th className="px-4 py-3">EMI</th>
                        <th className="px-4 py-3">Principal</th>
                        <th className="px-4 py-3">Interest</th>
                        <th className="px-4 py-3">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.amortization.map((row) => (
                        <tr key={row.month} className="border-t border-gray-100">
                          <td className="px-4 py-3">{row.month}</td>
                          <td className="px-4 py-3">{formatMoney(row.emi)}</td>
                          <td className="px-4 py-3">{formatMoney(row.principal)}</td>
                          <td className="px-4 py-3">{formatMoney(row.interest)}</td>
                          <td className="px-4 py-3">{formatMoney(row.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
              Enter loan details to generate a decision, risk score, EMI, and amortization schedule.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
