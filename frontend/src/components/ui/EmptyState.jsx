export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      {Icon && <Icon size={32} color="#D4D4D4" style={{ marginBottom: 12 }} />}
      <p style={{ fontSize: 14, fontWeight: 500, color: "#737373", margin: "0 0 4px" }}>{title}</p>
      {subtitle && <p style={{ fontSize: 13, color: "#A3A3A3", margin: "0 0 16px" }}>{subtitle}</p>}
      {action}
    </div>
  );
}

export default EmptyState;



