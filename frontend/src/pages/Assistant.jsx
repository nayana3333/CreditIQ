import { useState } from "react";
import { Bot, SendHorizontal, UserRound } from "lucide-react";

import { api } from "../api";

export default function Assistant() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    {
      role: "assistant",
      text: "Hi! I am your AI financial coach. Ask me anything about spending, credit score, or EMIs.",
    },
  ]);

  const ask = async () => {
    if (!message.trim()) return;
    const userText = message.trim();
    setChat((prev) => [...prev, { role: "user", text: userText }]);
    setMessage("");
    const { data } = await api.post("/assistant/chat", { message: userText });
    setChat((prev) => [...prev, { role: "assistant", text: data.reply }]);
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-md">
      <h2 className="text-xl font-semibold">AI Assistant</h2>
      <p className="mt-1 text-sm text-gray-500">Personalized financial guidance in a chat format.</p>

      <div className="mt-5 h-[420px] space-y-4 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-4">
        {chat.map((item, index) => (
          <div
            key={`${item.role}-${index}`}
            className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                item.role === "user"
                  ? "bg-blue-600 text-white"
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
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask: How can I improve my credit score?"
        />
        <button className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-white transition hover:opacity-90" onClick={ask}>
          <SendHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
