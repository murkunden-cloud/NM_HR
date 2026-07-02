import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { History } from "lucide-react";

export default function Audit() {
  const [list, setList] = useState([]);
  useEffect(() => { api.get("/audit-log").then(r => setList(r.data)); }, []);

  const colorFor = (action) => {
    if (action.includes("CREATE")) return "bg-emerald-100 text-emerald-700";
    if (action.includes("DELETE") || action.includes("RESET")) return "bg-rose-100 text-rose-700";
    if (action.includes("UPDATE") || action.includes("ADJUST")) return "bg-indigo-100 text-indigo-700";
    if (action.includes("OUT")) return "bg-orange-100 text-orange-700";
    if (action.includes("POOL") || action.includes("DEPLOY")) return "bg-sky-100 text-sky-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sky-600 font-semibold text-sm">
          <History className="w-4 h-4" /> ADMIN
        </div>
        <h1 className="font-display text-4xl font-extrabold text-slate-800 mt-1 tracking-tight">Audit Log</h1>
        <p className="text-slate-500 mt-1">Every change made by every user, in order.</p>
      </div>
      <div className="surface-card overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-slate-50"><tr className="text-slate-600 text-xs tracking-wider uppercase">
            {["Time", "User", "Action", "Detail"].map(h => <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan="4" className="text-center text-slate-500 py-12">No activity yet</td></tr>}
            {list.map(l => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-5 py-3 text-slate-500 text-sm font-mono whitespace-nowrap">{new Date(l.ts).toLocaleString()}</td>
                <td className="px-5 py-3 text-slate-800">{l.user_name} <span className="text-slate-500 font-mono text-xs ml-1">{l.user_cpfno}</span></td>
                <td className="px-5 py-3"><span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${colorFor(l.action)}`}>{l.action}</span></td>
                <td className="px-5 py-3 text-slate-600">{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
