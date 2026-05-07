import { useEffect, useState } from "react";
import {
  Bell,
  BarChart3,
  Bot,
  BookOpenText,
  LayoutDashboard,
  LogOut,
  Scale,
  Sparkles,
  Target,
  UserCircle2,
  WalletCards,
} from "lucide-react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import { api, setAuthToken } from "./api";
import Assistant from "./pages/Assistant";
import Analytics from "./pages/Analytics";
import BudgetPlanner from "./pages/BudgetPlanner";
import Dashboard from "./pages/Dashboard";
import Education from "./pages/Education";
import LoanDecision from "./pages/LoanDecision";
import Login from "./pages/Login";
import Loans from "./pages/Loans";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import Recommendations from "./pages/Recommendations";
import Simulation from "./pages/Simulation";
import Transactions from "./pages/Transactions";

export default function App() {
  const [backendOk, setBackendOk] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [userEmail, setUserEmail] = useState(localStorage.getItem("user_email") || "");

  console.log("App: Initial render - isLoggedIn:", isLoggedIn, "token:", !!localStorage.getItem("token"));

  useEffect(() => {
    api
      .get("/health")
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setAuthToken(token);
    }
  }, []);

  useEffect(() => {
    const onAuthChanged = () => {
      const token = localStorage.getItem("token");
      const email = localStorage.getItem("user_email");
      console.log("App: Auth changed - token:", !!token, "email:", email);
      setIsLoggedIn(!!token);
      setUserEmail(email || "");
    };
    window.addEventListener("auth-changed", onAuthChanged);
    return () => window.removeEventListener("auth-changed", onAuthChanged);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    setAuthToken(null);
    setIsLoggedIn(false);
    setUserEmail("");
  };

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/transactions", label: "Transactions", icon: WalletCards },
    { to: "/budgets", label: "Budgets", icon: Target },
    { to: "/decision", label: "Loan Decision", icon: Scale },
    { to: "/assistant", label: "AI Assistant", icon: Bot },
    { to: "/simulation", label: "Simulation", icon: Sparkles },
    { to: "/education", label: "Learn", icon: BookOpenText },
    { to: "/profile", label: "Profile", icon: UserCircle2 },
  ];

  return (
    <>
      {isLoggedIn ? (
        <div className="flex min-h-screen bg-gray-50 text-gray-900">
          <aside className="fixed left-0 top-0 z-20 h-screen w-64 overflow-y-auto border-r border-gray-200 bg-white px-6 py-8">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-900"></div>
                <p className="text-lg font-bold text-blue-900">Credit Intel</p>
              </div>
              <p className="text-xs text-gray-500">AI Finance Coach</p>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-blue-50 text-blue-900 shadow-sm"
                          : "text-gray-600 hover:bg-blue-50 hover:text-blue-900"
                      }`
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="absolute bottom-8 left-6 right-6 border-t border-gray-200 pt-4">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-200"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </aside>

          <div className="ml-64 flex-1">
            <header className="sticky top-0 z-10 border-b border-gray-200/50 bg-white/80 backdrop-blur-lg">
              <div className="flex items-center justify-between px-8 py-4">
                <div>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                      backendOk
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${backendOk ? "bg-emerald-600" : "bg-rose-600"}`}></span>
                    {backendOk ? "System Online" : "System Offline"}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <button className="relative p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-all duration-200">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-900 rounded-full"></span>
                  </button>
                  <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
                    <div>
                      <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-white font-bold text-sm">
                        {userEmail?.[0].toUpperCase() || "U"}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{userEmail?.split("@")[0] || "User"}</p>
                      <p className="text-xs text-gray-500">{userEmail || "guest@fintech.io"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="p-8">
              <div className="max-w-7xl mx-auto">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/budgets" element={<BudgetPlanner />} />
                  <Route path="/decision" element={<LoanDecision />} />
                  <Route path="/loans" element={<Loans />} />
                  <Route path="/assistant" element={<Assistant />} />
                  <Route path="/simulation" element={<Simulation />} />
                  <Route path="/recommendations" element={<Recommendations />} />
                  <Route path="/education" element={<Education />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Login />} />
        </Routes>
      )}
    </>
  );
}
