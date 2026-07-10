import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, setAuthToken } from "../api";
import { DEFAULT_LOAN_INPUT, FEATURE_LABELS, displayValue, money, optionSets } from "../creditFeatures";

const steps = [
  { title: "Personal", fields: ["age", "personal_status", "num_dependents", "own_telephone", "foreign_worker", "housing", "employment", "job"] },
  { title: "Financial", fields: ["checking_status", "savings_status", "existing_credits", "installment_rate", "residence_since"] },
  { title: "Loan", fields: ["credit_amount", "duration", "purpose", "credit_history", "other_payment_plans", "other_parties", "property_magnitude"] },
  { title: "Review", fields: [] },
];

export default function LoanForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(DEFAULT_LOAN_INPUT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setValue = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const current = steps[step];

  const submit = async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);
    try {
      const prediction = await api.post("/ml/predict", form);
      const saved = await api.post("/loans", {
        ...form,
        loan_amount: form.credit_amount,
        emi: 0,
        interest_rate: 0,
        final_decision: prediction.data.final_decision,
        decision_result: prediction.data,
      });
      localStorage.setItem(`loan_decision_${saved.data.id}`, JSON.stringify(prediction.data));
      const applicationId = prediction.data.application_id || saved.data.id;
      navigate(`/applications/${applicationId}`, { state: prediction.data });
    } catch (err) {
      setError(err.response?.data?.error || "Could not submit loan application.");
    } finally {
      setLoading(false);
    }
  };

  const fieldControl = (field) => {
    if (optionSets[field]) {
      return <select value={form[field]} onChange={(e) => setValue(field, e.target.value)} className="ci-input mt-2">{optionSets[field].map((option) => <option key={option} value={option}>{displayValue(field, option)}</option>)}</select>;
    }
    const ranges = { age: [18, 75, 1], num_dependents: [1, 2, 1], existing_credits: [1, 4, 1], installment_rate: [1, 4, 1], residence_since: [1, 4, 1], duration: [6, 72, 1], credit_amount: [250, 18424, 100] };
    const [min, max, stepSize] = ranges[field] || [0, 100, 1];
    return (
      <div className="mt-2 rounded-lg border border-[#E5E5E5] bg-white p-3">
        <input type="range" min={min} max={max} step={stepSize} value={form[field]} onChange={(e) => setValue(field, Number(e.target.value))} className="w-full accent-[#111111]" />
        <p className="mt-1 text-sm font-semibold text-[#111111]">{field === "credit_amount" ? money(form[field]) : form[field]}</p>
      </div>
    );
  };

  const allFields = steps.slice(0, 3).flatMap((item) => item.fields);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="ci-page-title">New application</h1>
        <p className="mt-1 text-sm text-[#737373]">Complete borrower details, review inputs, then generate the model decision.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          {steps.map((item, index) => (
            <div key={item.title} className={`rounded-lg border px-3 py-2 text-sm ${index === step ? "border-[#111111] bg-white text-[#111111]" : "border-[#E5E5E5] bg-[#FFFCF7] text-[#737373]"}`}>
              <span className="text-xs text-[#A3A3A3]">Step {index + 1}</span>
              <p className="font-medium">{item.title}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="ci-panel p-6">
        {step < 3 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {current.fields.map((field) => <label key={field} className="text-sm font-semibold text-[#404040]">{FEATURE_LABELS[field]}{fieldControl(field)}</label>)}
          </div>
        ) : (
          <div>
            <h2 className="text-base font-semibold text-[#111111]">Review application</h2>
            <p className="mt-1 text-sm text-[#737373]">Check the values before sending them to the LR/RF prediction service.</p>
            <div className="mt-5 grid gap-x-8 md:grid-cols-2">
              {allFields.map((field) => (
                <div key={field} className="flex items-center justify-between border-b border-[#F7F5F0] py-3 text-sm">
                  <span className="text-[#737373]">{FEATURE_LABELS[field]}</span>
                  <span className="font-medium text-[#111111]">{field === "credit_amount" ? money(form[field]) : displayValue(field, form[field])}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <p className="mt-4 rounded-lg border border-[#D4D4D4] bg-[#FFFCF7] p-3 text-sm font-semibold text-[#111111]">{error}</p>}
        <div className="mt-6 flex justify-between">
          <button disabled={step === 0} onClick={() => setStep((value) => value - 1)} className="ci-button-secondary disabled:opacity-40">Previous</button>
          {step < 3 ? <button onClick={() => setStep((value) => value + 1)} className="ci-button">Next</button> : <button onClick={submit} disabled={loading} className="ci-button disabled:opacity-60">{loading ? "Submitting..." : "Submit application"}</button>}
        </div>
      </section>
    </div>
  );
}


