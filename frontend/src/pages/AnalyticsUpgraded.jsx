import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api, setAuthToken } from "../api";
import { FEATURE_LABELS, percent } from "../creditFeatures";

const tabs = ["Model Performance", "ROC Curves", "Confusion Matrices", "Feature Importance"];
const metricKeys = ["accuracy", "precision", "recall", "f1", "roc_auc"];
const metricLabels = { accuracy: "Accuracy", precision: "Precision", recall: "Recall", f1: "F1-Score", roc_auc: "ROC-AUC" };

export default function AnalyticsUpgraded() {
  const [active, setActive] = useState(tabs[0]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);
    api.get("/ml/metrics")
      .then((res) => {
        setMetrics(res.data);
        setError("");
      })
      .catch(() => {
        setMetrics(null);
        setError("Could not load live model metrics. Showing bundled fallback metrics.");
      })
      .finally(() => setLoading(false));
  }, []);

  const fallback = {
    lr: { accuracy: 0.765, precision: 0.627, recall: 0.533, f1: 0.577, roc_auc: 0.79, confusion_matrix: [[121, 19], [28, 32]], coefficients: {} },
    rf: { accuracy: 0.775, precision: 0.703, recall: 0.433, f1: 0.536, roc_auc: 0.78, confusion_matrix: [[129, 11], [34, 26]], feature_importances: {} },
    roc_curves: { lr: { fpr: [0, 0.12, 0.35, 1], tpr: [0, 0.45, 0.76, 1] }, rf: { fpr: [0, 0.1, 0.32, 1], tpr: [0, 0.4, 0.78, 1] } },
  };
  const data = metrics || fallback;

  const radarData = metricKeys.map((key) => ({ metric: metricLabels[key], lr: Number(data.lr?.[key] || 0) * 100, rf: Number(data.rf?.[key] || 0) * 100 }));
  const rocData = useMemo(() => {
    const lr = data.roc_curves?.lr || fallback.roc_curves.lr;
    const rf = data.roc_curves?.rf || fallback.roc_curves.rf;
    const max = Math.max(lr.fpr.length, rf.fpr.length);
    return Array.from({ length: max }).map((_, index) => ({
      fpr: lr.fpr[index] ?? rf.fpr[index] ?? 0,
      lr: lr.tpr[index] ?? null,
      rf: rf.tpr[index] ?? null,
      baseline: lr.fpr[index] ?? rf.fpr[index] ?? 0,
    }));
  }, [data]);

  const rfFeatures = Object.entries(data.rf?.feature_importances || {}).slice(0, 10).map(([feature, value]) => ({ feature: FEATURE_LABELS[feature] || feature, value }));
  const lrFeatures = Object.entries(data.lr?.coefficients || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 10).map(([feature, value]) => ({ feature: FEATURE_LABELS[feature] || feature, value }));

  const matrix = (title, values) => {
    const [[tn, fp], [fn, tp]] = values || [[0, 0], [0, 0]];
    return (
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-5">
        <h3 className="font-semibold text-[#111111]">{title}</h3>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[["TN", tn, "bg-[#F7F5F0] text-[#111111]"], ["FP", fp, "bg-[#FFFCF7] text-[#111111]"], ["FN", fn, "bg-[#FFFCF7] text-[#111111]"], ["TP", tp, "bg-[#F7F5F0] text-[#111111]"]].map(([label, value, cls]) => (
            <div key={label} className={`rounded-lg p-5 text-center ${cls}`}>
              <p className="text-xs font-semibold">{label}</p>
              <p className="text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-[#737373]">Correctly identified {tp} out of {tp + fn} defaulters.</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#111111]">Research Analytics</h1>
        <p className="mt-1 text-sm text-[#737373]">Model performance, ROC curves, confusion matrices, and explainability signals.</p>
      </div>
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-72 animate-pulse rounded-lg bg-[#F7F5F0]" />
          <div className="h-72 animate-pulse rounded-lg bg-[#F7F5F0]" />
        </div>
      )}
      {!loading && error && <div className="rounded-lg border border-[#D4D4D4] bg-[#FFFCF7] p-3 text-sm text-[#404040]">{error}</div>}
      {!loading && (
      <>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => <button key={tab} onClick={() => setActive(tab)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active === tab ? "bg-[#111111] text-white" : "bg-white text-[#525252] border border-[#E5E5E5]"}`}>{tab}</button>)}
      </div>

      {active === "Model Performance" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#FFFCF7] text-left text-[#737373]"><tr><th className="p-3">Metric</th><th>Logistic Regression</th><th>Random Forest</th></tr></thead>
              <tbody>
                {metricKeys.map((key, index) => {
                  const lr = Number(data.lr?.[key] || 0);
                  const rf = Number(data.rf?.[key] || 0);
                  return <tr key={key} className={index % 2 ? "bg-[#FFFCF7]" : "bg-white"}><td className="p-3 font-semibold">{metricLabels[key]}</td><td className={lr >= rf ? "font-semibold text-[#111111]" : ""}>{key === "roc_auc" ? lr.toFixed(3) : percent(lr)}</td><td className={rf > lr ? "font-semibold text-[#111111]" : ""}>{key === "roc_auc" ? rf.toFixed(3) : percent(rf)}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-[#E5E5E5] bg-white p-5">
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid /><PolarAngleAxis dataKey="metric" /><PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="LR" dataKey="lr" stroke="#2563EB" fill="#2563EB" fillOpacity={0.25} />
                <Radar name="RF" dataKey="rf" stroke="#F97316" fill="#F97316" fillOpacity={0.25} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {active === "ROC Curves" && <div className="rounded-lg border border-[#E5E5E5] bg-white p-5"><ResponsiveContainer width="100%" height={420}><LineChart data={rocData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="fpr" domain={[0, 1]} /><YAxis domain={[0, 1]} /><Tooltip /><Legend /><Line name={`LR (AUC = ${Number(data.lr?.roc_auc || 0).toFixed(2)})`} dataKey="lr" stroke="#2563EB" strokeWidth={3} dot={false} /><Line name={`RF (AUC = ${Number(data.rf?.roc_auc || 0).toFixed(2)})`} dataKey="rf" stroke="#F97316" strokeWidth={3} dot={false} /><Line name="No skill baseline" dataKey="baseline" stroke="#9ca3af" strokeDasharray="5 5" dot={false} /></LineChart></ResponsiveContainer></div>}

      {active === "Confusion Matrices" && <div className="grid gap-6 lg:grid-cols-2">{matrix("Logistic Regression", data.lr?.confusion_matrix || fallback.lr.confusion_matrix)}{matrix("Random Forest", data.rf?.confusion_matrix || fallback.rf.confusion_matrix)}</div>}

      {active === "Feature Importance" && <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5"><h3 className="font-semibold">Random Forest - Feature Importance</h3><ResponsiveContainer width="100%" height={360}><BarChart data={rfFeatures} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="feature" width={150} /><Tooltip /><Bar dataKey="value" fill="#2563EB" /></BarChart></ResponsiveContainer></div>
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5"><h3 className="font-semibold">Logistic Regression - Coefficients</h3><ResponsiveContainer width="100%" height={360}><BarChart data={lrFeatures} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="feature" width={150} /><Tooltip /><Bar dataKey="value">{lrFeatures.map((item) => <Cell key={item.feature} fill={item.value >= 0 ? "#D4D4D4" : "#F97316"} />)}</Bar></BarChart></ResponsiveContainer></div>
      </div>}
      </>
      )}
    </div>
  );
}




