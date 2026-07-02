import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, ScrollText } from "lucide-react";

const blank = { order_no: "", order_date: new Date().toISOString().slice(0,10), type: "OUT", employee_name: "", employee_cpfno: "", designation: "", from_loc: "", to_loc: "", remarks: "" };

export default function TransferOrders() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [list, setList] = useState([]);
  const [dlg, setDlg] = useState(null);
  const [masterQuery, setMasterQuery] = useState("");
  const [masterResults, setMasterResults] = useState([]);
  const [masterSearching, setMasterSearching] = useState(false);

  useEffect(() => {
    if (!masterQuery.trim()) {
      setMasterResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setMasterSearching(true);
      try {
        const { data } = await api.get("/master-employees/search", { params: { q: masterQuery } });
        setMasterResults(data);
      } catch (e) {
        console.error(e);
      } finally {
        setMasterSearching(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [masterQuery]);

  const reload = async () => { const { data } = await api.get("/transfer-orders"); setList(data); };
  useEffect(() => { reload(); }, []);

  const save = async () => {
    try { await api.post("/transfer-orders", dlg); toast.success("Order created"); setDlg(null); reload(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this order?")) return;
    try { await api.delete(`/transfer-orders/${id}`); toast.success("Deleted"); reload(); }
    catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-orange-600 font-semibold text-sm">
            <ScrollText className="w-4 h-4" /> RECORDS
          </div>
          <h1 className="font-display text-4xl font-extrabold text-slate-800 mt-1 tracking-tight">Transfer Orders</h1>
        </div>
        <Button onClick={() => setDlg({ ...blank })} className="btn-primary h-11 text-base" data-testid="order-add-btn">
          <Plus className="w-4 h-4 mr-1" /> New Order
        </Button>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead className="bg-slate-50"><tr className="text-slate-600 text-xs tracking-wider uppercase">
              {["Order No", "Date", "Type", "Employee", "Designation", "From", "→ To", "Remarks", ""].map(h => <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan="9" className="text-center text-slate-500 py-12">No transfer orders yet</td></tr>}
              {list.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-5 py-4 font-mono font-semibold text-slate-800">{o.order_no}</td>
                  <td className="px-5 py-4 text-slate-600 text-sm">{o.order_date}</td>
                  <td className="px-5 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${o.type === "OUT" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{o.type}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-800">{o.employee_name} <span className="text-slate-500 font-mono text-xs ml-1">{o.employee_cpfno}</span></td>
                  <td className="px-5 py-4 text-slate-700">{o.designation}</td>
                  <td className="px-5 py-4 text-slate-500 text-sm">{o.from_loc}</td>
                  <td className="px-5 py-4 text-slate-500 text-sm">{o.to_loc}</td>
                  <td className="px-5 py-4 text-slate-500 text-sm">{o.remarks}</td>
                  <td className="px-5 py-4 text-right">
                    {isAdmin && <Button size="sm" variant="ghost" onClick={() => del(o.id)} className="text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!dlg} onOpenChange={(o) => { if (!o) { setDlg(null); setMasterQuery(""); setMasterResults([]); } }}>
        <DialogContent className="bg-white text-slate-800 max-w-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">New Transfer Order</DialogTitle></DialogHeader>
          {dlg && (
            <div className="space-y-4">
              {/* Autofill from Master */}
              <div className="border border-indigo-100 bg-indigo-50/50 p-4 rounded-xl relative">
                <Label className="text-sm font-bold text-indigo-900 block mb-1">
                  🔍 Autofill from Master Employee Excel
                </Label>
                <div className="relative">
                  <Input 
                    value={masterQuery} 
                    onChange={(e) => setMasterQuery(e.target.value)} 
                    placeholder="Type Name or CPFNO to search master records..." 
                    className="bg-white border-slate-200 pl-9 h-11 text-base"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
                
                {masterQuery && (
                  <div className="absolute left-4 right-4 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-[200px] overflow-y-auto z-50 p-1">
                    {masterSearching && <div className="text-center text-xs text-slate-500 py-3">Searching...</div>}
                    {!masterSearching && masterResults.length === 0 && <div className="text-center text-xs text-slate-500 py-3">No matching master records</div>}
                    {masterResults.map((m) => (
                      <div 
                        key={m.cpfno}
                        onClick={() => {
                          setDlg(s => ({
                            ...s,
                            employee_name: m.name,
                            employee_cpfno: m.cpfno,
                            designation: m.designation || "",
                            from_loc: m.office || "",
                          }));
                          setMasterQuery("");
                          setMasterResults([]);
                        }}
                        className="p-2 hover:bg-slate-100 rounded cursor-pointer text-sm flex justify-between"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">{m.name}</span>
                          <span className="text-xs text-slate-500 ml-2">({m.designation})</span>
                        </div>
                        <span className="font-mono text-xs text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded">CPF: {m.cpfno}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-sm font-semibold text-slate-700">Order No</Label>
                  <Input value={dlg.order_no} onChange={(e) => setDlg(s => ({...s, order_no: e.target.value}))} className="bg-slate-50 border-slate-200 mt-1 h-11 text-base" data-testid="order-no-input"/></div>
                <div><Label className="text-sm font-semibold text-slate-700">Date</Label>
                  <Input type="date" value={dlg.order_date} onChange={(e) => setDlg(s => ({...s, order_date: e.target.value}))} className="bg-slate-50 border-slate-200 mt-1 h-11 text-base"/></div>
                <div><Label className="text-sm font-semibold text-slate-700">Type</Label>
                  <Select value={dlg.type} onValueChange={(v) => setDlg(s => ({...s, type: v}))}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 mt-1 h-11 text-base"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="OUT">OUT (transferring out of Pune Zone)</SelectItem>
                      <SelectItem value="IN">IN (transferring into Pune Zone)</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label className="text-sm font-semibold text-slate-700">Employee Name</Label>
                  <Input value={dlg.employee_name} onChange={(e) => setDlg(s => ({...s, employee_name: e.target.value}))} className="bg-slate-50 border-slate-200 mt-1 h-11 text-base"/></div>
                <div><Label className="text-sm font-semibold text-slate-700">Employee CPFNO</Label>
                  <Input value={dlg.employee_cpfno} onChange={(e) => setDlg(s => ({...s, employee_cpfno: e.target.value}))} className="bg-slate-50 border-slate-200 mt-1 h-11 text-base"/></div>
                <div><Label className="text-sm font-semibold text-slate-700">Designation</Label>
                  <Input value={dlg.designation} onChange={(e) => setDlg(s => ({...s, designation: e.target.value}))} className="bg-slate-50 border-slate-200 mt-1 h-11 text-base"/></div>
                <div><Label className="text-sm font-semibold text-slate-700">From Location</Label>
                  <Input value={dlg.from_loc} onChange={(e) => setDlg(s => ({...s, from_loc: e.target.value}))} className="bg-slate-50 border-slate-200 mt-1 h-11 text-base"/></div>
                <div><Label className="text-sm font-semibold text-slate-700">To Location</Label>
                  <Input value={dlg.to_loc} onChange={(e) => setDlg(s => ({...s, to_loc: e.target.value}))} className="bg-slate-50 border-slate-200 mt-1 h-11 text-base"/></div>
                <div className="col-span-2"><Label className="text-sm font-semibold text-slate-700">Remarks</Label>
                  <Input value={dlg.remarks} onChange={(e) => setDlg(s => ({...s, remarks: e.target.value}))} className="bg-slate-50 border-slate-200 mt-1 h-11 text-base"/></div>
                <div className="col-span-2 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDlg(null)} className="h-11">Cancel</Button>
                  <Button onClick={save} className="btn-primary h-11 text-base" data-testid="order-save-btn">Save</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
