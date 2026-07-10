import { AlertTriangle, CheckCircle } from "lucide-react";

export function ConsensusIndicator({ consensus, lrDecision, rfDecision }) {
  if (consensus) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F7F5F0", border: "1px solid #D4D4D4", borderRadius: 7, padding: "6px 12px", fontSize: 12, color: "#111111", width: "fit-content" }}>
        <CheckCircle size={14} />
        Both models agree
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFCF7", border: "1px solid #D4D4D4", borderRadius: 7, padding: "6px 12px", fontSize: 12, color: "#404040", width: "fit-content" }}>
      <AlertTriangle size={14} />
      Models disagree - LR: {lrDecision}, RF: {rfDecision}. Review manually.
    </div>
  );
}

export default ConsensusIndicator;



