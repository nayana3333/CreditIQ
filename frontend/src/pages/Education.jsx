import { useEffect, useState } from "react";
import { BadgePercent, BookOpen, Landmark } from "lucide-react";

import { api } from "../api";

export default function Education() {
  const [lessons, setLessons] = useState([]);
  const [answers, setAnswers] = useState({ 1: "below_30", 2: "on_time_payment" });
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get("/education/lessons").then((res) => setLessons(res.data || []));
  }, []);

  const submitQuiz = async () => {
    const { data } = await api.post("/education/quiz/submit", {
      answers: { "1": answers[1], "2": answers[2] },
    });
    setResult(data);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h2 className="text-xl font-semibold">Learn Finance Basics</h2>
        <p className="mt-1 text-sm text-gray-500">Short lessons to improve financial literacy.</p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { title: "Credit Score", desc: "Understand utilization and payment history.", icon: BadgePercent },
            { title: "Loans", desc: "Learn debt management and responsible borrowing.", icon: Landmark },
            { title: "EMI", desc: "Plan EMIs within monthly income limits.", icon: BookOpen },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <span className="mb-3 inline-flex rounded-xl bg-blue-100 p-2 text-blue-600">
                  <Icon size={18} />
                </span>
                <p className="font-semibold">{card.title}</p>
                <p className="mt-1 text-sm text-gray-500">{card.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-md space-y-4">
        <h3 className="text-xl font-semibold">Quick Quiz</h3>
        <div>
          <p className="mb-1 text-sm text-gray-500">Healthy utilization rate:</p>
          <select className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={answers[1]} onChange={(e) => setAnswers({ ...answers, 1: e.target.value })}>
            <option value="below_30">Below 30%</option>
            <option value="above_70">Above 70%</option>
          </select>
        </div>
        <div>
          <p className="mb-1 text-sm text-gray-500">Best for credit history:</p>
          <select className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={answers[2]} onChange={(e) => setAnswers({ ...answers, 2: e.target.value })}>
            <option value="on_time_payment">On-time payments</option>
            <option value="max_utilization">Max utilization</option>
          </select>
        </div>
        <button className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90" onClick={submitQuiz}>Submit</button>
        {result && <p className="text-sm text-gray-700">Score: <span className="font-semibold">{result.score}/{result.total}</span></p>}
      </div>

      {!!lessons.length && (
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <h3 className="text-xl font-semibold">Lesson Feed</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="rounded-xl border border-gray-100 px-4 py-3">
                <p className="font-medium">{lesson.title}</p>
                <p className="mt-1 text-gray-500">{lesson.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

