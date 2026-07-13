import { useEffect, useState } from "react";
import { BarChart3, CheckCircle, RotateCcw, XCircle } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api, setAuthToken } from "../api";
import { DEFAULT_LOAN_INPUT, FEATURE_LABELS, displayValue, money, optionSets, percent } from "../creditFeatures";

const sliders = [
  ["credit_amount", 250, 18424, 100],
  ["duration", 4, 72, 1],
  ["age", 19, 75, 1],
  ["installment_rate", 1, 4, 1],
];

export default function Simulation() {
  const [form, setForm] = useState(() => {
    try {
      return { ...DEFAULT_LOAN_INPUT, ...(JSON.parse(localStorage.getItem("creditiq_simulation_input")) || {}) };
    } catch {
      return DEFAULT_LOAN_INPUT;
    }
  });
  const [result, setResult] = useState(null);
  const [varyField, setVaryField] = useState("credit_amount");
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const predict = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);
    try {
      const { data } = await api.post("/ml/predict", form);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const simulate = async () => {
    const ranges = {
      credit_amount: [1000, 2000, 3000, 5000, 7500, 10000, 14000, 18000],
      duration: [6, 12, 18, 24, 36, 48, 60, 72],
      age: [20, 25, 30, 35, 45, 55, 65, 75],
      installment_rate: [1, 2, 3, 4],
    };
    const { data } = await api.post("/ml/simulate", { ...form, vary_field: varyField, vary_range: ranges[varyField] || ranges.credit_amount });
    setSeries(data || []);
  };

  useEffect(() => { predict(); }, []);
  useEffect(() => { simulate(); }, [varyField, result]);

  const final = result?.final_decision || "pending";
  const reasons = result?.rf?.shap_reasons || [];

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="ci-panel lg:col-span-2">
        <h1 className="ci-page-title">What-if simulator</h1>
        <p className="mt-1 text-[13px] text-[#737373]">Adjust loan parameters and compare approval probability.</p>
        <div className="mt-6 space-y-5">
          {sliders.map(([field, min, max, step]) => (
            <label key={field} className="block">
              <div className="mb-2 flex justify-between text-[13px]"><span className="font-medium text-[#111111]">{FEATURE_LABELS[field]}</span><span className="text-[#737373]">{field === "credit_amount" ? money(form[field]) : form[field]}</span></div>
              <input type="range" min={min} max={max} step={step} value={form[field]} onChange={(e) => update(field, Number(e.target.value))} className="w-full accent-[#111111]" />
            </label>
          ))}
          {["checking_status", "credit_history", "purpose", "employment", "savings_status"].map((field) => (
            <label key={field} className="block text-[13px] font-medium text-[#111111]">
              {FEATURE_LABELS[field]}
              <select value={form[field]} onChange={(e) => update(field, e.target.value)} className="ci-input mt-2">
                {optionSets[field].map((option) => <option key={option} value={option}>{displayValue(field, option)}</option>)}
              </select>
            </label>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={predict} className="ci-button">{loading ? "Predicting..." : "Predict now"}</button>
            <button onClick={() => { setForm(DEFAULT_LOAN_INPUT); setResult(null); }} className="ci-button-secondary"><RotateCcw className="h-[15px] w-[15px]" />Reset</button>
          </div>
        </div>
      </section>

      <section className="space-y-6 lg:col-span-3">
        <div className="ci-panel text-center">
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${final === "approved" ? "bg-[#F7F5F0] text-[#111111]" : "bg-[#FFFCF7] text-[#111111]"}`}>
            {final === "approved" ? <CheckCircle className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
          </div>
          <p className="mt-3 text-[20px] font-medium capitalize text-[#111111]">{final}</p>
          <p className="mt-1 text-[13px] text-[#737373]">Random Forest confidence {percent(result?.rf?.confidence || 0)}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {["lr", "rf"].map((key) => <div key={key} className={`rounded-lg border bg-white p-4 ${key === "rf" ? "border-[#D4D4D4]" : "border-[#E5E5E5]"}`}><p className="text-[13px] font-medium">{result?.[key]?.model_name}</p><p className="mt-2 text-[13px] capitalize text-[#737373]">{result?.[key]?.decision}</p><div className="mt-3 h-2 rounded-full bg-[#F7F5F0]"><div className="h-full rounded-full bg-[#111111]" style={{ width: percent(result?.[key]?.good_probability || 0) }} /></div><p className="mt-2 text-[11px] text-[#737373]">Approval probability {percent(result?.[key]?.good_probability || 0)}</p></div>)}
        </div>

        <div className="ci-panel">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-medium text-[#111111]"><BarChart3 className="h-4 w-4" />Sensitivity chart</h2>
            <select value={varyField} onChange={(e) => setVaryField(e.target.value)} className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm">
              {["credit_amount", "duration", "age", "installment_rate"].map((field) => <option key={field} value={field}>Vary: {FEATURE_LABELS[field]}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={series}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="value" /><YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} /><Tooltip formatter={(v) => percent(v)} /><Legend /><Line name="LR approval" dataKey="lr_approval_probability" stroke="#2563EB" strokeWidth={3} /><Line name="RF approval" dataKey="rf_approval_probability" stroke="#F97316" strokeWidth={3} /></LineChart>
          </ResponsiveContainer>
        </div>

        <div className="ci-panel">
          <h2 className="ci-section-title">Main factors in this prediction</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-3">{reasons.slice(0, 3).map((reason) => <div key={reason.feature} className="rounded-lg bg-[#F7F5F0] p-3 text-[13px]"><p className="font-medium text-[#111111]">{reason.label}</p><p className={reason.direction === "negative" ? "text-[#111111]" : "text-[#111111]"}>{reason.direction} impact</p></div>)}</div>
        </div>
      </section>
    </div>
  );
}




