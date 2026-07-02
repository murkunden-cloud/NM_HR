import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users2, FileText, ScrollText, History, LogOut, ShieldCheck, BarChart3 } from "lucide-react";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const isAdmin = user?.role === "admin";

  const items = [
    { to: "/", label: "Vacancy", icon: LayoutDashboard, testid: "nav-vacancy", color: "text-blue-700" },
    { to: "/employees", label: "Employees", icon: Users2, testid: "nav-employees", color: "text-emerald-600" },
    { to: "/orders", label: "Transfer Orders", icon: ScrollText, testid: "nav-orders", color: "text-orange-600" },

    ...(isAdmin ? [
      { to: "/users", label: "Users", icon: ShieldCheck, testid: "nav-users", color: "text-rose-600" },
      { to: "/audit", label: "Audit Log", icon: History, testid: "nav-audit", color: "text-sky-600" },
    ] : []),
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl brand-gradient flex items-center justify-center text-white font-display font-black text-lg shadow-lg shadow-blue-200">PZ</div>
            <div>
              <div className="font-heading text-xl leading-none font-black text-slate-900">Pune Zone</div>
              <div className="text-xs tracking-wider uppercase text-slate-500 mt-1 font-bold">Transferee Management</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {items.map(it => (
              <NavLink key={it.to} to={it.to} end={it.to === "/"}
                       data-testid={it.testid}
                       className={({isActive}) => `px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive ? `bg-slate-100 ${it.color}` : "text-slate-600 hover:bg-slate-50"}`}>
                <it.icon className="w-4 h-4" /> {it.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-bold text-slate-900">{user?.name}</div>
              <div className="text-xs text-slate-500 font-mono">
                {user?.cpfno} · <span className={user?.role === "admin" ? "text-blue-700 font-bold" : "text-emerald-600 font-bold"}>{user?.role}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                    onClick={async () => { await logout(); nav("/login"); }}
                    data-testid="logout-btn">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="md:hidden border-t border-slate-100 overflow-x-auto bg-white">
          <nav className="flex gap-1 px-4 py-2 min-w-max">
            {items.map(it => (
              <NavLink key={it.to} to={it.to} end={it.to === "/"}
                       className={({isActive}) => `px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-1 whitespace-nowrap ${isActive ? `bg-slate-100 ${it.color}` : "text-slate-600"}`}>
                <it.icon className="w-4 h-4" /> {it.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-8 py-8">
        {children}
      </main>

      <footer className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6 text-center text-sm text-slate-500">
        Designed & Managed by <span className="font-semibold text-slate-700">Nagesh D.M.</span> — Pune Zone Office Ledger Matrix Engine
      </footer>
    </div>
  );
}
