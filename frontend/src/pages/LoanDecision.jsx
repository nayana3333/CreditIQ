import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle, MessageSquare, Sliders } from "lucide-react";

import { api, setAuthToken } from "../api";
import { FEATURE_LABELS, displayValue, money, percent } from "../creditFeatures";
import Badge from "../components/ui/Badge";
import SHAPChart from "../components/ui/SHAPChart";

function ModelCard({ result, primary }) {
  return (
    <div className={`rounded-lg border bg-white p-4 ${primary ? "border-[#D4D4D4]" : "border-[#E5E5E5]"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-[#111111]">{result?.model_name}</p>
        <Badge tone={result?.decision === "approved" ? "approved" : "rejected"}>{result?.decision}</Badge>
      </div>
      <p className="mt-4 text-[32px] font-semibold text-[#111111]">{percent(result?.confidence || 0)}</p>
      <p className="text-[11px] text-[#737373]">Confidence</p>
      <div className="mt-4 grid gap-2">
        <div>
          <div className="mb-1 flex justify-between text-[11px] text-[#737373]"><span>Good probability</span><span>{percent(result?.good_probability || 0)}</span></div>
          <div className="h-2 rounded-full bg-[#F7F5F0]"><div className="h-full rounded-full bg-[#A3A3A3]" style={{ width: percent(result?.good_probability || 0) }} /></div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[11px] text-[#737373]"><span>Bad probability</span><span>{percent(result?.bad_probability || 0)}</span></div>
          <div className="h-2 rounded-full bg-[#F7F5F0]"><div className="h-full rounded-full bg-[#111111]" style={{ width: percent(result?.bad_probability || 0) }} /></div>
        </div>
      </div>
    </div>
  );
}

function normalizeApplication(item) {
  const inputKeys = [
    "checking_status",
    "duration",
    "credit_history",
    "purpose",
    "credit_amount",
    "savings_status",
    "employment",
    "installment_rate",
    "personal_status",
    "other_parties",
    "residence_since",
    "property_magnitude",
    "age",
    "other_payment_plans",
    "housing",
    "existing_credits",
    "job",
    "num_dependents",
    "own_telephone",
    "foreign_worker",
  ];
  const inputSummary = Object.fromEntries(inputKeys.map((key) => [key, item[key]]));
  return {
    application_id: item.id,
    created_at: item.created_at,
    final_decision: item.final_decision,
    consensus: item.consensus,
    input_summary: inputSummary,
    lr: {
      decision: item.lr_decision,
      confidence: item.lr_confidence,
      good_probability: item.lr_good_prob,
      bad_probability: item.lr_bad_prob,
      shap_reasons: item.lr_shap_reasons || [],
      model_name: "Logistic Regression",
    },
    rf: {
      decision: item.rf_decision,
      confidence: item.rf_confidence,
      good_probability: item.rf_good_prob,
      bad_probability: item.rf_bad_prob,
      shap_reasons: item.rf_shap_reasons || [],
      model_name: "Random Forest",
    },
  };
}

function formatSummaryValue(key, value) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (key === "credit_amount") return money(value);
  if (key === "duration") return `${value} months`;
  return displayValue(key, value);
}

export default function LoanDecision() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(location.state?.decision || location.state || null);
  const [loading, setLoading] = useState(Boolean(id) && !(location.state?.decision || location.state));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);
    setLoading(true);
    setError("");
    if (location.pathname.startsWith("/applications")) {
      api.get(`/ml/applications/${id}`)
        .then((res) => setData(normalizeApplication(res.data)))
        .catch(() => setError("Could not load this application report. Please return to Applications and open it again."))
        .finally(() => setLoading(false));
      return;
    }
    api.get(`/loans/${id}/decision`)
      .then((res) => setData(res.data))
      .catch(() => {
        const cached = localStorage.getItem(`loan_decision_${id}`);
        if (cached) {
          setData(JSON.parse(cached));
        } else {
          setError("Could not load this loan decision report.");
        }
      })
      .finally(() => setLoading(false));
  }, [id, location.pathname]);

  if (loading) return <div className="ci-panel text-[13px] text-[#737373]">Loading decision report...</div>;
  if (!data) {
    return (
      <div className="ci-panel">
        <p className="text-[13px] text-[#111111]">{error || "Decision report is unavailable."}</p>
        <button onClick={() => navigate("/applications")} className="ci-button-secondary mt-4">
          <ArrowLeft className="h-[15px] w-[15px]" />Back to applications
        </button>
      </div>
    );
  }

  const final = data.final_decision || "pending";
  const approved = final === "approved";
  const input = data.input_summary || {};
  const negativeFactors = (data.rf?.shap_reasons || []).filter((item) => item.direction === "negative").slice(0, 3);

  const openAdvisor = () => {
    if (id) localStorage.setItem("creditiq_context_loan_id", id);
    navigate(`/assistant${id ? `?application_id=${id}` : ""}`);
  };

  const openSimulation = () => {
    localStorage.setItem("creditiq_simulation_input", JSON.stringify(input));
    navigate("/simulation");
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="ci-page-title">Loan decision report</h1>
          <p className="mt-1 text-[13px] text-[#737373]">Application #{id || data.application_id || "new"} | {new Date(data.created_at || Date.now()).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={data.consensus ? "info" : "pending"}>{data.consensus ? "Both models agree" : "Models disagree"}</Badge>
          <Badge tone={approved ? "approved" : "rejected"}>{final}</Badge>
        </div>
      </header>

      <div className={`rounded-lg border p-5 ${approved ? "border-[#D4D4D4] bg-[#F7F5F0] text-[#111111]" : "border-[#D4D4D4] bg-[#FFFCF7] text-[#111111]"}`}>
        <div className="flex items-center gap-3">
          {approved ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <p className="text-[32px] font-semibold">{approved ? "Approved" : "Rejected"}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <main className="space-y-6 lg:col-span-3">
          <section className="ci-panel">
            <h2 className="ci-section-title">Model comparison</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ModelCard result={data.lr} />
              <ModelCard result={data.rf} primary />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="ci-panel">
              <h2 className="ci-section-title">Logistic Regression explanation</h2>
              <div className="mt-4"><SHAPChart features={data.lr?.shap_reasons || []} /></div>
              <p className="mt-3 text-[11px] text-[#737373]">Dark bars indicate risk pressure. Grey bars indicate approval support.</p>
            </div>
            <div className="ci-panel">
              <h2 className="ci-section-title">Random Forest explanation</h2>
              <div className="mt-4"><SHAPChart features={data.rf?.shap_reasons || []} /></div>
              <p className="mt-3 text-[11px] text-[#737373]">Dark bars indicate risk pressure. Grey bars indicate approval support.</p>
            </div>
          </section>
        </main>

        <aside className="space-y-6 lg:col-span-2">
          <section className="ci-panel">
            <h2 className="ci-section-title">Application summary</h2>
            <div className="mt-3 divide-y divide-[#F7F5F0]">
              {Object.entries(input).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-4 py-2 text-[13px]">
                  <span className="text-[#737373]">{FEATURE_LABELS[key] || key}</span>
                  <span className="text-right font-medium text-[#111111]">{formatSummaryValue(key, value)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="ci-panel">
            <h2 className="ci-section-title">Risk actions</h2>
            {approved ? (
              <div className="mt-4 flex gap-3 text-[13px] text-[#111111]">
                <CheckCircle className="mt-0.5 h-4 w-4" />
                <p>Your application meets the credit criteria. Keep repayment commitments on time and avoid new debt before disbursement.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {(negativeFactors.length ? negativeFactors : [{ label: "Loan Amount" }, { label: "Account Balance" }, { label: "Credit History" }]).map((item) => (
                  <div key={item.feature || item.label} className="flex gap-3 text-[13px] text-[#111111]">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-[#404040]" />
                    <p>Improve {item.label || FEATURE_LABELS[item.feature] || item.feature} before reapplying.</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={() => navigate("/applications")} className="ci-button-secondary"><ArrowLeft className="h-[15px] w-[15px]" />Back to applications</button>
        <button onClick={openSimulation} className="ci-button"><Sliders className="h-[15px] w-[15px]" />Run what-if simulation</button>
        <button onClick={openAdvisor} className="ci-button"><MessageSquare className="h-[15px] w-[15px]" />Ask AI advisor</button>
      </div>
    </div>
  );
}




