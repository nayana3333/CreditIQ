import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api, setAuthToken } from "../api";
import { FEATURE_LABELS, percent } from "../creditFeatures";

const tabs = ["Model Performance", "ROC Curves", "Confusion Matrices", "Feature Importance", "Business Impact"];
const metricKeys = ["accuracy", "precision", "recall", "f1", "roc_auc"];
const metricLabels = { accuracy: "Accuracy", precision: "Precision", recall: "Recall", f1: "F1-Score", roc_auc: "ROC-AUC" };
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function Analytics() {
  const [active, setActive] = useState(tabs[0]);
  const [metrics, setMetrics] = useState(null);
  const [impact, setImpact] = useState(null);
  const [selectedThreshold, setSelectedThreshold] = useState(0.4);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState("");
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

  useEffect(() => {
    if (active !== "Business Impact") return;
    setImpactLoading(true);
    api.get(`/ml/business-impact?threshold=${selectedThreshold}`)
      .then((res) => {
        setImpact(res.data);
        setImpactError("");
      })
      .catch(() => setImpactError("Could not load business impact analysis."))
      .finally(() => setImpactLoading(false));
  }, [active, selectedThreshold]);

  const fallback = {
    lr: { accuracy: 0.765, precision: 0.627, recall: 0.533, f1: 0.577, roc_auc: 0.79, confusion_matrix: [[121, 19], [28, 32]], coefficients: {} },
    rf: { accuracy: 0.775, precision: 0.703, recall: 0.433, f1: 0.536, roc_auc: 0.78, confusion_matrix: [[129, 11], [34, 26]], feature_importances: {} },
    xgb: { accuracy: 0.75, precision: 0.593, recall: 0.533, f1: 0.561, roc_auc: 0.78, confusion_matrix: [[122, 18], [28, 32]], feature_importances: {} },
    roc_curves: { lr: { fpr: [0, 0.12, 0.35, 1], tpr: [0, 0.45, 0.76, 1] }, rf: { fpr: [0, 0.1, 0.32, 1], tpr: [0, 0.4, 0.78, 1] }, xgb: { fpr: [0, 0.14, 0.38, 1], tpr: [0, 0.42, 0.72, 1] } },
  };
  const data = metrics || fallback;
  const hasXgb = Boolean(data.xgb);

  const radarData = metricKeys.map((key) => ({ metric: metricLabels[key], lr: Number(data.lr?.[key] || 0) * 100, rf: Number(data.rf?.[key] || 0) * 100, xgb: Number(data.xgb?.[key] || 0) * 100 }));
  const rocData = useMemo(() => {
    const lr = data.roc_curves?.lr || fallback.roc_curves.lr;
    const rf = data.roc_curves?.rf || fallback.roc_curves.rf;
    const xgb = data.roc_curves?.xgb;
    const max = Math.max(lr.fpr.length, rf.fpr.length, xgb?.fpr.length || 0);
    return Array.from({ length: max }).map((_, index) => ({
      fpr: lr.fpr[index] ?? rf.fpr[index] ?? xgb?.fpr[index] ?? 0,
      lr: lr.tpr[index] ?? null,
      rf: rf.tpr[index] ?? null,
      xgb: xgb ? xgb.tpr[index] ?? null : null,
      baseline: lr.fpr[index] ?? rf.fpr[index] ?? 0,
    }));
  }, [data]);

  const rfFeatures = Object.entries(data.rf?.feature_importances || {}).slice(0, 10).map(([feature, value]) => ({ feature: FEATURE_LABELS[feature] || feature, value }));
  const lrFeatures = Object.entries(data.lr?.coefficients || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 10).map(([feature, value]) => ({ feature: FEATURE_LABELS[feature] || feature, value }));
  const thresholdCurve = (impact?.threshold_curve || []).map((item) => ({
    ...item,
    thresholdLabel: Number(item.threshold).toFixed(1),
    totalCostLakhs: Number(item.total_estimated_cost || 0) / 100000,
  }));

  const scenarioBadge = (scenario) => {
    if (scenario.model === "Random Forest") return "Random Forest";
    if (scenario.model === "Logistic Regression") return "Logistic Regression";
    return "Balanced";
  };

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
              <thead className="bg-[#FFFCF7] text-left text-[#737373]"><tr><th className="p-3">Metric</th><th>Logistic Regression</th><th>Random Forest</th>{hasXgb && <th>XGBoost (benchmark)</th>}</tr></thead>
              <tbody>
                {metricKeys.map((key, index) => {
                  const lr = Number(data.lr?.[key] || 0);
                  const rf = Number(data.rf?.[key] || 0);
                  const xgb = Number(data.xgb?.[key] || 0);
                  const best = Math.max(lr, rf, hasXgb ? xgb : 0);
                  return (
                    <tr key={key} className={index % 2 ? "bg-[#FFFCF7]" : "bg-white"}>
                      <td className="p-3 font-semibold">{metricLabels[key]}</td>
                      <td className={lr === best ? "font-semibold text-[#111111]" : ""}>{key === "roc_auc" ? lr.toFixed(3) : percent(lr)}</td>
                      <td className={rf === best ? "font-semibold text-[#111111]" : ""}>{key === "roc_auc" ? rf.toFixed(3) : percent(rf)}</td>
                      {hasXgb && <td className={xgb === best ? "font-semibold text-[#111111]" : ""}>{key === "roc_auc" ? xgb.toFixed(3) : percent(xgb)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {hasXgb && <p className="border-t border-[#F7F5F0] p-3 text-xs text-[#737373]">XGBoost is trained as a benchmark comparison only - Random Forest remains the production model used for live decisions.</p>}
          </div>
          <div className="rounded-lg border border-[#E5E5E5] bg-white p-5">
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid /><PolarAngleAxis dataKey="metric" /><PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="LR" dataKey="lr" stroke="#2563EB" fill="#2563EB" fillOpacity={0.25} />
                <Radar name="RF" dataKey="rf" stroke="#F97316" fill="#F97316" fillOpacity={0.25} />
                {hasXgb && <Radar name="XGB" dataKey="xgb" stroke="#16A34A" fill="#16A34A" fillOpacity={0.15} />}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {active === "ROC Curves" && <div className="rounded-lg border border-[#E5E5E5] bg-white p-5"><ResponsiveContainer width="100%" height={420}><LineChart data={rocData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="fpr" domain={[0, 1]} /><YAxis domain={[0, 1]} /><Tooltip /><Legend /><Line name={`LR (AUC = ${Number(data.lr?.roc_auc || 0).toFixed(2)})`} dataKey="lr" stroke="#2563EB" strokeWidth={3} dot={false} /><Line name={`RF (AUC = ${Number(data.rf?.roc_auc || 0).toFixed(2)})`} dataKey="rf" stroke="#F97316" strokeWidth={3} dot={false} />{hasXgb && <Line name={`XGB (AUC = ${Number(data.xgb?.roc_auc || 0).toFixed(2)})`} dataKey="xgb" stroke="#16A34A" strokeWidth={3} dot={false} />}<Line name="No skill baseline" dataKey="baseline" stroke="#9ca3af" strokeDasharray="5 5" dot={false} /></LineChart></ResponsiveContainer></div>}

      {active === "Confusion Matrices" && <div className={`grid gap-6 ${hasXgb ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>{matrix("Logistic Regression", data.lr?.confusion_matrix || fallback.lr.confusion_matrix)}{matrix("Random Forest", data.rf?.confusion_matrix || fallback.rf.confusion_matrix)}{hasXgb && matrix("XGBoost (benchmark)", data.xgb?.confusion_matrix)}</div>}

      {active === "Feature Importance" && <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5"><h3 className="font-semibold">Random Forest - Feature Importance</h3><ResponsiveContainer width="100%" height={360}><BarChart data={rfFeatures} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="feature" width={150} /><Tooltip /><Bar dataKey="value" fill="#2563EB" /></BarChart></ResponsiveContainer></div>
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5"><h3 className="font-semibold">Logistic Regression - Coefficients</h3><ResponsiveContainer width="100%" height={360}><BarChart data={lrFeatures} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="feature" width={150} /><Tooltip /><Bar dataKey="value">{lrFeatures.map((item) => <Cell key={item.feature} fill={item.value >= 0 ? "#D4D4D4" : "#F97316"} />)}</Bar></BarChart></ResponsiveContainer></div>
      </div>}

      {active === "Business Impact" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-[#111111]">Business impact analysis</h2>
            <p className="mt-1 text-sm text-[#737373]">Translating model error rates into estimated financial cost for a 200-applicant portfolio</p>
          </div>

          {impactLoading && <div className="h-64 animate-pulse rounded-lg bg-[#F7F5F0]" />}
          {impactError && <div className="rounded-lg border border-[#D4D4D4] bg-white p-3 text-sm text-[#404040]">{impactError}</div>}
          {impact && (
            <>
              <section className="grid gap-4 lg:grid-cols-4">
                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">Recommended model</p>
                  <p className="mt-3 text-lg font-semibold text-[#111111]">{impact.executive_summary?.recommended_model}</p>
                  <p className="mt-2 text-xs leading-5 text-[#737373]">Best when the business cost of missed defaults is higher than customer rejection cost.</p>
                </div>
                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">Recommended threshold</p>
                  <p className="mt-3 text-2xl font-semibold text-[#111111]">{Number(impact.executive_summary?.recommended_threshold || 0).toFixed(1)}</p>
                  <p className="mt-2 text-xs leading-5 text-[#737373]">Tuned for minimum estimated portfolio cost.</p>
                </div>
                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">Lowest estimated cost</p>
                  <p className="mt-3 text-2xl font-semibold text-[#111111]">{money(impact.executive_summary?.lowest_estimated_cost)}</p>
                  <p className="mt-2 text-xs leading-5 text-[#737373]">For the 200-applicant validation portfolio.</p>
                </div>
                <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">Decision framing</p>
                  <p className="mt-3 text-sm font-medium leading-6 text-[#111111]">{impact.executive_summary?.business_policy}</p>
                </div>
              </section>

              <section className="rounded-lg bg-[#F3F4F6] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">Assumptions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#E5E5E5] bg-white px-3 py-1 text-xs font-medium text-[#111111]">Avg loan: {money(impact.assumptions?.avg_loan_amount_inr)}</span>
                  <span className="rounded-full border border-[#E5E5E5] bg-white px-3 py-1 text-xs font-medium text-[#111111]">Missed default cost: {money(impact.assumptions?.fn_cost_per_case_inr)}/case</span>
                  <span className="rounded-full border border-[#E5E5E5] bg-white px-3 py-1 text-xs font-medium text-[#111111]">Rejected good customer: {money(impact.assumptions?.fp_cost_per_case_inr)}/case</span>
                </div>
                <p className="mt-3 text-xs italic text-[#9CA3AF]">{impact.assumptions?.note}</p>
              </section>

              <section className="rounded-xl border border-[#E5E5E5] bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">Threshold tuning</p>
                    <h3 className="mt-2 text-lg font-semibold text-[#111111]">Approval threshold: {selectedThreshold.toFixed(1)}</h3>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-[#737373]">Move the threshold to see how false approvals, rejected good customers, approval rate, and business cost trade off.</p>
                  </div>
                  <div className="w-full lg:w-72">
                    <input
                      aria-label="Approval threshold"
                      className="w-full accent-[#111111]"
                      max="0.7"
                      min="0.3"
                      step="0.1"
                      type="range"
                      value={selectedThreshold}
                      onChange={(event) => setSelectedThreshold(Number(event.target.value))}
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-[#737373]">
                      <span>Risk control</span>
                      <span>Growth</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="h-72 rounded-lg border border-[#E5E5E5] p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={thresholdCurve}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                        <XAxis dataKey="thresholdLabel" />
                        <YAxis tickFormatter={(value) => `${value.toFixed(1)}L`} />
                        <Tooltip formatter={(value) => [`₹${Number(value * 100000).toLocaleString("en-IN")}`, "Estimated cost"]} />
                        <Line name="Estimated cost" dataKey="totalCostLakhs" stroke="#111111" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="rounded-lg border border-[#E5E5E5] bg-[#FFFCF7] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">Selected policy</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-4"><span className="text-[#737373]">Positioning</span><span className="font-semibold text-[#111111]">{impact.selected_threshold?.positioning}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-[#737373]">Approval rate</span><span className="font-semibold text-[#111111]">{Number(impact.selected_threshold?.approval_rate || 0).toFixed(1)}%</span></div>
                      <div className="flex justify-between gap-4"><span className="text-[#737373]">Missed defaults</span><span className="font-semibold text-[#111111]">{impact.selected_threshold?.fn}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-[#737373]">Rejected good customers</span><span className="font-semibold text-[#111111]">{impact.selected_threshold?.fp}</span></div>
                      <div className="border-t border-[#E5E5E5] pt-3">
                        <div className="flex justify-between gap-4"><span className="font-medium text-[#111111]">Estimated cost</span><span className="font-semibold text-[#111111]">{money(impact.selected_threshold?.total_estimated_cost)}</span></div>
                      </div>
                    </div>
                    <p className="mt-4 text-xs italic leading-5 text-[#737373]">{impact.executive_summary?.risk_appetite_note}</p>
                  </div>
                </div>
              </section>

              <div className="grid gap-4 lg:grid-cols-3">
                {(impact.scenarios || []).map((scenario) => {
                  const highlighted = scenario.name === "Inclusive (LR)";
                  return (
                    <article key={scenario.name} className={`rounded-xl border p-4 ${highlighted ? "border-[#A3A3A3] bg-[#F7F5F0]" : "border-[#E5E5E5] bg-white"}`}>
                      <span className="inline-flex rounded-full border border-[#E5E5E5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#404040]">{scenarioBadge(scenario)}</span>
                      <h3 className="mt-4 text-base font-semibold text-[#111111]">{scenario.name}</h3>
                      <p className="mt-1 min-h-10 text-sm text-[#737373]">{scenario.description}</p>
                      <div className="mt-5 space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#737373]">False approval cost</span>
                          <span className="font-semibold text-[#A32D2D]">{money(scenario.cost_false_negatives)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#737373]">Rejected good customers</span>
                          <span className="font-semibold text-[#854F0B]">{money(scenario.cost_false_positives)}</span>
                        </div>
                        <div className="border-t border-[#E5E5E5] pt-3">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-medium text-[#111111]">Total estimated cost</span>
                            <span className="text-sm font-semibold text-[#111111]">{money(scenario.total_estimated_cost)}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <section className="border-l-4 border-[#111111] bg-[#F8F9FA] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#111111]">Key insight</p>
                <p className="mt-2 text-sm leading-6 text-[#111111]">{impact.insight}</p>
                <p className="mt-3 text-xs italic text-[#6B7280]">The choice between models is a business decision, not just a technical one - it depends on the bank's tolerance for credit losses versus customer relationship costs.</p>
              </section>
            </>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}




