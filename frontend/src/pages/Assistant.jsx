import { useState } from "react";
import { Bot, SendHorizontal, UserRound } from "lucide-react";

import { api } from "../api";
import PageHeader from "../components/PageHeader";

const SUGGESTED_PROMPTS = [
  "Review my spending this month",
  "How can I improve my credit score?",
  "Is my EMI burden healthy?",
  "Calculate EMI for loan 500000 at 10% for 60 months",
];

export default function Assistant() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    {
      role: "assistant",
      text: "Hi! I am your AI financial coach. Ask me anything about spending, credit score, or EMIs.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!message.trim() || loading) return;
    const userText = message.trim();
    setChat((prev) => [...prev, { role: "user", text: userText }]);
    setMessage("");
    setLoading(true);
    try {
      const { data } = await api.post("/assistant/chat", { message: userText });
      setChat((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (error) {
      setChat((prev) => [
        ...prev,
        { role: "assistant", text: error.response?.data?.reply || "I could not answer that. Please try rephrasing with the key numbers." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="AI Financial Coach" description="Get instant answers to your financial questions with personalized guidance." />
      
      <div className="rounded-2xl bg-white p-6 shadow-md">
      <h2 className="text-xl font-semibold">AI Assistant</h2>
      <p className="mt-1 text-sm text-gray-500">Personalized financial guidance in a chat format.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => setMessage(prompt)}
            className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-100"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-5 h-[420px] space-y-4 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-4">
        {chat.map((item, index) => (
          <div
            key={`${item.role}-${index}`}
            className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                item.role === "user"
                  ? "bg-blue-900 text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                {item.role === "user" ? <UserRound size={14} /> : <Bot size={14} />}
                {item.role === "user" ? "You" : "Assistant"}
              </div>
              {item.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">
              Assistant is reading your finance context...
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ask();
          }}
          placeholder="Ask: How can I improve my credit score?"
        />
        <button className="rounded-xl bg-blue-900 px-4 py-2 text-white transition hover:bg-blue-800 disabled:opacity-50" onClick={ask} disabled={loading}>
          <SendHorizontal size={16} />
        </button>
      </div>
      </div>
    </div>
  );
}
