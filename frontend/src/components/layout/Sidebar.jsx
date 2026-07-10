import { useLocation, useNavigate } from "react-router-dom";
import { BarChart2, FileText, LayoutDashboard, LogOut, MessageSquare, Sliders, Upload, User } from "lucide-react";

const NAV = [
  { section: "Overview", items: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Applications", path: "/applications", icon: FileText },
  ] },
  { section: "Analysis", items: [
    { label: "Analytics", path: "/analytics", icon: BarChart2 },
    { label: "Simulator", path: "/simulation", icon: Sliders },
    { label: "AI Advisor", path: "/assistant", icon: MessageSquare },
  ] },
  { section: "Tools", items: [
    { label: "Batch Predict", path: "/batch", icon: Upload },
    { label: "Profile", path: "/profile", icon: User },
  ] },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    user = {};
  }
  const email = user.email || localStorage.getItem("user_email") || "";

  const navButtonStyle = (active) => ({
    alignItems: "center",
    background: active ? "#FAF8F3" : "transparent",
    borderBottom: "none",
    borderLeft: active ? "2px solid #737373" : "2px solid transparent",
    borderRadius: 0,
    borderRight: "none",
    borderTop: "none",
    color: active ? "#111111" : "#737373",
    cursor: "pointer",
    display: "flex",
    fontSize: 13,
    fontWeight: active ? 500 : 400,
    gap: 10,
    padding: "8px 16px",
    textAlign: "left",
    width: "100%",
  });

  return (
    <aside style={{ width: 220, flexShrink: 0, height: "100vh", position: "fixed", left: 0, top: 0, background: "#FFFFFF", borderRight: "1px solid #E5E5E5", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 20 }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #F7F5F0" }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: "#111111" }}>Credit</span>
        <span style={{ fontSize: 15, fontWeight: 500, color: "#737373" }}>IQ</span>
        <p style={{ fontSize: 11, color: "#A3A3A3", margin: "2px 0 0" }}>Credit risk intelligence</p>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", padding: "10px 16px 3px", margin: 0 }}>{section}</p>
            {items.map(({ label, path, icon: Icon }) => {
              const active = location.pathname === path || (path === "/applications" && (location.pathname.startsWith("/applications") || location.pathname.startsWith("/loans")));
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  onMouseEnter={(event) => {
                    if (!active) event.currentTarget.style.background = "#FAF8F3";
                  }}
                  onMouseLeave={(event) => {
                    if (!active) event.currentTarget.style.background = "transparent";
                  }}
                  style={navButtonStyle(active)}
                >
                  <Icon size={16} strokeWidth={1.8} color={active ? "#111111" : "#737373"} />
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ borderTop: "1px solid #E5E5E5", padding: "10px 16px" }}>
        <p style={{ color: "#A3A3A3", fontSize: 11, margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email || "Signed in"}</p>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("user_email");
            navigate("/login");
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = "#FAF8F3";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = "#FFFFFF";
          }}
          style={{ alignItems: "center", background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 7, color: "#737373", cursor: "pointer", display: "flex", fontSize: 12, gap: 6, justifyContent: "center", padding: "7px 10px", width: "100%" }}
        >
          <LogOut size={13} strokeWidth={1.8} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;



