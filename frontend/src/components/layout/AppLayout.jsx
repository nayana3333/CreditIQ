import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/login", { replace: true });
  }, [navigate]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#FFFDF9" }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 220, padding: "24px 28px", minWidth: 0, maxWidth: 1280 }}>{children}</main>
    </div>
  );
}

export default AppLayout;



