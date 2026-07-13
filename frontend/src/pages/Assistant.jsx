import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";

import { api, setAuthToken } from "../api";

const chips = ["Why was I rejected?", "How can I improve approval odds?", "What does credit history mean?", "Explain the SHAP factors", "What if I reduce my loan amount?", "Compare LR vs RF decision"];

export default function Assistant() {
  const [params] = useSearchParams();
  const [applicationId] = useState(params.get("application_id") || params.get("loan_id") || localStorage.getItem("creditiq_context_loan_id"));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages([{ role: "assistant", content: applicationId ? `Hello! I've loaded loan application #${applicationId}. I can explain the decision, compare LR vs RF, and suggest what to improve.` : "Hello! I'm your CreditIQ AI Advisor. I can help you understand loan decisions, approval probability, SHAP factors, and ways to improve creditworthiness.", time: new Date() }]);
  }, [applicationId]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, loading]);

  const send = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const next = [...messages, { role: "user", content: trimmed, time: new Date() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);
    try {
      const { data } = await api.post("/assistant/chat", { message: trimmed, application_id: applicationId ? Number(applicationId) : null, conversation_history: next.map(({ role, content }) => ({ role, content })) });
      setMessages((current) => [...current, { role: "assistant", content: data.note ? `${data.reply}\n\n${data.note}` : data.reply, time: new Date() }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "I could not reach the advisor service. Please try again in a moment.", time: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
      <header className="border-b border-[#E5E5E5] p-5">
        <h1 className="text-xl font-semibold text-[#111111]">CreditIQ AI Advisor</h1>
        <p className="text-sm text-[#737373]">OpenAI-ready credit risk advisor for model decisions and SHAP explanations</p>
        {applicationId && <p className="mt-3 rounded-lg bg-[#F7F5F0] px-3 py-2 text-sm font-semibold text-[#111111]">Context: Loan Application #{applicationId} loaded</p>}
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto bg-[#FFFCF7] p-5">
        {messages.map((message, index) => (
          <div key={`${message.time}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] rounded-lg px-4 py-3 text-sm ${message.role === "user" ? "bg-[#111111] text-white" : "border border-[#E5E5E5] bg-white text-[#262626]"}`}>
              <p className="whitespace-pre-line">{message.content}</p>
              <p className={`mt-2 text-[11px] ${message.role === "user" ? "text-white/70" : "text-[#A3A3A3]"}`}>{new Date(message.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        ))}
        {loading && <div className="w-fit rounded-lg border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#737373]">Typing...</div>}
        <div ref={bottomRef} />
      </main>

      <footer className="border-t border-[#E5E5E5] p-4">
        <div className="mb-3 flex flex-wrap gap-2">{chips.map((chip) => <button key={chip} onClick={() => send(chip)} className="rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold text-[#525252] hover:border-[#111111] hover:text-[#111111]">{chip}</button>)}</div>
        <div className="flex gap-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask about a decision, factor, or simulation..." className="flex-1 rounded-lg border border-[#E5E5E5] px-4 py-3 text-sm outline-none focus:border-[#111111]" />
          <button onClick={() => send()} className="rounded-lg bg-[#111111] px-4 py-3 text-white"><Send className="h-4 w-4" /></button>
        </div>
      </footer>
    </div>
  );
}



