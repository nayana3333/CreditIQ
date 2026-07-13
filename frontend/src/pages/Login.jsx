import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";

import { api, setAuthToken } from "../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const login = async () => {
    try {
      setLoading(true);
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_email", email);
      localStorage.setItem("user", JSON.stringify(data.user || { email }));
      setAuthToken(data.access_token);
      window.dispatchEvent(new Event("auth-changed"));
      window.location.href = "/";
    } catch (e) {
      setMessage(e.response?.data?.error || "Login failed");
      setLoading(false);
    }
  };

  const fieldClass = "ci-input";

  return (
    <div className="min-h-screen bg-[#FFFCF7]">
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-[410px] rounded-xl border border-[#E5E5E5] bg-white p-8">
          <div className="mb-8 text-center">
            <p className="text-[18px] font-semibold text-[#111111]">Credit<span className="text-[#737373]">IQ</span></p>
            <h1 className="mt-6 text-[24px] font-semibold text-[#111111]">Sign in</h1>
            <p className="mt-2 text-[13px] text-[#737373]">Access your credit risk workspace.</p>
          </div>

          <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-[12px] font-medium text-[#404040]">Email address</span>
            <div className="ci-auth-field">
              <span className="ci-auth-icon"><Mail className="h-4 w-4" /></span>
              <input className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} placeholder="demo@creditiq.com" type="email" />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-medium text-[#404040]">Password</span>
            <div className="ci-auth-field">
              <span className="ci-auth-icon"><Lock className="h-4 w-4" /></span>
              <input className={`${fieldClass} pr-10`} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} placeholder="Enter your password" type={showPassword ? "text" : "password"} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#111111]">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between text-[13px]">
            <label className="flex cursor-pointer items-center gap-2 text-[#737373]">
              <input type="checkbox" className="h-4 w-4 rounded border-[#D4D4D4] accent-[#111111]" defaultChecked />
              Remember me
            </label>
            <a href="#" className="font-medium text-[#111111] hover:underline">Forgot password?</a>
          </div>

          <button onClick={login} disabled={loading} className="ci-button w-full disabled:opacity-50">
            {loading ? "Signing in..." : <>Sign in <ArrowRight className="h-[15px] w-[15px]" /></>}
          </button>

          {message && <div className="rounded-lg border border-[#D4D4D4] bg-[#FFFCF7] p-3 text-[13px] font-medium text-[#111111]">{message}</div>}

          <p className="text-center text-[13px] text-[#737373]">
            Don't have an account? <Link to="/register" className="font-medium text-[#111111] hover:underline">Create account</Link>
          </p>
          </div>
        </div>
      </main>
    </div>
  );
}



