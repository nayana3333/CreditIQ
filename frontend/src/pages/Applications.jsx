import { useEffect, useMemo, useState } from "react";
import { Eye, FileText, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { api, setAuthToken } from "../api";
import { displayValue, percent } from "../creditFeatures";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import LoadingSkeleton from "../components/ui/LoadingSkeleton";
import MetricCard from "../components/ui/MetricCard";
import PageHeader from "../components/ui/PageHeader";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function riskTone(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("approve") || value.includes("low")) return "approved";
  if (value.includes("review") || value.includes("manual") || value.includes("pending")) return "pending";
  if (value.includes("reject") || value.includes("high")) return "rejected";
  return "neutral";
}

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);

    api
      .get("/ml/applications")
      .then(({ data }) => setApplications(Array.isArray(data) ? data : []))
      .catch(() => api.get("/loans").then(({ data }) => setApplications(Array.isArray(data) ? data : [])).catch(() => setApplications([])))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return applications.filter((item) => {
      const decision = String(item.final_decision || item.status || item.risk_level || "pending").toLowerCase();
      const searchable = [item.id, item.purpose, item.credit_purpose, item.credit_amount, item.duration, decision].join(" ").toLowerCase();
      const matchesQuery = !needle || searchable.includes(needle);
      const matchesDecision = decisionFilter === "all" || decision.includes(decisionFilter);
      return matchesQuery && matchesDecision;
    });
  }, [applications, query, decisionFilter]);

  const stats = useMemo(() => {
    const totalAmount = applications.reduce((sum, item) => sum + Number(item.loan_amount || item.credit_amount || 0), 0);
    const approved = applications.filter((item) => String(item.status || item.final_decision || "").toLowerCase().includes("approve")).length;
    return { totalAmount, approved };
  }, [applications]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Applications"
        subtitle="Review submitted borrowers, model decisions, and explainability outputs."
        action={<button className="ci-button" onClick={() => navigate("/applications/new")}><Plus size={15} />New application</button>}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Total applications" value={applications.length} />
        <MetricCard label="Approved" value={stats.approved} />
        <MetricCard label="Requested amount" value={formatCurrency(stats.totalAmount)} />
      </div>

      <section className="ci-panel">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
            <input className="ci-input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, purpose, amount, decision" />
          </div>
          <select className="ci-input w-full lg:w-44" value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value)}>
            <option value="all">All decisions</option>
            <option value="approve">Approved</option>
            <option value="review">Review</option>
            <option value="reject">Rejected</option>
          </select>
        </div>

        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="No applications found" description="Adjust the filters or create a new credit application." action={<button className="ci-button" onClick={() => navigate("/applications/new")}><Plus size={15} />New application</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="ci-table min-w-[1050px]">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Loan Amount</th>
                  <th>Duration</th>
                  <th>Purpose</th>
                  <th>Risk Score</th>
                  <th>Decision</th>
                  <th>Model</th>
                  <th>Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const decision = item.final_decision || item.status || item.risk_level || "Pending";
                  const confidence = Number(item.rf_confidence || item.confidence || 0);
                  const riskScore = confidence ? percent(confidence) : "-";
                  return (
                    <tr key={item.id}>
                      <td>
                        <p className="font-medium">Applicant #{String(item.id).padStart(4, "0")}</p>
                        <p className="text-[11px] text-[#A3A3A3]">Credit file</p>
                      </td>
                      <td className="font-medium">{formatCurrency(item.credit_amount || item.loan_amount)}</td>
                      <td>{item.duration_months || item.duration || "-"} months</td>
                      <td>{displayValue("purpose", item.purpose || item.credit_purpose) || "Credit request"}</td>
                      <td>{riskScore}</td>
                      <td><Badge tone={riskTone(decision)}>{decision}</Badge></td>
                      <td>{item.rf_decision ? "RF + LR" : "Decision engine"}</td>
                      <td>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "Recently"}</td>
                      <td className="text-right"><button className="ci-button-secondary inline-flex" onClick={() => navigate(`/applications/${item.id}`)}><Eye size={14} />View</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}


