import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, ShieldCheck, Users } from "lucide-react";

const blank = { cpfno: "", name: "", password: "", role: "viewer", expires_in_days: 90 };

function toDays(expiresAt) {
  if (!expiresAt) return 90;
  const ms = new Date(expiresAt).getTime() - Date.now();
  const d = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  return d || 90;
}

export default function Users_() {
  const { user: me } = useAuth();
  const [list, setList] = useState([]);
  const [dlg, setDlg] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => { const { data } = await api.get("/users"); setList(data); };
  useEffect(() => { reload(); }, []);

  const openEdit = (u) => {
    setDlg({
      id: u.id,
      cpfno: u.cpfno,
      name: u.name,
      password: "",
      role: u.role,
      active: u.active !== false,
      expires_in_days: toDays(u.expires_at),
    });
  };

  const save = async () => {
    if (!dlg) return;
    setBusy(true);
    try {
      if (dlg.id) {
        const upd = {};
        if (dlg.name) upd.name = dlg.name;
        if (dlg.role) upd.role = dlg.role;
        if (typeof dlg.active === "boolean") upd.active = dlg.active;
        if (dlg.password) upd.password = dlg.password;
        if (dlg.role === "viewer" && dlg.expires_in_days) upd.expires_in_days = +dlg.expires_in_days;
        await api.put(`/users/${dlg.id}`, upd);
        toast.success("User updated");
      } else {
        if (!dlg.cpfno || !dlg.password || !dlg.name) {
          setBusy(false);
          return toast.error("CPFNO, Name and Password are required");
        }
        await api.post("/users", { cpfno: dlg.cpfno, name: dlg.name, password: dlg.password, role: dlg.role, expires_in_days: +dlg.expires_in_days });
        toast.success("User created");
      }
      setDlg(null); reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const del = async (u) => {
    if (u.cpfno === "2266083") {
      toast.error("Primary admin (CPFNO 2266083) cannot be deleted — this prevents accidental lockout.");
      return;
    }
    if (!window.confirm(`Delete user ${u.cpfno} (${u.name})?\n\nThis cannot be undone.`)) return;
    try { await api.delete(`/users/${u.id}`); toast.success(`Deleted ${u.name}`); reload(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4" /> ADMIN PANEL
          </div>
          <h1 className="font-display text-4xl font-bold text-slate-800 mt-1">Users</h1>
          <p className="text-slate-500 mt-1">Manage who can access the system and their permissions.</p>
        </div>
        <Button onClick={() => setDlg({ ...blank })} className="btn-primary h-11 px-5 text-base" data-testid="user-add-btn">
          <Plus className="w-5 h-5 mr-1" /> Add User
        </Button>
      </div>

      <div className="surface-card overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-slate-50">
            <tr className="text-slate-500 text-xs tracking-wider uppercase">
              {["CPFNO", "Name", "Role", "Expires", "Status", ""].map(h => <th key={h} className="px-5 py-4 text-left font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-5 py-4 font-mono font-semibold text-slate-700">{u.cpfno}</td>
                <td className="px-5 py-4 text-slate-800 font-medium">{u.name}</td>
                <td className="px-5 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === "admin" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-500 text-sm">{u.expires_at ? new Date(u.expires_at).toLocaleDateString() : "—"}</td>
                <td className="px-5 py-4">
                  {u.active === false
                    ? <span className="text-rose-600 font-semibold text-sm">Disabled</span>
                    : <span className="text-emerald-600 font-semibold text-sm">● Active</span>}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)}
                            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-semibold"
                            data-testid={`user-edit-${u.cpfno}`}>
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    {u.cpfno === "2266083" ? (
                      <span className="px-3 py-1.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-md border border-amber-200">Protected</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => del(u)}
                              className="border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold"
                              data-testid={`user-del-${u.cpfno}`}>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">{dlg?.id ? "Edit" : "Add"} User</DialogTitle>
          </DialogHeader>
          {dlg && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-slate-700">CPFNO</Label>
                <Input value={dlg.cpfno} disabled={!!dlg.id}
                       onChange={(e) => setDlg(s => ({...s, cpfno: e.target.value}))}
                       className="bg-slate-50 border-slate-200 mt-1 h-11 text-base disabled:opacity-60"
                       data-testid="user-cpfno-input"/>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Full Name</Label>
                <Input value={dlg.name} onChange={(e) => setDlg(s => ({...s, name: e.target.value}))}
                       className="bg-slate-50 border-slate-200 mt-1 h-11 text-base"
                       data-testid="user-name-input"/>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">
                  Password {dlg.id && <span className="text-slate-500 font-normal">(leave blank to keep current)</span>}
                </Label>
                <Input type="password" value={dlg.password || ""} onChange={(e) => setDlg(s => ({...s, password: e.target.value}))}
                       className="bg-slate-50 border-slate-200 mt-1 h-11 text-base"
                       data-testid="user-password-input"/>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Role</Label>
                <Select value={dlg.role} onValueChange={(v) => setDlg(s => ({...s, role: v}))}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 mt-1 h-11 text-base" data-testid="user-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="viewer">Viewer — Transfer IN/OUT + view only</SelectItem>
                    <SelectItem value="admin">Admin — Full access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {dlg.role === "viewer" && (
                <div>
                  <Label className="text-sm font-semibold text-slate-700">Access duration (days)</Label>
                  <Input type="number" min="1" value={dlg.expires_in_days || ""}
                         onChange={(e) => setDlg(s => ({...s, expires_in_days: e.target.value}))}
                         className="bg-slate-50 border-slate-200 mt-1 h-11 text-base"
                         data-testid="user-days-input"/>
                  <p className="text-xs text-slate-500 mt-1">Default 90 days (3 months)</p>
                </div>
              )}
              {dlg.id && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <input type="checkbox" id="user-active" checked={dlg.active !== false}
                         onChange={(e) => setDlg(s => ({...s, active: e.target.checked}))}
                         className="w-4 h-4"/>
                  <label htmlFor="user-active" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Account active (uncheck to disable login)
                  </label>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => setDlg(null)} variant="outline" className="flex-1 h-11 text-base">Cancel</Button>
                <Button onClick={save} disabled={busy} className="flex-1 btn-primary h-11 text-base" data-testid="user-save-btn">
                  {busy ? "Saving..." : (dlg.id ? "Save Changes" : "Create User")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
