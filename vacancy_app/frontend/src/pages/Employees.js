import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Upload, Trash2, Pencil, Users2 } from "lucide-react";

const blank = { name: "", cpfno: "", doj: "", designation: "", orgname: "", circle: "", division: "", paygroup: "", remarks: "" };

export default function Employees() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [dlg, setDlg] = useState(null);
  const [busy, setBusy] = useState(false);
  
  // Search Master Employee states
  const [masterQuery, setMasterQuery] = useState("");
  const [masterResults, setMasterResults] = useState([]);
  const [masterSearching, setMasterSearching] = useState(false);

  // Filter states
  const [filterCircle, setFilterCircle] = useState("All");
  const [filterDivision, setFilterDivision] = useState("All");
  const [filterDesignation, setFilterDesignation] = useState("All");
  const [opts, setOpts] = useState({ cadres: [], paygroups: [], circles: [], divisions: [], designations: [] });
  
  // Location autocomplete search states
  const [locations, setLocations] = useState([]);
  const [locSearch, setLocSearch] = useState("");

  // Load circles, divisions, designations & locations list on mount
  useEffect(() => {
    (async () => {
      try {
        const [o, l] = await Promise.all([
          api.get("/filter-options"),
          api.get("/locations")
        ]);
        setOpts(o.data);
        setLocations(l.data);
      } catch (e) {
        toast.error("Failed to load options or locations");
      }
    })();
  }, []);

  // Debounced master employees search
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

  // Load employees list based on filters
  const reload = async () => {
    const params = {};
    if (q) params.q = q;
    if (filterCircle !== "All") params.circle = filterCircle;
    if (filterDivision !== "All") params.division = filterDivision;
    if (filterDesignation !== "All") params.designation = filterDesignation;
    try {
      const { data } = await api.get("/employees", { params });
      setList(data);
    } catch {
      toast.error("Failed to load employees list");
    }
  };

  useEffect(() => {
    reload();
  }, [q, filterCircle, filterDivision, filterDesignation]);

  // Filter locations dynamically locally
  const filteredLocs = useMemo(() => {
    if (!locSearch.trim()) return [];
    const query = locSearch.toLowerCase();
    const seen = new Set();
    const result = [];
    locations.forEach(l => {
      if (l.ORGNAME && !seen.has(l.ORGNAME) && (
        l.ORGNAME.toLowerCase().includes(query) ||
        (l.CIRCLE && l.CIRCLE.toLowerCase().includes(query)) ||
        (l.DIVISION && l.DIVISION.toLowerCase().includes(query))
      )) {
        result.push(l);
        seen.add(l.ORGNAME);
      }
    });
    return result.slice(0, 15);
  }, [locations, locSearch]);

  const save = async () => {
    setBusy(true);
    try {
      if (dlg.id) await api.put(`/employees/${dlg.id}`, dlg);
      else await api.post("/employees", dlg);
      toast.success("Saved"); setDlg(null); reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this employee?")) return;
    try { await api.delete(`/employees/${id}`); toast.success("Deleted"); reload(); }
    catch (e) { toast.error("Failed"); }
  };

  const upload = async (file) => {
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/employees/bulk-upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Loaded ${data.inserted} rows`); reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Upload failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
            <Users2 className="w-4 h-4" /> REGISTER
          </div>
          <h1 className="font-display text-4xl font-extrabold text-slate-800 mt-1 tracking-tight">Employees</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <>
              <label className="inline-flex items-center gap-2 px-4 h-11 bg-white border border-slate-300 rounded-md text-base cursor-pointer hover:bg-slate-50 font-medium" data-testid="emp-bulk-upload">
                <Upload className="w-4 h-4" /> Bulk Upload Excel
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files[0] && upload(e.target.files[0])} />
              </label>
              <Button onClick={() => setDlg({ ...blank })} className="btn-primary h-11 text-base" data-testid="emp-add-btn">
                <Plus className="w-4 h-4 mr-1" /> Add Employee
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Cascading Filter Bar */}
      <div className="surface-card p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label className="text-sm font-semibold text-slate-700">Search Name/CPFNO/Office</Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type search query..."
                   className="pl-9 bg-white border-slate-200 h-11 text-base" data-testid="emp-search"/>
          </div>
        </div>
        <div>
          <Label className="text-sm font-semibold text-slate-700">Circle</Label>
          <Select value={filterCircle} onValueChange={setFilterCircle}>
            <SelectTrigger className="mt-1.5 bg-slate-50 border-slate-200 h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-[300px]">
              <SelectItem value="All">All Circles</SelectItem>
              {opts.circles.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-semibold text-slate-700">Division</Label>
          <Select value={filterDivision} onValueChange={setFilterDivision}>
            <SelectTrigger className="mt-1.5 bg-slate-50 border-slate-200 h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-[300px]">
              <SelectItem value="All">All Divisions</SelectItem>
              {opts.divisions.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-semibold text-slate-700">Designation</Label>
          <Select value={filterDesignation} onValueChange={setFilterDesignation}>
            <SelectTrigger className="mt-1.5 bg-slate-50 border-slate-200 h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-[300px]">
              <SelectItem value="All">All Designations</SelectItem>
              {opts.designations.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex justify-between text-sm text-slate-600 font-bold bg-slate-50">
          <span>Showing <span className="text-slate-900 font-black">{list.length}</span> active employees (matches, limit 500)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead className="bg-slate-50"><tr className="text-slate-600 text-xs tracking-wider uppercase">
              {["Name", "CPFNO", "Designation", "Office", "Circle", "DOJ", "Remarks", ""].map(h => <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan="8" className="text-center text-slate-500 py-12">No matching employees found — adjust your filters.</td></tr>}
              {list.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-5 py-4 text-slate-800 font-semibold">{e.name}</td>
                  <td className="px-5 py-4 font-mono text-slate-600">{e.cpfno}</td>
                  <td className="px-5 py-4 text-slate-700">{e.designation}</td>
                  <td className="px-5 py-4 text-slate-600">{e.orgname}</td>
                  <td className="px-5 py-4 text-slate-500 text-sm">{e.circle}</td>
                  <td className="px-5 py-4 text-slate-500 text-sm">{e.doj}</td>
                  <td className="px-5 py-4 text-slate-500 text-sm">{e.remarks}</td>
                  <td className="px-5 py-4 text-right">
                    {isAdmin && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setDlg(e)} className="text-indigo-600 hover:bg-indigo-50"><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => del(e.id)} className="text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!dlg} onOpenChange={(o) => { if (!o) { setDlg(null); setMasterQuery(""); setMasterResults([]); setLocSearch(""); } }}>
        <DialogContent className="bg-white text-slate-800 max-w-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">{dlg?.id ? "Edit" : "Add"} Employee</DialogTitle></DialogHeader>
          {dlg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Autofill from Master */}
                <div className="border border-indigo-100 bg-indigo-50/50 p-4 rounded-xl relative col-span-2">
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
                    <div className="absolute left-4 right-4 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-[180px] overflow-y-auto z-50 p-1">
                      {masterSearching && <div className="text-center text-xs text-slate-500 py-3">Searching...</div>}
                      {!masterSearching && masterResults.length === 0 && <div className="text-center text-xs text-slate-500 py-3">No matching master records</div>}
                      {masterResults.map((m) => (
                        <div 
                          key={m.cpfno}
                          onClick={() => {
                            setDlg(s => ({
                              ...s,
                              name: m.name,
                              cpfno: m.cpfno,
                              designation: m.designation || "",
                              orgname: m.office || "",
                              circle: m.circle || "",
                              division: m.division || "",
                              remarks: m.remarks || "",
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

                {/* Location Search Autofill */}
                <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl relative col-span-2">
                  <Label className="text-sm font-bold text-slate-700 block mb-1">
                    🔍 Search and Link Target Office / Location
                  </Label>
                  <div className="relative">
                    <Input 
                      value={locSearch} 
                      onChange={(e) => setLocSearch(e.target.value)} 
                      placeholder="Search office name, circle, or division to link..." 
                      className="bg-white border-slate-200 pl-9 h-11 text-base"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  
                  {locSearch && (
                    <div className="absolute left-4 right-4 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-[180px] overflow-y-auto z-50 p-1">
                      {filteredLocs.length === 0 && <div className="text-center text-xs text-slate-500 py-3">No matching offices found</div>}
                      {filteredLocs.map((l, i) => (
                        <div 
                          key={i}
                          onClick={() => {
                            setDlg(s => ({
                              ...s,
                              orgname: l.ORGNAME,
                              circle: l.CIRCLE || "",
                              division: l.DIVISION || "",
                            }));
                            setLocSearch("");
                          }}
                          className="p-2 hover:bg-slate-100 rounded cursor-pointer text-sm flex justify-between"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{l.ORGNAME}</span>
                            <span className="text-xs text-slate-500 ml-2">({l.CIRCLE})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Name", "name"], ["CPFNO", "cpfno"], ["DOJ", "doj"], ["Designation", "designation"],
                  ["Office (ORGNAME)", "orgname"], ["Circle", "circle"], ["Division", "division"],
                  ["Paygroup (1-4)", "paygroup"], ["Remarks", "remarks"],
                ].map(([lbl, k]) => (
                  <div key={k} className={k === "remarks" ? "col-span-2" : ""}>
                    <Label className="text-sm font-semibold text-slate-700">{lbl}</Label>
                    <Input value={dlg[k] || ""} onChange={(e) => setDlg(s => ({ ...s, [k]: e.target.value }))}
                           className="bg-slate-50 border-slate-200 mt-1 h-11 text-base" data-testid={`emp-field-${k}`}/>
                  </div>
                ))}
                <div className="col-span-2 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setDlg(null)} className="h-11">Cancel</Button>
                  <Button onClick={save} disabled={busy} className="btn-primary h-11 text-base" data-testid="emp-save-btn">Save</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
