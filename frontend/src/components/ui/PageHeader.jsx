export function PageHeader({ eyebrow, title, subtitle, description, action }) {
  const helper = subtitle || description;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
      <div>
        {eyebrow && <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", margin: "0 0 6px" }}>{eyebrow}</p>}
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111111", margin: 0 }}>{title}</h1>
        {helper && <p style={{ fontSize: 13, color: "#737373", marginTop: 4, marginBottom: 0 }}>{helper}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export default PageHeader;


