import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Zap, ShieldCheck, Users2 } from "lucide-react";

export default function Login() {
  const { user, login } = useAuth();
  const [cpfno, setCpf] = useState("");
  const [password, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await login(cpfno.trim(), password);
      toast.success("Welcome back");
    } catch (e) {
      const d = e.response?.data?.detail;
      setErr(typeof d === "string" ? d : "Login failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-stretch">
      {/* LEFT PANEL — colorful brand */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden text-white"
           style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 35%, #DB2777 70%, #F97316 100%)" }}>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-amber-300/30 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">Pune Zone</div>
              <div className="text-sm text-white/70">MSEDCL · HR Workspace</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="font-display text-5xl font-extrabold leading-tight">
            Transferee &<br/>Vacancy<br/>Management.
          </h2>
          <p className="text-white/80 text-lg max-w-md">
            One workspace for 2,291 location-designation rows · Class I→IV mapping ·
            Caste-wise backlog roster · Cloud-saved · Audit-tracked.
          </p>

          <div className="space-y-3 pt-4">
            {[
              [Building2, "2,291 offices tracked"],
              [Users2, "Class III · Circle-wise · Class IV · Division-wise"],
              [ShieldCheck, "Role-based access · 3-month viewer expiry"],
            ].map(([Icon, txt], i) => (
              <div key={i} className="flex items-center gap-3 text-white/90">
                <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-amber-200" />
                </div>
                <span className="font-medium">{txt}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-sm text-white/70">
          Designed by <span className="font-semibold text-white">Nagesh D.M.</span> · Head Clerk · 7875388248
        </div>
      </div>

      {/* RIGHT PANEL — login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-gradient-to-br from-slate-50 via-white to-indigo-50 relative">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 lg:hidden"></div>

        <form onSubmit={submit}
              className="relative z-10 w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl shadow-indigo-200/40 border border-slate-200"
              data-testid="login-form">

          <div className="mb-8">
            <div className="text-xs tracking-[0.3em] uppercase text-indigo-600 font-bold mb-2">PZTMS · v2.0</div>
            <h1 className="font-display text-3xl font-extrabold text-slate-800">Welcome back</h1>
            <p className="text-slate-500 mt-1">Sign in to continue to your dashboard.</p>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="text-slate-700 text-sm font-semibold mb-2 block">CPFNO</Label>
              <Input value={cpfno} onChange={(e) => setCpf(e.target.value)}
                     placeholder="e.g. 2266083"
                     className="bg-slate-50 border-slate-200 text-slate-900 h-12 text-base focus-visible:ring-indigo-500"
                     data-testid="login-cpfno-input"/>
            </div>
            <div>
              <Label className="text-slate-700 text-sm font-semibold mb-2 block">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPw(e.target.value)}
                     className="bg-slate-50 border-slate-200 text-slate-900 h-12 text-base focus-visible:ring-indigo-500"
                     data-testid="login-password-input"/>
            </div>
            {err && <div className="text-rose-700 text-sm font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5" data-testid="login-error">{err}</div>}
            <Button type="submit" disabled={busy}
                    className="w-full h-12 btn-primary text-base"
                    data-testid="login-submit-btn">
              {busy ? "Signing in..." : "Sign in →"}
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
                <div className="text-xs font-bold text-rose-600 uppercase tracking-wide">Admin</div>
                <div className="text-sm text-slate-600 mt-1">Full access · You</div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Viewer</div>
                <div className="text-sm text-slate-600 mt-1">90-day access · IN/OUT only</div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
