import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import Assistant from "./pages/AssistantUpgraded";
import Analytics from "./pages/AnalyticsUpgraded";
import Applications from "./pages/Applications";
import BatchPredict from "./pages/BatchPredict";
import Dashboard from "./pages/DashboardRecruiter";
import LoanDecision from "./pages/LoanDecisionRecruiter";
import LoanForm from "./pages/LoanForm";
import Login from "./pages/LoginRecruiter";
import Profile from "./pages/Profile";
import Register from "./pages/RegisterRecruiter";
import Simulation from "./pages/SimulationUpgraded";

function Protected({ children }) {
  if (!localStorage.getItem("token")) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  const fallback = localStorage.getItem("token") ? "/dashboard" : "/login";

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Navigate to={fallback} replace />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/applications" element={<Protected><Applications /></Protected>} />
      <Route path="/loans" element={<Protected><Applications /></Protected>} />
      <Route path="/applications/new" element={<Protected><LoanForm /></Protected>} />
      <Route path="/loans/new" element={<Protected><LoanForm /></Protected>} />
      <Route path="/applications/:id" element={<Protected><LoanDecision /></Protected>} />
      <Route path="/loans/:id" element={<Protected><LoanDecision /></Protected>} />
      <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
      <Route path="/simulation" element={<Protected><Simulation /></Protected>} />
      <Route path="/assistant" element={<Protected><Assistant /></Protected>} />
      <Route path="/batch" element={<Protected><BatchPredict /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="*" element={<Navigate to={fallback} replace />} />
    </Routes>
  );
}



