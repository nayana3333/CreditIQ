import { Badge } from "./Badge";

export function ModelCard({ modelName, decision, confidence = 0, goodProb = 0, badProb = 0, isPrimary = false }) {
  const approved = decision === "approved";
  return (
    <div style={{ border: isPrimary ? "1px solid #D4D4D4" : "1px solid #E5E5E5", background: isPrimary ? "#F7F5F0" : "#FFFFFF", borderRadius: 10, padding: "12px 14px", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: isPrimary ? "#111111" : "#737373" }}>{modelName}</span>
        {isPrimary && <Badge status="info">Primary</Badge>}
      </div>
      <p style={{ fontSize: 16, fontWeight: 500, margin: "0 0 4px", color: approved ? "#111111" : "#111111" }}>{approved ? "Approved" : "Rejected"}</p>
      <p style={{ fontSize: 12, color: "#737373", margin: "0 0 10px" }}>Confidence: {(confidence * 100).toFixed(1)}%</p>
      {[
        ["Approval", goodProb, "#A3A3A3", "#111111"],
        ["Risk", badProb, "#111111", "#111111"],
      ].map(([label, prob, barColor, textColor]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "#737373", width: 52 }}>{label}</span>
          <div style={{ flex: 1, height: 5, background: "#E5E5E5", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${(prob * 100).toFixed(0)}%`, height: "100%", background: barColor, borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, color: textColor, width: 32, textAlign: "right", fontFamily: "var(--font-mono)" }}>{(prob * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

export default ModelCard;



