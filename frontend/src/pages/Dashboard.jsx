import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, FilePlus2, LineChart, PlayCircle } from "lucide-react";

import { api, setAuthToken } from "../api";
import { displayValue, money, percent } from "../creditFeatures";
import Badge from "../components/ui/Badge";
import SHAPChart from "../components/ui/SHAPChart";

function MetricCard({ label, value }) {
  return (
    <div className="rounded-lg border border-[#E5E5E5] bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#737373]">{label}</p>
      <p className="mt-2 text-[24px] font-medium text-[#111111]">{value}</p>
    </div>
  );
}

function ModelCard({ result, primary }) {
  return (
    <div className={`rounded-lg border bg-white p-4 ${primary ? "border-[#D4D4D4]" : "border-[#E5E5E5]"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-[#111111]">{result?.model_name || "Model"}</p>
        <Badge tone={result?.decision === "approved" ? "approved" : result?.decision === "rejected" ? "rejected" : "pending"}>{result?.decision || "pending"}</Badge>
      </div>
      <p className="mt-4 text-[24px] font-medium text-[#111111]">{percent(result?.confidence || 0)}</p>
      <p className="mt-1 text-[11px] text-[#737373]">Confidence</p>
      <div className="mt-3 h-2 rounded-full bg-[#F7F5F0]">
        <div className="h-full rounded-full bg-[#111111]" style={{ width: percent(result?.good_probability || 0) }} />
      </div>
      <p className="mt-1 text-[11px] text-[#737373]">Approval probability {percent(result?.good_probability || 0)}</p>
    </div>
  );
}

function normalizeApplicationDecision(item) {
  if (!item) return null;
  return {
    final_decision: item.final_decision,
    consensus: item.consensus,
    lr: {
      model_name: "Logistic Regression",
      decision: item.lr_decision,
      confidence: item.lr_confidence,
      good_probability: item.lr_good_prob,
      bad_probability: item.lr_bad_prob,
      shap_reasons: item.lr_shap_reasons || [],
    },
    rf: {
      model_name: "Random Forest",
      decision: item.rf_decision,
      confidence: item.rf_confidence,
      good_probability: item.rf_good_prob,
      bad_probability: item.rf_bad_prob,
      shap_reasons: item.rf_shap_reasons || [],
    },
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({});
  const [latestDecision, setLatestDecision] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);

    async function load() {
      try {
        const dashboard = await api.get("/dashboard");
        const dashboardData = dashboard.data || {};
        setData(dashboardData);
        setLoading(false);

        const latest = dashboardData.recent_applications?.[0];
        if (latest?.id) {
          api.get(`/ml/applications/${latest.id}`)
            .then((decision) => setLatestDecision(normalizeApplicationDecision(decision.data)))
            .catch(() => setLatestDecision(null));
        }
      } catch {
        setData({});
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-md bg-[#F7F5F0]" />
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg bg-[#F7F5F0]" />)}</div>
        <div className="h-80 animate-pulse rounded-lg bg-[#F7F5F0]" />
      </div>
    );
  }

  const recent = data?.recent_applications || [];
  const actions = [
    { label: "New application", description: "Submit a borrower profile", icon: FilePlus2, to: "/applications/new" },
    { label: "Run simulation", description: "Test loan what-if changes", icon: PlayCircle, to: "/simulation" },
    { label: "View analytics", description: "Compare model performance", icon: LineChart, to: "/analytics" },
    { label: "Ask advisor", description: "Get credit guidance", icon: Bot, to: "/assistant" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <div className="border-b border-[#E5E5E5] pb-5">
          <div>
            <h1 className="ci-page-title">Dashboard</h1>
            <p className="mt-1 text-[13px] text-[#737373]">Credit risk decisions, model explainability, and application activity.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total applications" value={data?.total_applications || 0} />
        <MetricCard label="Approved" value={data?.approved || 0} />
        <MetricCard label="Approval rate" value={`${data?.approval_rate || 0}%`} />
        <MetricCard label="RF accuracy" value={`${Math.round((data?.model_accuracy || 0.775) * 1000) / 10}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="ci-panel lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="ci-section-title">Latest model decision</h2>
            {latestDecision?.final_decision && <Badge tone={latestDecision.final_decision === "approved" ? "approved" : "rejected"}>{latestDecision.final_decision}</Badge>}
          </div>
          {latestDecision ? (
            <>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ModelCard result={latestDecision.lr} />
                <ModelCard result={latestDecision.rf} primary />
              </div>
              <div className="mt-5">
                <p className="mb-3 text-[13px] font-medium text-[#111111]">Random Forest explanation</p>
                <SHAPChart features={latestDecision.rf?.shap_reasons || []} />
                <p className="mt-3 text-[11px] text-[#737373]">Dark bars indicate risk pressure. Grey bars indicate approval support.</p>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-lg bg-[#F7F5F0] p-5 text-[13px] text-[#737373]">Submit a loan application to see LR/RF outputs and SHAP factors here.</div>
          )}
        </section>

        <section className="ci-panel lg:col-span-2">
          <h2 className="ci-section-title">Recent applications</h2>
          <div className="mt-4 space-y-2">
            {recent.length ? recent.map((item) => (
              <button key={item.id} onClick={() => navigate(`/applications/${item.id}`)} className="flex w-full items-center justify-between rounded-lg border border-[#E5E5E5] p-3 text-left hover:bg-[#F7F5F0]">
                <div>
                  <p className="text-[13px] font-medium text-[#111111]">Application #{item.id}</p>
                  <p className="text-[11px] text-[#737373]">{money(item.amount)} · {displayValue("purpose", item.purpose)}</p>
                </div>
                <Badge tone={item.status === "approved" ? "approved" : item.status === "rejected" ? "rejected" : "pending"}>{item.status}</Badge>
              </button>
            )) : <p className="rounded-lg bg-[#F7F5F0] p-4 text-[13px] text-[#737373]">No loan applications yet.</p>}
          </div>
        </section>
      </div>

      <section className="ci-panel">
        <h2 className="ci-section-title">Quick actions</h2>
        <div className="mt-3 divide-y divide-[#F2F0EA]">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button key={action.to} onClick={() => navigate(action.to)} className="group flex w-full items-center gap-3 py-3 text-left transition hover:bg-[#FFFDF9]">
                <Icon className="h-4 w-4 shrink-0 text-[#737373]" />
                <span>
                  <span className="block text-[13px] font-medium text-[#111111]">{action.label}</span>
                  <span className="mt-1 block text-[12px] leading-5 text-[#737373]">{action.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}



