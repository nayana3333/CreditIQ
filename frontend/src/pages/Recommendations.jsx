import { useEffect, useState } from "react";

import { api, setAuthToken } from "../api";
import PageHeader from "../components/PageHeader";

export default function Recommendations() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setAuthToken(token);
    api.get("/recommendations").then((res) => setItems(res.data.recommendations || []));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader title="Smart Recommendations" description="Get personalized financial advice based on your spending patterns and financial goals." />
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-lg mb-3">Personalized Recommendations</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          {items.map((item, idx) => (
            <li key={`${idx}-${item}`}>{item}</li>
          ))}
        </ul>
        {!items.length && <p className="text-sm">Login and add data to get recommendations.</p>}
      </div>
    </div>
  );
}
