import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { api, API } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Plus, RefreshCcw, Pencil, ArrowRight, Upload, Search, AlertTriangle, Trash2, Layers, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

const PAYGROUP_LABEL = { "1": "Class‑I", "2": "Class‑II", "3": "Class‑III", "4": "Class‑IV" };
const CLASS_COLOR = {
  "1": "bg-purple-100 text-purple-700",
  "2": "bg-indigo-100 text-indigo-700",
  "3": "bg-emerald-100 text-emerald-700",
  "4": "bg-orange-100 text-orange-700",
};

function KPI({ label, value, subtitle, variant, icon: Icon }) {
  return (
    <div className={`kpi-card kpi-${variant}`}>
      <div className="flex justify-between items-start">
        <div className="text-xs tracking-wider uppercase text-slate-600 font-semibold">{label}</div>
        {Icon && <Icon className="w-5 h-5 text-slate-400" />}
      </div>
      <div className="mt-3 font-display text-4xl font-bold text-slate-800">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}

export default function Vacancy() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [locations, setLocations] = useState([]);
  const [pool, setPool] = useState([]);
  const [opts, setOpts] = useState({ cadres: [], paygroups: [], circles: [], divisions: [], designations: [] });

  const [f, setF] = useState({ cadre: "All", paygroup: "All", type: "All", circle: "All", division: "All", designation: "All" });
  const [statusFilter, setStatusFilter] = useState("all"); // all | vacant | filled | surplus
  const [searched, setSearched] = useState(false);

  const [outDlg, setOutDlg] = useState(null);
  const [poolDlg, setPoolDlg] = useState(false);
  const [poolDes, setPoolDes] = useState("");
  const [deployDlg, setDeployDlg] = useState(null);
  const [deployOrg, setDeployOrg] = useState("");
  const [adjDlg, setAdjDlg] = useState(null);
  const [resetDlg, setResetDlg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deploySearch, setDeploySearch] = useState("");
  const [staffDlg, setStaffDlg] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [quickAddDlg, setQuickAddDlg] = useState(null);
  const [masterQuery, setMasterQuery] = useState("");
  const [masterResults, setMasterResults] = useState([]);
  const [masterSearching, setMasterSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unmatchedLocs, setUnmatchedLocs] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [resolveDlg, setResolveDlg] = useState(null);
  const [resolveTarget, setResolveTarget] = useState("");
  const [resolveSearch, setResolveSearch] = useState("");
  const [changeLocDlg, setChangeLocDlg] = useState(null);
  const [changeLocSearch, setChangeLocSearch] = useState("");
  const [changeLocTarget, setChangeLocTarget] = useState("");

  const openDeploy = (designation) => {
    setDeployDlg(designation);
    setDeployOrg("");
    setDeploySearch("");
  };

  const openStaffDlg = async (loc) => {
    setStaffDlg(loc);
    setStaffList([]);
    setStaffLoading(true);
    try {
      const { data } = await api.get("/locations/staff", {
        params: { orgname: loc.ORGNAME, designation: loc.DESIGNATION }
      });
      setStaffList(data);
    } catch (e) {
      toast.error("Failed to load staff list");
    } finally {
      setStaffLoading(false);
    }
  };

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

  const deployTargetLocs = useMemo(() => {
    if (!deployDlg) return [];
    let list = locations.filter(l => l.DESIGNATION === deployDlg);
    const sampleLoc = locations.find(l => l.DESIGNATION === deployDlg);
    const isClass3or4 = sampleLoc && (String(sampleLoc.PAYGROUP) === "3" || String(sampleLoc.PAYGROUP) === "4");
    if (isClass3or4) {
      const circleOffices = locations.filter(l => 
        l.ORGNAME === "Ganeshkhind Urban Circle" ||
        l.ORGNAME === "Pune Rural Circle" ||
        l.ORGNAME === "Rastapeth Urban Circle"
      );
      const seen = new Set(list.map(l => l.ORGNAME));
      circleOffices.forEach(co => {
        if (!seen.has(co.ORGNAME)) {
          list.push({
            ...co,
            DESIGNATION: deployDlg,
            KEY: `${co.ORGNAME.trim()}_${deployDlg.trim()}`.toUpperCase(),
            SANCTIONED: 0,
            FILLED_IN: 0,
            OUT_COUNT: 0,
            IN_COUNT: 0,
            ACTIVE_FILLED: 0,
            NET_VACANCY: 0
          });
          seen.add(co.ORGNAME);
        }
      });
    }
    return list;
  }, [deployDlg, locations]);

  const filteredDeployLocs = useMemo(() => {
    if (!deploySearch.trim()) return deployTargetLocs;
    const q = deploySearch.toLowerCase();
    return deployTargetLocs.filter(l => 
      (l.ORGNAME && l.ORGNAME.toLowerCase().includes(q)) ||
      (l.CIRCLE && l.CIRCLE.toLowerCase().includes(q)) ||
      (l.DIVISION && l.DIVISION.toLowerCase().includes(q))
    );
  }, [deployTargetLocs, deploySearch]);

  const filteredResolveLocs = useMemo(() => {
    const list = opts.orgnames || [];
    if (!resolveSearch.trim()) return list;
    const q = resolveSearch.toLowerCase();
    return list.filter(org => org.toLowerCase().includes(q));
  }, [opts.orgnames, resolveSearch]);

  const targetDetails = useMemo(() => {
    if (!resolveTarget) return null;
    const match = locations.find(l => l.ORGNAME === resolveTarget);
    return match ? { circle: match.CIRCLE, division: match.DIVISION } : null;
  }, [resolveTarget, locations]);

  const filteredChangeLocs = useMemo(() => {
    const list = opts.orgnames || [];
    if (!changeLocSearch.trim()) return list;
    const q = changeLocSearch.toLowerCase();
    return list.filter(org => org.toLowerCase().includes(q));
  }, [opts.orgnames, changeLocSearch]);

  const changeLocTargetDetails = useMemo(() => {
    if (!changeLocTarget) return null;
    const match = locations.find(l => l.ORGNAME === changeLocTarget);
    return match ? { circle: match.CIRCLE, division: match.DIVISION } : null;
  }, [changeLocTarget, locations]);

  const reload = async () => {
    setLoading(true);
    try {
      const [locs, p, o, unm, maps] = await Promise.all([
        api.get("/locations"), api.get("/transfers/in/pool"), api.get("/filter-options"), api.get("/locations/unmatched"), api.get("/locations/mappings")
      ]);
      setLocations(locs.data); setPool(p.data); setOpts(o.data); setUnmatchedLocs(unm.data); setMappings(maps.data);
    } catch (e) { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    return locations.filter(r =>
      (f.cadre === "All" || r.CADRE === f.cadre) &&
      (f.paygroup === "All" || String(r.PAYGROUP) === f.paygroup) &&
      (f.type === "All" || r.TYPE === f.type) &&
      (f.circle === "All" || r.CIRCLE === f.circle) &&
      (f.division === "All" || r.DIVISION === f.division) &&
      (f.designation === "All" || r.DESIGNATION === f.designation) &&
      (statusFilter === "all" ||
        (statusFilter === "vacant" && r.NET_VACANCY > 0) ||
        (statusFilter === "filled" && r.NET_VACANCY === 0) ||
        (statusFilter === "surplus" && r.NET_VACANCY < 0))
    );
  }, [locations, f, statusFilter]);

  const cascading = useMemo(() => {
    const c = (field, prev) => [...new Set(locations.filter(prev).map(r => String(r[field])).filter(v => v && v !== "None" && v !== "null" && v !== "undefined"))].sort();
    const pCadre = () => true;
    const pPay = (r) => f.cadre === "All" || r.CADRE === f.cadre;
    const pType = (r) => pPay(r) && (f.paygroup === "All" || String(r.PAYGROUP) === f.paygroup);
    const pCircle = (r) => pType(r) && (f.type === "All" || r.TYPE === f.type);
    const pDiv = (r) => pCircle(r) && (f.circle === "All" || r.CIRCLE === f.circle);
    const pDes = (r) => pDiv(r) && (f.division === "All" || r.DIVISION === f.division);
    return { cadres: c("CADRE", pCadre), paygroups: c("PAYGROUP", pPay), types: c("TYPE", pType), circles: c("CIRCLE", pCircle), divisions: c("DIVISION", pDiv), designations: c("DESIGNATION", pDes) };
  }, [locations, f]);

  // Totals from full dataset for top KPIs
  const totals = useMemo(() => {
    const list = searched ? filtered : locations;
    let s = 0, ac = 0, o = 0, i = 0, v = 0;
    list.forEach(r => { s += +r.SANCTIONED || 0; ac += r.ACTIVE_FILLED; o += r.OUT_COUNT; i += r.IN_COUNT; v += r.NET_VACANCY; });
    const poolSum = pool.reduce((a, p) => a + (p.count || 0), 0);
    return { s, ac, o, i, v, poolSum };
  }, [filtered, locations, pool, searched]);

  const onSearch = () => {
    if (Object.values(f).every(v => v === "All")) return toast.error("Please pick at least one filter");
    setSearched(true);
  };
  const onClear = () => { setF({ cadre: "All", paygroup: "All", type: "All", circle: "All", division: "All", designation: "All" }); setSearched(false); };

  const handleSetOut = async (val) => {
    if (!outDlg) return;
    try {
      await api.put("/transfers/out", { orgname: outDlg.orgname, designation: outDlg.designation, count: +val || 0 });
      toast.success("Updated"); setOutDlg(null); reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const downloadPdf = () => {
    const qs = new URLSearchParams({ ...f, status: statusFilter });
    const url = `${API}/report/pdf?${qs.toString()}`;
    const t = localStorage.getItem("pz_token");
    fetch(url, { headers: { Authorization: `Bearer ${t}` }, credentials: "include" })
      .then(r => r.blob())
      .then(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `PuneZone_Vacancy_${Date.now()}.pdf`; a.click(); });
  };

  const downloadExcel = () => {
    const qs = new URLSearchParams({ ...f, status: statusFilter });
    const url = `${API}/report/excel?${qs.toString()}`;
    const t = localStorage.getItem("pz_token");
    fetch(url, { headers: { Authorization: `Bearer ${t}` }, credentials: "include" })
      .then(r => r.blob())
      .then(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `PuneZone_Vacancy_${Date.now()}.xlsx`; a.click(); });
  };

  const uploadBaseExcel = async (file) => {
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/locations/bulk-upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Loaded ${data.loaded} rows`); reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Upload failed"); }
  };

  const downloadTemplate = () => {
    const headers = [["REGION", "ZONE", "CIRCLE", "DIVISION", "SUBDIVISION", "ORGNAME", "CADRE", "PAYGROUP", "TYPE", "DESIGNATION", "SANCTIONED", "FILLED_IN"]];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Vacancy_Upload_Template.xlsx");
  };

  const resetAll = async () => {
    try {
      const { data } = await api.delete("/transfers/reset");
      toast.success(`Cleared ${data.out} OUT, ${data.pool} POOL, ${data.deployed} IN deployments`);
      setResetDlg(false); reload();
    } catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="space-y-8 text-slate-900">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl p-8 text-white"
           style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #2563EB 100%)" }}>
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-blue-300/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm font-bold text-white/90 mb-1 tracking-wider uppercase">Dashboard · Pune Zone</div>
            <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight">Vacancy Ledger</h1>
            <p className="text-white/85 mt-2 text-base font-medium">Live transferee tracking — {locations.length} location‑designation rows under your control.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={reload} className="h-11 text-base bg-white/10 border-white/20 text-white hover:bg-white/20 font-semibold" data-testid="refresh-btn">
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={downloadExcel} className="h-11 text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 font-semibold" data-testid="export-excel-btn">
              <Download className="w-4 h-4 mr-2" /> Export Excel
            </Button>
            <Button onClick={downloadPdf} className="h-11 text-base bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 font-semibold" data-testid="export-pdf-btn">
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </Button>
            {isAdmin && (
              <>
                <Button onClick={() => setResetDlg(true)} className="h-11 text-base bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 font-semibold" data-testid="reset-transfers-btn">
                  <Trash2 className="w-4 h-4 mr-2" /> Reset Transfers
                </Button>
                <Button onClick={downloadTemplate} className="h-11 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 font-semibold" data-testid="download-template-btn">
                  <Download className="w-4 h-4 mr-2" /> Template
                </Button>
                <label className="inline-flex items-center gap-2 px-4 h-11 bg-white/10 border border-white/20 rounded-md text-base cursor-pointer hover:bg-white/20 font-semibold text-white" data-testid="upload-base-btn">
                  <Upload className="w-4 h-4" /> Replace Base
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files[0] && uploadBaseExcel(e.target.files[0])} />
                </label>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPI label="Sanctioned" value={totals.s} variant="indigo" subtitle="Total posts" />
        <KPI label="Active Filled" value={totals.ac} variant="emerald" subtitle="After IN/OUT" />
        <KPI label="Incoming Pool" value={totals.poolSum} variant="sky" subtitle="Awaiting deploy" icon={ArrowDownToLine} />
        <KPI label="Outbound" value={totals.o} variant="rose" subtitle="Transferring out" icon={ArrowUpFromLine} />
        <KPI label="Net Vacancy" value={totals.v} variant={totals.v >= 0 ? "orange" : "amber"} subtitle={totals.v >= 0 ? "Open posts" : "Surplus"} />
      </div>

      {/* Filters */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-blue-700" />
          <h2 className="font-heading text-lg text-slate-900">Search vacancy</h2>
          <span className="text-sm text-slate-500">— pick any filter then click Search</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          {[
            ["Cadre", "cadre", cascading.cadres],
            ["Class (Paygroup)", "paygroup", cascading.paygroups],
            ["Type (HR/Acc/Tech)", "type", cascading.types],
            ["Circle", "circle", cascading.circles],
            ["Division", "division", cascading.divisions],
            ["Designation", "designation", cascading.designations],
          ].map(([label, key, list]) => (
            <div key={key}>
              <Label className="text-sm font-semibold text-slate-700">{label}</Label>
              <Select value={f[key]} onValueChange={(v) => setF(s => ({ ...s, [key]: v }))}>
                <SelectTrigger className="mt-1.5 bg-slate-50 border-slate-200 h-11 text-base text-slate-900" data-testid={`filter-${key}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900 max-h-[300px]">
                  <SelectItem value="All">All</SelectItem>
                  {list.map(x => (
                    <SelectItem key={x} value={x}>{key === "paygroup" ? (PAYGROUP_LABEL[x] || x) : x}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button onClick={onSearch} className="bg-blue-700 hover:bg-blue-800 text-white h-11 text-base px-6 font-bold shadow-md" data-testid="search-btn">
            <Search className="w-4 h-4 mr-2" /> Search
          </Button>
          <Button onClick={onClear} variant="outline" className="h-11 text-base border-slate-300 font-semibold text-slate-700 hover:bg-slate-100">Clear</Button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Show:</span>
            {[
              ["all", "All", "bg-slate-100 text-slate-700", "bg-slate-800 text-white"],
              ["vacant", "Only Vacant", "bg-orange-50 text-orange-700", "bg-orange-600 text-white"],
              ["filled", "Only Full", "bg-emerald-50 text-emerald-700", "bg-emerald-600 text-white"],
              ["surplus", "Only Surplus", "bg-amber-50 text-amber-700", "bg-amber-600 text-white"],
            ].map(([k, lbl, inactive, active]) => (
              <button key={k} onClick={() => setStatusFilter(k)}
                      data-testid={`status-${k}`}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition ${statusFilter === k ? active : inactive + " hover:opacity-80"}`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="ledger" className="w-full">
        <TabsList className="bg-white text-slate-900 border border-slate-200 p-1.5 rounded-xl h-auto">
          <TabsTrigger value="ledger" className="tab-pill text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 font-bold" data-testid="tab-ledger">
            <Layers className="w-4 h-4 mr-2" /> Location Ledger
          </TabsTrigger>
          <TabsTrigger value="pool" className="tab-pill text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800 font-bold" data-testid="tab-pool">
            <ArrowDownToLine className="w-4 h-4 mr-2" /> Zone Pool IN ({pool.length})
          </TabsTrigger>
          <TabsTrigger value="out" className="tab-pill text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-rose-100 data-[state=active]:text-rose-800 font-bold" data-testid="tab-out">
            <ArrowUpFromLine className="w-4 h-4 mr-2" /> Out of Zone
          </TabsTrigger>
          <TabsTrigger value="unmatched" className="tab-pill text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800 font-bold" data-testid="tab-unmatched">
            <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" /> Unmatched Locations ({Array.isArray(unmatchedLocs) ? unmatchedLocs.length : 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="mt-5">
          {!searched ? (
            <div className="surface-card p-16 text-center">
              <Search className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-heading text-xl font-bold text-slate-800 mt-4">Pick a filter & click Search</p>
              <p className="text-slate-500 mt-1">Vacancy table is hidden by default to keep the page fast. Choose at least one filter above to view results.</p>
            </div>
          ) : (
            <div className="surface-card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex justify-between text-sm text-slate-600 font-bold bg-slate-50">
                <span>Showing <span className="text-slate-900 font-black">{filtered.length}</span> locations</span>
                {loading && <span>Loading…</span>}
              </div>
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full text-base">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="text-slate-700 text-xs tracking-wider uppercase font-bold">
                      {["Office", "Circle", "Division", "Designation", "Class", "Sanc", "Base", "OUT", "IN", "Active", "Vacancy", ""].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-black">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && <tr><td colSpan="12" className="text-center text-slate-500 py-12">No records match the current filters</td></tr>}
                    {filtered.map((r, idx) => (
                      <tr key={r.KEY + idx} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-4 py-3 text-slate-800 font-medium">{r.ORGNAME}</td>
                        <td className="px-4 py-3 text-slate-600 text-sm">{r.CIRCLE}</td>
                        <td className="px-4 py-3 text-slate-600 text-sm">{r.DIVISION}</td>
                        <td className="px-4 py-3 text-slate-700">{r.DESIGNATION}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${CLASS_COLOR[String(r.PAYGROUP)] || "bg-slate-100 text-slate-700"}`}>
                            {PAYGROUP_LABEL[String(r.PAYGROUP)] || r.PAYGROUP}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold">{r.SANCTIONED}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{r.FILLED_IN}</td>
                        <td className="px-4 py-3 font-mono text-rose-600 font-semibold">{r.OUT_COUNT}</td>
                        <td className="px-4 py-3 font-mono text-emerald-600 font-semibold">{r.IN_COUNT}</td>
                        <td className="px-4 py-3 font-mono font-semibold">{r.ACTIVE_FILLED}</td>
                        <td className="px-4 py-3 font-mono">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${r.NET_VACANCY > 0 ? "bg-orange-100 text-orange-700" : r.NET_VACANCY < 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {r.NET_VACANCY > 0 ? `${r.NET_VACANCY} Vacant` : r.NET_VACANCY < 0 ? `${Math.abs(r.NET_VACANCY)} Surplus` : "Full"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="text-emerald-600 hover:bg-emerald-50 font-semibold"
                                    onClick={() => openStaffDlg(r)}
                                    data-testid={`btn-staff-${idx}`}>Staff</Button>
                            <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 font-semibold"
                                    onClick={() => setOutDlg({ orgname: r.ORGNAME, designation: r.DESIGNATION, current: r.OUT_COUNT })}
                                    data-testid={`btn-out-${idx}`}>OUT</Button>
                            {isAdmin && (
                              <Button size="sm" variant="ghost" className="text-indigo-600 hover:bg-indigo-50" onClick={() => setAdjDlg(r)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pool" className="mt-5 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-600">Add transferees coming into Pune Zone, then deploy them to specific offices.</p>
            <Button onClick={() => setPoolDlg(true)} className="btn-primary h-11 text-base" data-testid="add-pool-btn">
              <Plus className="w-4 h-4 mr-1" /> Add to Pool
            </Button>
          </div>
          <div className="surface-card overflow-hidden">
            <table className="w-full text-base">
              <thead className="bg-slate-50"><tr className="text-slate-600 text-xs tracking-wider uppercase">
                <th className="px-5 py-3 text-left font-semibold">Designation</th>
                <th className="px-5 py-3 text-left font-semibold">Pool Count</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr></thead>
              <tbody>
                {pool.length === 0 && <tr><td colSpan="3" className="text-center text-slate-500 py-10">No incoming transferees in pool</td></tr>}
                {pool.map(p => (
                  <tr key={p.designation} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-medium text-slate-800">{p.designation}</td>
                    <td className="px-5 py-4 font-mono text-xl font-bold text-emerald-600">{p.count}</td>
                    <td className="px-5 py-4 text-right">
                      <Button size="sm" onClick={() => openDeploy(p.designation)} className="btn-primary">
                        Deploy <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="out" className="mt-5">
          <p className="text-slate-600 mb-4">Currently transferring out of Pune Zone (filtered by your search above).</p>
          <div className="surface-card overflow-hidden">
            <table className="w-full text-base">
              <thead className="bg-slate-50"><tr className="text-slate-600 text-xs tracking-wider uppercase">
                <th className="px-5 py-3 text-left font-semibold">Office</th>
                <th className="px-5 py-3 text-left font-semibold">Designation</th>
                <th className="px-5 py-3 text-left font-semibold">OUT</th>
              </tr></thead>
              <tbody>
                {(searched ? filtered : locations).filter(r => r.OUT_COUNT > 0).length === 0 && <tr><td colSpan="3" className="text-center text-slate-500 py-10">No outbound entries</td></tr>}
                {(searched ? filtered : locations).filter(r => r.OUT_COUNT > 0).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-5 py-4 text-slate-800 font-medium">{r.ORGNAME}</td>
                    <td className="px-5 py-4 text-slate-700">{r.DESIGNATION}</td>
                    <td className="px-5 py-4 font-mono text-xl font-bold text-rose-600">{r.OUT_COUNT}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="unmatched" className="mt-5 space-y-6">
          {(() => {
            const safeUnmatchedLocs = Array.isArray(unmatchedLocs) ? unmatchedLocs : [];
            const safeMappings = Array.isArray(mappings) ? mappings : [];
            return (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-slate-600">Handle ongoing system spelling differences between portals. Resolve current mismatches or manage active mapping rules.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Card: Current Unmatched Locations */}
                  <div className="surface-card p-6 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="font-heading text-lg font-bold text-slate-800">Current Mismatches ({safeUnmatchedLocs.length})</h3>
                      <span className="text-xs text-slate-500">Unmatched names in active staff list</span>
                    </div>
                    <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                      <table className="w-full text-base">
                        <thead className="bg-slate-50 text-xs text-slate-600 tracking-wider uppercase font-bold">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-black">Raw Office Name</th>
                            <th className="px-4 py-2.5 text-left font-black">Staff Count</th>
                            <th className="px-4 py-2.5 text-right font-black">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeUnmatchedLocs.length === 0 && (
                            <tr>
                              <td colSpan="3" className="text-center text-slate-500 py-12 text-sm">
                                🎉 All active employee locations are correctly matched!
                              </td>
                            </tr>
                          )}
                          {safeUnmatchedLocs.map((unm, i) => (
                            <tr key={i} className="border-t border-slate-100 text-sm hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-slate-800 font-medium">{unm.orgname}</td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-600">{unm.emp_count}</td>
                              <td className="px-4 py-3 text-right">
                                {isAdmin ? (
                                  <Button size="sm" onClick={() => {
                                    setResolveDlg(unm);
                                    setResolveTarget("");
                                    setResolveSearch("");
                                  }} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md shadow-amber-600/10" data-testid={`btn-resolve-${i}`}>
                                    Resolve
                                  </Button>
                                ) : (
                                  <span className="text-xs text-slate-400">Admin only</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Card: Persistent Mapping Ledger */}
                  <div className="surface-card p-6 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="font-heading text-lg font-bold text-slate-800">Saved Mapping Rules ({safeMappings.length})</h3>
                      <span className="text-xs text-slate-500">Auto-applied spelling corrections</span>
                    </div>
                    <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                      <table className="w-full text-base">
                        <thead className="bg-slate-50 text-xs text-slate-600 tracking-wider uppercase font-bold">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-black">Imported Spelling</th>
                            <th className="px-4 py-2.5 text-left font-black">Corrected Office</th>
                            <th className="px-4 py-2.5 text-right font-black">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeMappings.length === 0 && (
                            <tr>
                              <td colSpan="3" className="text-center text-slate-500 py-12 text-sm">
                                No active mapping rules saved yet.
                              </td>
                            </tr>
                          )}
                          {safeMappings.map((m, i) => (
                            <tr key={i} className="border-t border-slate-100 text-sm hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-slate-600 font-mono text-xs">{m.unmatched_orgname}</td>
                              <td className="px-4 py-3 text-slate-800 font-medium">{m.target_orgname}</td>
                              <td className="px-4 py-3 text-right">
                                {isAdmin ? (
                                  <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 font-bold text-xs"
                                          onClick={async () => {
                                            if (confirm(`Delete mapping for "${m.unmatched_orgname}"?`)) {
                                              try {
                                                await api.delete("/locations/mappings", { params: { unmatched_orgname: m.unmatched_orgname } });
                                                toast.success("Mapping rule removed");
                                                reload();
                                              } catch (e) {
                                                toast.error("Failed to delete mapping");
                                              }
                                            }
                                          }}
                                          data-testid={`btn-del-mapping-${i}`}>
                                    Remove
                                  </Button>
                                ) : (
                                  <span className="text-xs text-slate-400">Admin only</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* OUT Dialog */}
      <Dialog open={!!outDlg} onOpenChange={(o) => !o && setOutDlg(null)}>
        <DialogContent className="bg-white text-slate-800 max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">Set Transfer OUT count</DialogTitle></DialogHeader>
          {outDlg && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-500">Location</div>
                <div className="font-medium text-slate-800">{outDlg.orgname}</div>
                <div className="text-sm text-slate-500 mt-2">Designation</div>
                <div className="font-medium text-slate-800">{outDlg.designation}</div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Number of employees transferring OUT</Label>
                <Input type="number" min="0" defaultValue={outDlg.current} id="set-out-val"
                       className="bg-slate-50 border-slate-200 mt-1 h-12 text-lg font-mono" data-testid="out-set-input"/>
                <p className="text-xs text-slate-500 mt-1">Current: {outDlg.current}. Set to 0 to clear.</p>
              </div>
              <Button onClick={() => handleSetOut(document.getElementById("set-out-val").value)}
                      className="w-full btn-primary h-12 text-base" data-testid="out-set-btn">Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pool dialog */}
      <Dialog open={poolDlg} onOpenChange={setPoolDlg}>
        <DialogContent className="bg-white text-slate-800 max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">Add to Zone Pool (Incoming)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700">Designation</Label>
              <Select onValueChange={setPoolDes} value={poolDes}>
                <SelectTrigger className="bg-slate-50 border-slate-200 mt-1 h-12 text-base" data-testid="pool-des-select">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-[300px]">
                  {opts.designations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700">Count</Label>
              <Input type="number" min="1" id="pool-count" defaultValue="1"
                     className="bg-slate-50 border-slate-200 mt-1 h-12 text-lg font-mono" data-testid="pool-count-input"/>
            </div>
            <Button onClick={async () => {
              const count = +document.getElementById("pool-count").value;
              if (!poolDes || !count) return toast.error("Select designation and count");
              try { await api.post("/transfers/in/pool", { designation: poolDes, count }); toast.success("Added"); setPoolDlg(false); setPoolDes(""); reload(); }
              catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
            }} className="w-full btn-primary h-12 text-base" data-testid="pool-submit-btn">Add to Pool</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deploy dialog */}
      <Dialog open={!!deployDlg} onOpenChange={(o) => { if (!o) { setDeployDlg(null); setDeploySearch(""); setDeployOrg(""); } }}>
        <DialogContent className="bg-white text-slate-800 max-w-lg">
          <DialogHeader><DialogTitle className="text-xl font-bold">Deploy to Office</DialogTitle></DialogHeader>
          {deployDlg && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <div className="text-sm text-slate-500">Deploying</div>
                <div className="font-medium text-slate-800">1 × {deployDlg}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Search and Select Target Office</Label>
                <div className="relative">
                  <Input 
                    placeholder="Type office, circle, or division name..." 
                    value={deploySearch} 
                    onChange={(e) => setDeploySearch(e.target.value)}
                    className="bg-slate-50 border-slate-200 pl-9 h-11 text-base"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
                
                <div className="max-h-[250px] overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
                  {filteredDeployLocs.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-500">No matching offices found</div>
                  ) : (
                    filteredDeployLocs.map((l, i) => {
                      const isVacant = l.NET_VACANCY > 0;
                      const isSelected = deployOrg === l.ORGNAME;
                      return (
                        <div 
                          key={i} 
                          onClick={() => setDeployOrg(l.ORGNAME)}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                            isSelected 
                              ? "bg-blue-600 text-white shadow font-semibold" 
                              : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="truncate text-base">{l.ORGNAME}</div>
                            <div className={`text-xs truncate ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                              {l.CIRCLE} {l.DIVISION ? `· ${l.DIVISION}` : ""}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isSelected 
                                ? "bg-white/20 text-white" 
                                : isVacant 
                                  ? "bg-orange-100 text-orange-700" 
                                  : l.NET_VACANCY < 0 
                                    ? "bg-amber-100 text-amber-700" 
                                    : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {l.NET_VACANCY > 0 
                                ? `${l.NET_VACANCY} Vacant` 
                                : l.NET_VACANCY < 0 
                                  ? `${Math.abs(l.NET_VACANCY)} Surplus` 
                                  : "Full"
                              }
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <Button onClick={async () => {
                if (!deployOrg) return toast.error("Select office");
                try { await api.post("/transfers/in/deploy", { designation: deployDlg, orgname: deployOrg, count: 1 }); toast.success("Deployed"); setDeployDlg(null); setDeployOrg(""); setDeploySearch(""); reload(); }
                catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
              }} className="w-full btn-primary h-12 text-base" data-testid="deploy-submit-btn">Deploy 1</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjust dialog */}
      <Dialog open={!!adjDlg} onOpenChange={(o) => !o && setAdjDlg(null)}>
        <DialogContent className="bg-white text-slate-800 max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">Adjust Sanctioned / Filled</DialogTitle></DialogHeader>
          {adjDlg && (
            <div className="space-y-3">
              <div className="text-sm text-slate-500">{adjDlg.ORGNAME} · {adjDlg.DESIGNATION}</div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Sanctioned</Label>
                <Input type="number" defaultValue={adjDlg.SANCTIONED} id="adj-sanc"
                       className="bg-slate-50 border-slate-200 mt-1 h-12 text-lg font-mono"/>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">Base Filled</Label>
                <Input type="number" defaultValue={adjDlg.FILLED_IN} id="adj-fill"
                       className="bg-slate-50 border-slate-200 mt-1 h-12 text-lg font-mono"/>
              </div>
              <Button onClick={async () => {
                try {
                  await api.put("/locations/adjust", { orgname: adjDlg.ORGNAME, designation: adjDlg.DESIGNATION,
                    sanctioned: +document.getElementById("adj-sanc").value, filled_in: +document.getElementById("adj-fill").value });
                  toast.success("Updated"); setAdjDlg(null); reload();
                } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
              }} className="w-full btn-primary h-12 text-base">Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset dialog */}
      <Dialog open={resetDlg} onOpenChange={setResetDlg}>
        <DialogContent className="bg-white text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-6 h-6" /> Reset All Transfers
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-700">This will <span className="font-bold text-rose-600">permanently delete</span> all current Transfer IN pool entries, deployments and Transfer OUT counts.</p>
            <p className="text-slate-600 text-sm">Base Sanctioned/Filled values and employees are NOT affected.</p>
            <div className="flex gap-2">
              <Button onClick={() => setResetDlg(false)} variant="outline" className="flex-1 h-11">Cancel</Button>
              <Button onClick={resetAll} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white h-11" data-testid="reset-confirm-btn">
                Yes, Reset Everything
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Staff Dialog */}
      <Dialog open={!!staffDlg} onOpenChange={(o) => !o && setStaffDlg(null)}>
        <DialogContent className="bg-white text-slate-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Staff List — {staffDlg?.ORGNAME}
            </DialogTitle>
          </DialogHeader>
          {staffDlg && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-slate-700">
                <div>Designation: <span className="font-semibold">{staffDlg.DESIGNATION}</span></div>
                <div className="mt-1 flex gap-4 font-semibold text-slate-600">
                  <span>Sanctioned: <span className="text-slate-800 font-bold">{staffDlg.SANCTIONED}</span></span>
                  <span>Filled (Active): <span className="text-slate-800 font-bold">{staffDlg.ACTIVE_FILLED}</span></span>
                  <span>Registered Staff: <span className="text-slate-800 font-bold">{staffList.length}</span></span>
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-lg">
                {staffLoading ? (
                  <div className="text-center py-8 text-slate-500 text-sm">Loading staff...</div>
                ) : staffList.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No registered employees found at this office for this designation.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-bold">
                      <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">CPFNO</th>
                        <th className="px-4 py-2 text-left">DOJ</th>
                        <th className="px-4 py-2 text-left">Remarks</th>
                        {isAdmin && <th className="px-4 py-2 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map((emp, i) => (
                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-semibold text-slate-800">
                            {emp.name}
                            {emp.original_orgname && emp.original_orgname !== staffDlg?.ORGNAME && (
                              <div className="text-xs font-normal text-amber-600 font-mono mt-0.5">
                                Imported as: "{emp.original_orgname}"
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-600">{emp.cpfno}</td>
                          <td className="px-4 py-2.5 text-slate-500">{emp.doj || "—"}</td>
                          <td className="px-4 py-2.5 text-slate-500">{emp.remarks || "—"}</td>
                          {isAdmin && (
                            <td className="px-4 py-2.5 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setChangeLocDlg(emp);
                                  setChangeLocTarget("");
                                  setChangeLocSearch("");
                                }}
                                className="h-8 text-xs font-semibold text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                                data-testid={`btn-move-staff-${i}`}
                              >
                                Move
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStaffDlg(null)} className="h-11">Close</Button>
                {isAdmin && (
                  <Button 
                    onClick={() => {
                      setQuickAddDlg({
                        name: "",
                        cpfno: "",
                        doj: "",
                        designation: staffDlg.DESIGNATION,
                        orgname: staffDlg.ORGNAME,
                        circle: staffDlg.CIRCLE,
                        division: staffDlg.DIVISION,
                        paygroup: String(staffDlg.PAYGROUP),
                        remarks: ""
                      });
                      setStaffDlg(null);
                    }}
                    className="btn-primary h-11 text-base font-semibold"
                  >
                    + Add Employee
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Add Employee Dialog */}
      <Dialog open={!!quickAddDlg} onOpenChange={(o) => { if (!o) { setQuickAddDlg(null); setMasterQuery(""); setMasterResults([]); } }}>
        <DialogContent className="bg-white text-slate-800 max-w-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Add Employee to {quickAddDlg?.orgname}</DialogTitle></DialogHeader>
          {quickAddDlg && (
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
                          setQuickAddDlg(s => ({
                            ...s,
                            name: m.name,
                            cpfno: m.cpfno,
                            designation: m.designation || s.designation,
                            orgname: m.office || s.orgname,
                            circle: m.circle || s.circle,
                            division: m.division || s.division,
                            remarks: m.remarks || s.remarks,
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
                {[
                  ["Name", "name"], ["CPFNO", "cpfno"], ["DOJ", "doj"], ["Designation", "designation"],
                  ["Office (ORGNAME)", "orgname"], ["Circle", "circle"], ["Division", "division"],
                  ["Paygroup (1-4)", "paygroup"], ["Remarks", "remarks"],
                ].map(([lbl, k]) => (
                  <div key={k} className={k === "remarks" ? "col-span-2" : ""}>
                    <Label className="text-sm font-semibold text-slate-700">{lbl}</Label>
                    <Input value={quickAddDlg[k] || ""} onChange={(e) => setQuickAddDlg(s => ({ ...s, [k]: e.target.value }))}
                           className="bg-slate-50 border-slate-200 mt-1 h-11 text-base" />
                  </div>
                ))}
                <div className="col-span-2 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setQuickAddDlg(null)} className="h-11">Cancel</Button>
                  <Button onClick={async () => {
                    setBusy(true);
                    try {
                      await api.post("/employees", quickAddDlg);
                      toast.success("Employee added successfully");
                      setQuickAddDlg(null);
                      reload();
                    } catch (e) {
                      toast.error(e.response?.data?.detail || "Failed to add employee");
                    } finally {
                      setBusy(false);
                    }
                  }} disabled={busy} className="btn-primary h-11 text-base font-semibold">Save</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Unmatched Location Dialog */}
      <Dialog open={!!resolveDlg} onOpenChange={(o) => { if (!o) { setResolveDlg(null); setResolveTarget(""); setResolveSearch(""); } }}>
        <DialogContent className="bg-white text-slate-800 max-w-lg">
          <DialogHeader><DialogTitle className="text-xl font-bold flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5 text-amber-600" /> Resolve Unmatched Location
          </DialogTitle></DialogHeader>
          {resolveDlg && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-slate-700">
                <div className="font-semibold text-slate-800">Unmatched Name:</div>
                <div className="text-base font-mono text-slate-900 mt-0.5">{resolveDlg.orgname}</div>
                <div className="mt-2 text-slate-600">
                  This location is assigned to <span className="font-bold text-slate-900">{resolveDlg.emp_count}</span> employees.
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Search and Select Target Office</Label>
                <div className="relative">
                  <Input 
                    placeholder="Search baseline offices..." 
                    value={resolveSearch} 
                    onChange={(e) => setResolveSearch(e.target.value)}
                    className="bg-slate-50 border-slate-200 pl-9 h-11 text-base"
                    data-testid="resolve-search-input"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
                
                <div className="max-h-[200px] overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
                  {filteredResolveLocs.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-500">No matching offices found</div>
                  ) : (
                    filteredResolveLocs.map((org, i) => {
                      const isSelected = resolveTarget === org;
                      return (
                        <div 
                          key={i} 
                          onClick={() => setResolveTarget(org)}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition text-sm ${
                            isSelected 
                              ? "bg-blue-600 text-white shadow font-semibold" 
                              : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"
                          }`}
                          data-testid={`resolve-target-item-${i}`}
                        >
                          <div className="truncate">{org}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {targetDetails && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-slate-700">
                  <div className="font-semibold text-blue-900">Mapped Details:</div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <span className="text-slate-500 block text-xs">Circle:</span>
                      <span className="font-semibold text-slate-800">{targetDetails.circle || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Division:</span>
                      <span className="font-semibold text-slate-800">{targetDetails.division || "—"}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setResolveDlg(null)} className="flex-grow h-11">Cancel</Button>
                <Button 
                  onClick={async () => {
                    if (!resolveTarget) return toast.error("Select target office");
                    setBusy(true);
                    try {
                      const { data } = await api.post("/locations/resolve-unmatched", {
                        unmatched_orgname: resolveDlg.orgname,
                        target_orgname: resolveTarget
                      });
                      toast.success(`Successfully updated ${data.updated} employees`);
                      setResolveDlg(null);
                      setResolveTarget("");
                      setResolveSearch("");
                      reload();
                    } catch (e) {
                      toast.error(e.response?.data?.detail || "Failed to resolve location");
                    } finally {
                      setBusy(false);
                    }
                  }} 
                  disabled={busy || !resolveTarget}
                  className="flex-grow bg-amber-600 hover:bg-amber-700 text-white font-semibold h-11"
                  data-testid="resolve-submit-btn"
                >
                  Confirm & Merge
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Employee Location Dialog */}
      <Dialog open={!!changeLocDlg} onOpenChange={(o) => { if (!o) { setChangeLocDlg(null); setChangeLocTarget(""); setChangeLocSearch(""); } }}>
        <DialogContent className="bg-white text-slate-800 max-w-lg">
          <DialogHeader><DialogTitle className="text-xl font-bold flex items-center gap-2 text-blue-700">
            Change Location
          </DialogTitle></DialogHeader>
          {changeLocDlg && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                <div>Employee Name: <span className="font-semibold text-slate-900">{changeLocDlg.name}</span></div>
                <div className="mt-1">CPFNO: <span className="font-mono font-semibold text-slate-900">{changeLocDlg.cpfno}</span></div>
                <div className="mt-2 text-xs text-slate-500">
                  Current Office: <span className="font-semibold text-slate-800">{changeLocDlg.orgname}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Search New Location</Label>
                <div className="relative">
                  <Input 
                    placeholder="Search baseline offices..." 
                    value={changeLocSearch} 
                    onChange={(e) => setChangeLocSearch(e.target.value)}
                    className="bg-slate-50 border-slate-200 pl-9 h-11 text-base"
                    data-testid="change-loc-search-input"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
                
                <div className="max-h-[180px] overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
                  {filteredChangeLocs.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-500">No matching offices found</div>
                  ) : (
                    filteredChangeLocs.map((org, i) => {
                      const isSelected = changeLocTarget === org;
                      return (
                        <div 
                          key={i} 
                          onClick={() => setChangeLocTarget(org)}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition text-sm ${
                            isSelected 
                              ? "bg-blue-600 text-white shadow font-semibold" 
                              : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"
                          }`}
                          data-testid={`change-loc-target-item-${i}`}
                        >
                          <div className="truncate">{org}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {changeLocTargetDetails && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-slate-700">
                  <div className="font-semibold text-blue-900">New Location Mapped Details:</div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <span className="text-slate-500 block text-xs">Circle:</span>
                      <span className="font-semibold text-slate-800">{changeLocTargetDetails.circle || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Division:</span>
                      <span className="font-semibold text-slate-800">{changeLocTargetDetails.division || "—"}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setChangeLocDlg(null)} className="flex-grow h-11">Cancel</Button>
                <Button 
                  onClick={async () => {
                    if (!changeLocTarget) return toast.error("Select new location");
                    setBusy(true);
                    try {
                      await api.put(`/employees/${changeLocDlg.id}/location`, {
                        orgname: changeLocTarget
                      });
                      toast.success(`Successfully relocated ${changeLocDlg.name}`);
                      setChangeLocDlg(null);
                      setChangeLocTarget("");
                      setChangeLocSearch("");
                      setStaffDlg(null);
                      reload();
                    } catch (e) {
                      toast.error(e.response?.data?.detail || "Failed to change location");
                    } finally {
                      setBusy(false);
                    }
                  }} 
                  disabled={busy || !changeLocTarget}
                  className="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
                  data-testid="change-loc-submit-btn"
                >
                  Confirm & Move
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
