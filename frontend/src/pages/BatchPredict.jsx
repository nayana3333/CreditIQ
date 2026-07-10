import { useRef, useState } from "react";
import Papa from "papaparse";
import { Download, Upload } from "lucide-react";

import { api, setAuthToken } from "../api";
import { DEFAULT_LOAN_INPUT } from "../creditFeatures";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { MetricCard } from "../components/ui/MetricCard";
import { PageHeader } from "../components/ui/PageHeader";

const featureNames = Object.keys(DEFAULT_LOAN_INPUT);
const sampleRows = [
  DEFAULT_LOAN_INPUT,
  { ...DEFAULT_LOAN_INPUT, credit_amount: 9000, duration: 36, age: 27, checking_status: "< 0 DM", savings_status: "no known savings" },
];

function downloadCsv(filename, rows) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BatchPredict() {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [results, setResults] = useState(null);

  const validateRows = (parsedRows, selectedFile) => {
    const cleaned = parsedRows.filter((row) => Object.values(row).some((value) => String(value || "").trim()));
    const missing = featureNames.filter((name) => !(name in (cleaned[0] || {})));
    if (missing.length) {
      setUploadError(`Missing required columns: ${missing.join(", ")}`);
      setFile(null);
      setRows([]);
      return;
    }
    if (cleaned.length > 100) {
      setUploadError("Maximum 100 applicants allowed per batch.");
      setFile(null);
      setRows([]);
      return;
    }
    setUploadError("");
    setFile(selectedFile);
    setRows(cleaned);
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => validateRows(data, selectedFile),
      error: () => setUploadError("Could not parse this CSV file."),
    });
  };

  const runBatch = async () => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);
    setBatchLoading(true);
    setResults(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/ml/batch", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setResults(data);
    } catch (error) {
      setUploadError(error.response?.data?.error || "Batch prediction failed.");
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Batch prediction" subtitle="Score multiple applicants at once from a CSV file" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div className="ci-panel">
          <p className="ci-section-title">How it works</p>
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {["Download the CSV template", "Fill applicant rows", "Upload and score with LR + RF"].map((step, index) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#F7F5F0", color: "#111111", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500 }}>{index + 1}</span>
                <span style={{ fontSize: 13, color: "#111111" }}>{step}</span>
              </div>
            ))}
          </div>
          <button className="ci-button-secondary" style={{ marginTop: 20 }} onClick={() => downloadCsv("creditiq-batch-template.csv", sampleRows)}>
            <Download size={15} />
            Download CSV template
          </button>
        </div>

        <div className="ci-panel">
          <p className="ci-section-title">Upload CSV</p>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              handleFile(event.dataTransfer.files?.[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{ border: `2px dashed ${dragOver ? "#111111" : "#D4D4D4"}`, borderRadius: 10, padding: "36px 20px", textAlign: "center", cursor: "pointer", background: dragOver ? "#F7F5F0" : "white", marginTop: 16, marginBottom: 16 }}
          >
            <Upload size={28} color={dragOver ? "#111111" : "#A3A3A3"} />
            <p style={{ fontSize: 13, color: "#737373", margin: "10px 0 4px" }}>Drag a CSV here or click to browse</p>
            <p style={{ fontSize: 11, color: "#A3A3A3", margin: 0 }}>Max 100 rows. All feature columns required.</p>
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(event) => handleFile(event.target.files?.[0])} />
          </div>
          {file && <div style={{ background: "#F7F5F0", borderRadius: 7, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#404040" }}>{file.name} - {rows.length} applicants loaded</div>}
          {uploadError && <div style={{ background: "#FFFCF7", border: "1px solid #D4D4D4", borderRadius: 7, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#111111" }}>{uploadError}</div>}
          <button onClick={runBatch} disabled={!file || batchLoading} className="ci-button" style={{ opacity: !file || batchLoading ? 0.6 : 1 }}>
            {batchLoading ? `Scoring ${rows.length} applicants...` : "Run predictions"}
          </button>
        </div>
      </div>

      {results ? (
        <div className="ci-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p className="ci-section-title">Results - {results.summary.total} applicants</p>
            <button className="ci-button-secondary" onClick={() => downloadCsv("creditiq-batch-results.csv", results.results)}>Export CSV</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            <MetricCard label="Total" value={results.summary.total} />
            <MetricCard label="Approved" value={results.summary.approved} valueColor="#111111" />
            <MetricCard label="Rejected" value={results.summary.rejected} valueColor="#111111" />
            <MetricCard label="Consensus" value={`${results.summary.consensus_rate}%`} sub="Both models agree" />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#FFFCF7", borderBottom: "1px solid #E5E5E5" }}>
                  {["Row", "LR", "LR conf", "RF", "RF conf", "Final", "Consensus", "Top factor"].map((header) => <th key={header} style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "#737373", padding: "8px 12px", textAlign: "left" }}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {results.results.map((row) => (
                  <tr key={row.row} style={{ borderBottom: "1px solid #F7F5F0" }}>
                    <td style={{ fontSize: 12, fontFamily: "var(--font-mono)", padding: "8px 12px", color: "#737373" }}>#{row.row}</td>
                    <td style={{ padding: "8px 12px" }}><Badge status={row.lr_decision}>{row.lr_decision}</Badge></td>
                    <td style={{ fontSize: 12, fontFamily: "var(--font-mono)", padding: "8px 12px", color: "#737373" }}>{row.lr_confidence}%</td>
                    <td style={{ padding: "8px 12px" }}><Badge status={row.rf_decision}>{row.rf_decision}</Badge></td>
                    <td style={{ fontSize: 12, fontFamily: "var(--font-mono)", padding: "8px 12px", color: "#737373" }}>{row.rf_confidence}%</td>
                    <td style={{ padding: "8px 12px" }}><Badge status={row.final_decision}>{row.final_decision}</Badge></td>
                    <td style={{ padding: "8px 12px" }}><Badge status={row.consensus ? "approved" : "warning"}>{row.consensus ? "Yes" : "No"}</Badge></td>
                    <td style={{ fontSize: 12, color: "#737373", padding: "8px 12px" }}>{row.top_factor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="ci-panel"><EmptyState icon={Upload} title="No batch results yet" subtitle="Upload a CSV and run predictions to see the results table." /></div>
      )}
    </div>
  );
}



