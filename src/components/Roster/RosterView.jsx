import { useState, useMemo, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────────────────────────────────────
// MASTER DATA  (never mutated)
// ─────────────────────────────────────────────────────────────────────────────

const CASTES = ["SC","ST","VJ-A","NT-B","NT-C","NT-D","SBC","OBC","SEBC","EWS","OPEN","TOTAL"];

// Helper to parse Excel sheets
function extractSheetData(arrayBuffer, sheetName) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const obj = {};
    obj.circle = row[0];
    obj.division = row[1] || undefined;
    obj.designation = row[2];
    obj.sanctionType = row[3];
    CASTES.forEach((caste, idx) => {
      obj[caste] = Number(row[4 + idx] || 0);
    });
    data.push(obj);
  }
  
  return data;
}

function parseRows(buf, sheet) {
  const wb2 = XLSX.read(buf, { type: "array" });
  if (!wb2.Sheets[sheet]) return { regular: [], surplus: [] };
  const ws2 = wb2.Sheets[sheet];
  const rows2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
  const header = rows2[0] || [];
  const remarkIdx = header.findIndex(h => String(h||'').toLowerCase().includes('remark'));
  const regular = [], surplus = [];
  let lastRegular = null; // track adjacency for adjustedAgainst
  for (let i = 1; i < rows2.length; i++) {
    const row = rows2[i];
    if (!row || !row[2]) continue;
    const remarkVal = remarkIdx >= 0 ? String(row[remarkIdx] || '').toLowerCase() : '';
    const isSurplus = remarkVal.includes('surp') || remarkVal.includes('supl');
    const obj = {};
    obj.circle = row[0]; obj.division = row[1] || undefined;
    obj.designation = row[2];
    obj.sanctionType = row[3] || (isSurplus ? 'Surplus (Adjusted)' : undefined);
    CASTES.forEach((c, idx) => { obj[c] = Number(row[4 + idx] || 0); });
    if (isSurplus) {
      obj.isSurplus = true;
      if (lastRegular) {
        obj.adjustedAgainst = {
          designation:  lastRegular.designation,
          sanctionType: lastRegular.sanctionType,
          circle:       lastRegular.circle,
          division:     lastRegular.division
        };
      }
      surplus.push(obj);
    } else {
      lastRegular = obj;
      regular.push(obj);
    }
  }
  return { regular, surplus };
}


// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const CIRCLES = ["RPUC","GKUC","PRC"];
const CIRCLE_FULL = {RPUC:"Rastapeth Urban Circle",GKUC:"Ganeshkhind Urban Circle",PRC:"Pune Rural Circle"};
const DIVS = {
  RPUC:["Pune Rastapeth Division","Pune Bundgarden Division","Pune Padmavati Division","Pune Parvati Division","Pune Nagar Road Division"],
  GKUC:["Pune Pimpri Division","Pune Bhosari Division","Pune Kothrud Division","Pune Shivajinagar Division"],
  PRC:["Manchar Division","Rajgurunagar Division","Pune Mulshi Division","Mulshi Division"],
};
// These are initial values, we use dynamic ones in the app
const ALL_D3 = [];
const ALL_D4 = [];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function normalize(s){ return (s||"").toString().trim().replace(/\s+/g," "); }
function rowKey(r){ return `${normalize(r.circle)}||${normalize(r.division)}||${normalize(r.designation)}||${normalize(r.sanctionType)}`; }
function vacant(s,f){ const v={...s}; CASTES.forEach(c=>{ v[c]=(s[c]||0)-(f[c]||0); }); return v; }

function buildMaps(sanctionArr, filledArr){
  const sm={}, fm={};
  sanctionArr.forEach(r=>{ 
    const key = rowKey(r);
    // Normalize the division in the stored record too for consistency
    sm[key] = { ...r, division: normalize(r.division) };
  });
  filledArr.forEach(r=>{ 
    const key = rowKey(r);
    fm[key] = { ...r, division: normalize(r.division) };
  });
  return {sm, fm};
}

function emptyRow(base){ const r={...base}; CASTES.forEach(c=>r[c]=0); return r; }

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL EXPORT  (SheetJS)
// ─────────────────────────────────────────────────────────────────────────────

const BLUE   = {fgColor:{rgb:"1E3A5F"}};
const GREEN  = {fgColor:{rgb:"15803D"}};
const RED    = {fgColor:{rgb:"B91C1C"}};
const AMBER  = {fgColor:{rgb:"92400E"}};
const LGRAY  = {fgColor:{rgb:"E2E8F0"}};
const LBLUE  = {fgColor:{rgb:"DBEAFE"}};
const LGREEN = {fgColor:{rgb:"DCFCE7"}};
const LRED   = {fgColor:{rgb:"FEE2E2"}};
const WHITE  = {fgColor:{rgb:"FFFFFF"}};

function hdr(text,fill=BLUE){
  return{v:text,t:"s",s:{font:{bold:true,color:{rgb:"FFFFFF"},name:"Arial",sz:9},fill:{patternType:"solid",...fill},alignment:{horizontal:"center",vertical:"center",wrapText:true},border:borderThin()}};
}
function hdrDark(text){return hdr(text,{fgColor:{rgb:"0F172A"}});}

function cell(val,fill,bold=false,color="000000"){
  return{v:val===null||val===undefined?0:val,t:typeof val==="number"?"n":"s",
    s:{font:{name:"Arial",sz:9,bold,color:{rgb:color}},
       fill:fill?{patternType:"solid",...fill}:{patternType:"none"},
       alignment:{horizontal:typeof val==="number"?"center":"left",vertical:"center"},
       border:borderThin()}};
}
function numCell(val,fill,bold=false,red=false){
  const v=val||0;
  return{v,t:"n",s:{font:{name:"Arial",sz:9,bold,color:{rgb:v<0?"7C3AED":red&&v>0?"B91C1C":"1E293B"}},
    fill:fill?{patternType:"solid",...fill}:{patternType:"none"},
    alignment:{horizontal:"center",vertical:"center"},border:borderThin()}};
}
function borderThin(){
  const b={style:"thin",color:{rgb:"CBD5E1"}};
  return{top:b,bottom:b,left:b,right:b};
}

function buildSheet(rows, classNum, month, year){
  // rows: [{circle, division?, designation, sanctionType, sanction:{}, filled:{}, vacant:{}}]
  const isIV = classNum===4;
  const ws={};
  const cols = isIV
    ? ["Circle","Division","Designation","Sanction Type","Type",...CASTES]
    : ["Circle","Designation","Sanction Type","Type",...CASTES];

  let R=0;

  // Title row
  const title = `MSEDCL PUNE ZONE — CLASS ${classNum===3?"III":"IV"} EMPLOYEE 100-POINT BACKLOG ROSTER | ${month} ${year}`;
  ws[XLSX.utils.encode_cell({r:R,c:0})] = {v:title,t:"s",s:{font:{bold:true,name:"Arial",sz:11,color:{rgb:"FFFFFF"}},fill:{patternType:"solid",...BLUE},alignment:{horizontal:"center",vertical:"center"}}};
  R++;

  // Sub title
  ws[XLSX.utils.encode_cell({r:R,c:0})] = {v:`Pune Zone · RPUC · GKUC · PRC  |  Seniority: ${isIV?"Division-wise":"Circle-wise"}  |  Generated: ${new Date().toLocaleDateString("en-IN")}`,t:"s",s:{font:{italic:true,name:"Arial",sz:9,color:{rgb:"475569"}},fill:{patternType:"solid",...LGRAY},alignment:{horizontal:"center"}}};
  R++;

  // Header row
  cols.forEach((c,i)=>{ ws[XLSX.utils.encode_cell({r:R,c:i})] = hdrDark(c); });
  R++;

  // Data
  const TYPE_FILLS = {SANCTION:LBLUE, FILLED:LGREEN, VACANT:LRED};
  const TYPE_HDRS  = {SANCTION:{fgColor:{rgb:"1E40AF"}}, FILLED:{fgColor:{rgb:"15803D"}}, VACANT:{fgColor:{rgb:"B91C1C"}}};

  // Group rows by designation for subtotals
  const byDesig = {};
  rows.forEach(r=>{ (byDesig[r.designation]||(byDesig[r.designation]=[])).push(r); });

  Object.entries(byDesig).forEach(([desig, dRows])=>{
    // Designation header band
    ws[XLSX.utils.encode_cell({r:R,c:0})] = {v:`DESIGNATION: ${desig}`,t:"s",s:{font:{bold:true,name:"Arial",sz:10,color:{rgb:"FFFFFF"}},fill:{patternType:"solid",fgColor:{rgb:"1E3A5F"}},alignment:{horizontal:"left",vertical:"center"}}};
    R++;

    dRows.forEach((row,ri)=>{
      ["sanction","filled","vacant"].forEach((t,ti)=>{
        const d=row[t];
        const rowFill = ti===0?(ri%2===0?null:{fgColor:{rgb:"F8FAFC"}}):TYPE_FILLS[t.toUpperCase()];
        let c=0;
        ws[XLSX.utils.encode_cell({r:R,c:c++})] = cell(row.circle,rowFill,ti===0,"1D4ED8");
        if(isIV) ws[XLSX.utils.encode_cell({r:R,c:c++})] = cell(row.division||"",rowFill);
        if(ti===0){
          ws[XLSX.utils.encode_cell({r:R,c:c++})] = cell(row.designation,rowFill,true);
          ws[XLSX.utils.encode_cell({r:R,c:c++})] = cell(row.sanctionType,rowFill);
        } else { c+=2; }
        ws[XLSX.utils.encode_cell({r:R,c:c++})] = hdr(["SANCTIONED","FILLED","VACANT"][ti], TYPE_HDRS[t.toUpperCase()]);
        CASTES.forEach(caste=>{
          ws[XLSX.utils.encode_cell({r:R,c:c++})] = numCell(d[caste]||0, rowFill, caste==="TOTAL", t==="vacant");
        });
        R++;
      });
    });

    // Subtotal for this designation
    const stS={}, stF={}, stV={};
    CASTES.forEach(c=>{stS[c]=0;stF[c]=0;stV[c]=0;});
    dRows.forEach(row=>{ CASTES.forEach(c=>{ stS[c]+=(row.sanction[c]||0); stF[c]+=(row.filled[c]||0); stV[c]+=(row.vacant[c]||0); }); });
    [["TOTAL SANCTIONED",stS,TYPE_HDRS.SANCTION,LBLUE],["TOTAL FILLED",stF,TYPE_HDRS.FILLED,LGREEN],["TOTAL VACANT",stV,TYPE_HDRS.VACANT,LRED]].forEach(([lbl,data,fill,bg])=>{
      let c=0;
      ws[XLSX.utils.encode_cell({r:R,c:c++})] = hdr(lbl,fill);
      if(isIV) ws[XLSX.utils.encode_cell({r:R,c:c++})] = hdr("",fill);
      ws[XLSX.utils.encode_cell({r:R,c:c++})] = hdr("",fill);
      ws[XLSX.utils.encode_cell({r:R,c:c++})] = hdr("",fill);
      ws[XLSX.utils.encode_cell({r:R,c:c++})] = hdr("",fill);
      CASTES.forEach(caste=>{ ws[XLSX.utils.encode_cell({r:R,c:c++})] = {v:data[caste]||0,t:"n",s:{font:{bold:true,name:"Arial",sz:9,color:{rgb:"FFFFFF"}},fill:{patternType:"solid",...fill},alignment:{horizontal:"center"},border:borderThin()}}; });
      R++;
    });
    R++; // blank row between designations
  });

  // Col widths
  const colW = isIV
    ? [12,22,28,24,12,...CASTES.map(()=>6)]
    : [12,28,24,12,...CASTES.map(()=>6)];
  ws["!cols"] = colW.map(w=>({wch:w}));

  // Merge title across all cols
  ws["!merges"] = [
    {s:{r:0,c:0},e:{r:0,c:cols.length-1}},
    {s:{r:1,c:0},e:{r:1,c:cols.length-1}},
  ];

  ws["!ref"] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:R,c:cols.length-1}});
  return ws;
}

function exportExcel(rows3, rows4, month, year, filename){
  const wb = XLSX.utils.book_new();
  if(rows3.length) XLSX.utils.book_append_sheet(wb, buildSheet(rows3,3,month,year), "Class III");
  if(rows4.length) XLSX.utils.book_append_sheet(wb, buildSheet(rows4,4,month,year), "Class IV");
  XLSX.writeFile(wb, filename || `MSEDCL_Backlog_${month}_${year}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────

export default function RosterView(){
  const now = new Date();
  const [tab, setTab] = useState("dashboard");
  const [cls, setCls] = useState("III");
  const [selCircles, setSelCircles] = useState([...CIRCLES]);
  const [selDivs, setSelDivs] = useState({RPUC:[...DIVS.RPUC],GKUC:[...DIVS.GKUC],PRC:[...DIVS.PRC]});
  const [sanctionIII, setSanctionIII] = useState([]);
  const [sanctionIV, setSanctionIV] = useState([]);
  const [filledIII, setFilledIII] = useState([]);
  const [filledIV, setFilledIV] = useState([]);
  const [surplusIII, setSurplusIII] = useState([]);
  const [surplusIV, setSurplusIV] = useState([]);
  const [loading, setLoading] = useState(true);
  // surplusEdits: key = circle||division||surplusDesig => {SC,ST,...} overrides
  const [surplusEdits, setSurplusEdits] = useState(() => {
    try { return JSON.parse(localStorage.getItem("msedcl_surplusEdits") || "{}"); } catch { return {}; }
  });
  // manualSurplus: manually added surplus rows keyed by class
  const [manualSurplusIII, setManualSurplusIII] = useState(() => {
    try { return JSON.parse(localStorage.getItem("msedcl_manualSurplusIII") || "[]"); } catch { return []; }
  });
  const [manualSurplusIV, setManualSurplusIV] = useState(() => {
    try { return JSON.parse(localStorage.getItem("msedcl_manualSurplusIV") || "[]"); } catch { return []; }
  });
  const [selDesigs, setSelDesigs] = useState([]);
  // edits stored separately for sanction & filled, keyed by rowKey
  // Hydrate from localStorage on first load
  const [sanctionEdits, setSanctionEdits] = useState(() => {
    try { return JSON.parse(localStorage.getItem("msedcl_sanctionEdits") || "{}"); } catch { return {}; }
  });
  const [filledEdits, setFilledEdits] = useState(() => {
    try { return JSON.parse(localStorage.getItem("msedcl_filledEdits") || "{}"); } catch { return {}; }
  });
  const [pendingSaved, setPendingSaved] = useState(false); // true = unsaved changes
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(now.getFullYear());
  const [saveMsg, setSaveMsg] = useState("");
  const [lastSaved, setLastSaved] = useState(() => localStorage.getItem("msedcl_lastSaved") || "");
  const [refreshing, setRefreshing] = useState(false);
  const [autoUpdateStatus, setAutoUpdateStatus] = useState({ monitoring: false, lastCheck: null, modificationsDetected: false });

  const allDesigs = cls==="III" ? [...new Set(sanctionIII.map(r=>r.designation))] : [...new Set(sanctionIV.map(r=>r.designation))];

  // switch class — reset desigs
  const switchCls = v => { setCls(v); setSelDesigs(v==="III"?[...new Set(sanctionIII.map(r=>r.designation))]:[...new Set(sanctionIV.map(r=>r.designation))]); };

  const toggleCircle = c => setSelCircles(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);
  const toggleDiv = (circ,div) => setSelDivs(p=>({...p,[circ]:p[circ].map(normalize).includes(normalize(div))?p[circ].filter(d=>normalize(d)!==normalize(div)):[...p[circ],div]}));
  const toggleDesig = d => setSelDesigs(p=>p.includes(d)?p.filter(x=>x!==d):[...p,d]);

  // File handlers
  const downloadRosterTemplate = (type) => {
    const headers = [["Circle", "Division", "Designation", "Sanction Type", "SC", "ST", "VJ-A", "NT-B", "NT-C", "NT-D", "SBC", "OBC", "SEBC", "EWS", "OPEN", "TOTAL", ...(type === 'filled' ? ["Remark"] : [])]];
    const wb = XLSX.utils.book_new();
    const ws3 = XLSX.utils.aoa_to_sheet(headers);
    const ws4 = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws3, "III");
    XLSX.utils.book_append_sheet(wb, ws4, "IV");
    XLSX.writeFile(wb, `${type === 'sanction' ? 'Sanction' : 'Filled'}_Template.xlsx`);
  };

  const handleSanctionFile = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const buffer = await file.arrayBuffer();
      const sIII = extractSheetData(buffer, "III");
      const sIV = extractSheetData(buffer, "IV");
      setSanctionIII(sIII);
      setSanctionIV(sIV);
      setSelDesigs(cls === "III" ? [...new Set(sIII.map(r=>r.designation))] : [...new Set(sIV.map(r=>r.designation))]);
      setSanctionEdits({});
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'sanction');
      await fetch('/api/roster', { method: 'POST', body: formData });
      
      setSaveMsg("✅ Sanction file loaded successfully!");
      setTimeout(()=>setSaveMsg(""),4000);
    }
  };

  const handleFilledFile = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const buffer = await file.arrayBuffer();
      const { regular: fIII, surplus: sIII2 } = parseRows(buffer, "III");
      const { regular: fIV,  surplus: sIV2  } = parseRows(buffer, "IV");
      setFilledIII(fIII); setSurplusIII(sIII2);
      setFilledIV(fIV);   setSurplusIV(sIV2);
      setFilledEdits({});
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'filled');
      await fetch('/api/roster', { method: 'POST', body: formData });
      
      setSaveMsg("✅ Filled file loaded successfully!");
      setTimeout(()=>setSaveMsg(""),4000);
    }
  };

  // Build merged data rows
  const buildRows = useCallback((classFilter)=>{
    const sArr = classFilter==="III" ? sanctionIII : sanctionIV;
    const fArr = classFilter==="III" ? filledIII : filledIV;
    const surpArr = classFilter==="III" ? surplusIII : surplusIV;
    const manArr = classFilter==="III" ? manualSurplusIII : manualSurplusIV;
    const {sm,fm} = buildMaps(sArr, fArr);

    // Combine excel surplus + manual surplus
    const allSurplus = [...surpArr, ...manArr];

    // Build surplus lookup keyed by the EXACT regular row they are adjusted against
    const surplusByRowKey = {};
    allSurplus.forEach(sr => {
      if (!sr.adjustedAgainst) return;
      const key = `${normalize(sr.circle)}||${normalize(sr.division)}||${normalize(sr.adjustedAgainst.designation)}||${normalize(sr.adjustedAgainst.sanctionType)}`;
      if (!surplusByRowKey[key]) surplusByRowKey[key] = [];
      surplusByRowKey[key].push(sr);
    });

    return Object.keys(sm).filter(k=>{
      const r=sm[k];
      if(!selCircles.includes(r.circle)) return false;
      if(!selDesigs.includes(r.designation)) return false;
      if(classFilter==="IV"&&r.division&&!selDivs[r.circle]?.map(normalize).includes(normalize(r.division))) return false;
      return true;
    }).map(k=>{
      const s = {...sm[k], ...(sanctionEdits[k]||{})};
      const fBase = fm[k] || emptyRow(sm[k]);
      const f = {...fBase, ...(filledEdits[k]||{})};
      if(sanctionEdits[k]) s.TOTAL = CASTES.filter(c=>c!=="TOTAL").reduce((a,c)=>a+(s[c]||0),0);
      if(filledEdits[k])   f.TOTAL = CASTES.filter(c=>c!=="TOTAL").reduce((a,c)=>a+(f[c]||0),0);

      // Match surplus exactly to this row using adjacency key; apply surplusEdits
      const rawSurplusRows = surplusByRowKey[k] || [];
      const surplusRows = rawSurplusRows.map(sr => {
        const srKey = `${normalize(sr.circle)}||${normalize(sr.division)}||${normalize(sr.designation)}`;
        return { ...sr, ...(surplusEdits[srKey] || {}) };
      });

      // Add surplus counts into filled strength
      const fWithSurplus = {...f};
      if (surplusRows.length > 0) {
        CASTES.forEach(c => {
          fWithSurplus[c] = (f[c] || 0) + surplusRows.reduce((a, sr) => a + (sr[c] || 0), 0);
        });
      }

      return {
        key:k,
        circle:sm[k].circle,
        division:sm[k].division||"",
        designation:sm[k].designation,
        sanctionType:sm[k].sanctionType,
        sanction:s,
        filled:fWithSurplus,
        filledBase:f,
        surplusRows,
        hasSurplus: surplusRows.length > 0,
        vacant:vacant(s,fWithSurplus)
      };
    });
  },[selCircles,selDivs,selDesigs,sanctionEdits,filledEdits,surplusEdits,surplusIII,surplusIV,manualSurplusIII,manualSurplusIV,sanctionIII,sanctionIV,filledIII,filledIV]);

  // Edit dispatcher
  const rows3 = useMemo(()=>buildRows("III"),[buildRows]);
  const rows4 = useMemo(()=>buildRows("IV"),[buildRows]);
  const activeRows = cls==="III" ? rows3 : rows4;

  const summary = useMemo(()=>{
    let s=0,f=0,v=0; const cv={};
    CASTES.forEach(c=>cv[c]=0);
    activeRows.forEach(r=>{s+=r.sanction.TOTAL||0;f+=r.filled.TOTAL||0;v+=r.vacant.TOTAL||0;CASTES.forEach(c=>{cv[c]+=(r.vacant[c]||0);});});
    return{s,f,v,cv};
  },[activeRows]);

  const grouped = useMemo(()=>{
    const g={};
    activeRows.forEach(r=>{ (g[r.designation]||(g[r.designation]=[])).push(r); });
    return g;
  },[activeRows]);


  // Save handler — commits all pending edits, persists to DB
  const handleSave = async () => {
    try {
      setSaveMsg("⏳ Saving to database...");
      const res = await fetch('/api/roster/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edits: sanctionEdits })
      });
      
      if (!res.ok) throw new Error("Failed to save");
      
      const ts = new Date().toLocaleString("en-IN");
      localStorage.setItem("msedcl_sanctionEdits", JSON.stringify(sanctionEdits));
      localStorage.setItem("msedcl_filledEdits", JSON.stringify(filledEdits));
      localStorage.setItem("msedcl_surplusEdits", JSON.stringify(surplusEdits));
      localStorage.setItem("msedcl_lastSaved", ts);
      setPendingSaved(true);
      setLastSaved(ts);
      setSaveMsg(`✅ Saved to database at ${new Date().toLocaleTimeString("en-IN")}`);
      setTimeout(()=>setSaveMsg(""), 4000);
    } catch (e) {
      console.error(e);
      setSaveMsg("❌ Error saving to database");
      setTimeout(()=>setSaveMsg(""), 4000);
    }
  };

  // Reset all edits — clears localStorage and reverts to master data
  const handleReset = () => {
    if (!window.confirm("Reset all edits and revert to master data?")) return;
    localStorage.removeItem("msedcl_sanctionEdits");
    localStorage.removeItem("msedcl_filledEdits");
    localStorage.removeItem("msedcl_surplusEdits");
    localStorage.removeItem("msedcl_manualSurplusIII");
    localStorage.removeItem("msedcl_manualSurplusIV");
    localStorage.removeItem("msedcl_lastSaved");
    setSanctionEdits({}); setFilledEdits({}); setSurplusEdits({});
    setManualSurplusIII([]); setManualSurplusIV([]);
    setPendingSaved(false); setLastSaved("");
    setSaveMsg("🔄 Reset to master data");
    setTimeout(()=>setSaveMsg(""),4000);
  };

  // Export
  const handleExport = () => {
    const r3 = buildRows("III"); const r4 = buildRows("IV");
    exportExcel(r3,r4,month,year);
  };

  // Apply surplus edit
  const applySurplusEdit = (srKey, field, val) => {
    setSurplusEdits(p => {
      const next = {...p, [srKey]: {...(p[srKey]||{}), [field]: parseInt(val)||0}};
      localStorage.setItem("msedcl_surplusEdits", JSON.stringify(next));
      return next;
    });
  };

  // Add manual surplus row
  const addManualSurplus = (classFilter, row) => {
    const entry = {
      circle: row.circle, division: row.division || undefined,
      designation: "New Surplus Post", isSurplus: true,
      adjustedAgainst: { designation: row.designation, sanctionType: row.sanctionType, circle: row.circle, division: row.division },
      ...Object.fromEntries(CASTES.map(c=>[c,0]))
    };
    if (classFilter==="III") {
      setManualSurplusIII(p => { const n=[...p,entry]; localStorage.setItem("msedcl_manualSurplusIII",JSON.stringify(n)); return n; });
    } else {
      setManualSurplusIV(p => { const n=[...p,entry]; localStorage.setItem("msedcl_manualSurplusIV",JSON.stringify(n)); return n; });
    }
  };

  // Remove manual surplus row
  const removeManualSurplus = (classFilter, srKey) => {
    if (classFilter==="III") {
      setManualSurplusIII(p => { const n=p.filter((_,i)=>i!==parseInt(srKey)); localStorage.setItem("msedcl_manualSurplusIII",JSON.stringify(n)); return n; });
    } else {
      setManualSurplusIV(p => { const n=p.filter((_,i)=>i!==parseInt(srKey)); localStorage.setItem("msedcl_manualSurplusIV",JSON.stringify(n)); return n; });
    }
  };



  const fetchRoster = async () => {
    try {
      setLoading(true);
      
      // Auto-load Sanction file
      const resSanction = await fetch('/api/roster?action=download&type=sanction', { cache: 'no-store' });
      if (resSanction.ok) {
        const buffer = await resSanction.arrayBuffer();
        const sIII = extractSheetData(buffer, "III");
        const sIV = extractSheetData(buffer, "IV");
        setSanctionIII(sIII);
        setSanctionIV(sIV);
        const allDesigs = cls === "III" ? [...new Set(sIII.map(r=>r.designation))] : [...new Set(sIV.map(r=>r.designation))];
        if (allDesigs.length) setSelDesigs(allDesigs);
      }
      
      // Auto-load Filled file
      const resFilled = await fetch('/api/roster?action=download&type=filled', { cache: 'no-store' });
      if (resFilled.ok) {
        const buffer = await resFilled.arrayBuffer();
        const { regular: fIII, surplus: sIII2 } = parseRows(buffer, "III");
        const { regular: fIV,  surplus: sIV2  } = parseRows(buffer, "IV");
        setFilledIII(fIII); setSurplusIII(sIII2);
        setFilledIV(fIV);   setSurplusIV(sIV2);
      }
      
      if (!resSanction.ok && !resFilled.ok) {
        // Fallback to database if files not found
        const res = await fetch('/api/roster', { cache: 'no-store' });
        const data = await res.json();
        const { sanctionArr, filledArr } = data;
        
        setSanctionIII(sanctionArr.filter(r => r.sanctionType === "III"));
        setSanctionIV(sanctionArr.filter(r => r.sanctionType === "IV"));
        setFilledIII(filledArr.filter(r => r.sanctionType === "III"));
        setFilledIV(filledArr.filter(r => r.sanctionType === "IV"));
        
        const allDesigs = [...new Set(sanctionArr.map(r => r.designation))];
        if (allDesigs.length) setSelDesigs(allDesigs);
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoRefresh = async () => {
    await handleRefresh();
    setAutoUpdateStatus(p => ({ ...p, modificationsDetected: false }));
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRoster();
    setRefreshing(false);
  };

  const applyEdit = (type, key, field, val) => {
    const num = parseInt(val)||0;
    if(type==="sanction"){
      setSanctionEdits(p=>{
        const next = {...p,[key]:{...(p[key]||{}), [field]:num}};
        localStorage.setItem("msedcl_sanctionEdits", JSON.stringify(next));
        return next;
      });
    } else {
      setFilledEdits(p=>{
        const next = {...p,[key]:{...(p[key]||{}), [field]:num}};
        localStorage.setItem("msedcl_filledEdits", JSON.stringify(next));
        return next;
      });
    }
    setPendingSaved(false);
  };

  const hasEdits = Object.keys(sanctionEdits).length>0 || Object.keys(filledEdits).length>0 || Object.keys(surplusEdits).length>0;

  return(
    <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"'Segoe UI',Arial,sans-serif",color:"#1e293b"}}>

      {/* ── HEADER ── */}
      <div style={{background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#2563eb 100%)",color:"#fff",padding:"0 16px",boxShadow:"0 4px 24px rgba(0,0,0,0.4)"}}>
        <div style={{maxWidth:1700,margin:"0 auto"}}>
          <div style={{padding:"14px 0 0",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div style={{width:46,height:46,borderRadius:10,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>⚡</div>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontWeight:900,fontSize:20,letterSpacing:0.5}}>MSEDCL Pune Zone — Class III &amp; IV Circle / Division Backlog</div>
              <div style={{fontSize:12,opacity:0.7,marginTop:2,fontWeight:600}}>Circle-wise (Class III) · Division-wise (Class IV) · RPUC · GKUC · PRC</div>
            </div>
            {/* File Uploads */}
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <div style={{display:"flex", gap: 4}}>
                <label style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",background:"rgba(37,99,235,0.3)",borderRadius:6,cursor:"pointer",border:"1px solid rgba(255,255,255,0.2)",fontSize:11,color:"#fff", flex: 1}}>
                  📄 Upload Sanction.xlsx
                  <input type="file" accept=".xlsx,.xls" onChange={handleSanctionFile} style={{display:"none"}}/>
                </label>
                <button onClick={() => downloadRosterTemplate('sanction')} style={{background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, padding:"0 8px", color:"#fff", fontSize:10, cursor:"pointer"}}>Template</button>
              </div>
              <div style={{display:"flex", gap: 4}}>
                <label style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",background:"rgba(22,163,74,0.3)",borderRadius:6,cursor:"pointer",border:"1px solid rgba(255,255,255,0.2)",fontSize:11,color:"#fff", flex: 1}}>
                  📄 Upload Filled.xlsx
                  <input type="file" accept=".xlsx,.xls" onChange={handleFilledFile} style={{display:"none"}}/>
                </label>
                <button onClick={() => downloadRosterTemplate('filled')} style={{background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, padding:"0 8px", color:"#fff", fontSize:10, cursor:"pointer"}}>Template</button>
              </div>
              <button onClick={handleRefresh} disabled={refreshing} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",background:refreshing?"rgba(251,146,60,0.5)":"rgba(251,146,60,0.3)",borderRadius:6,cursor:refreshing?"not-allowed":"pointer",border:"1px solid rgba(255,255,255,0.2)",fontSize:11,color:"#fff",fontWeight:600}}>
                {refreshing ? "🔄 Refreshing..." : "🔄 Refresh Data"}
              </button>
            </div>
            {/* Month/Year picker */}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <select value={month} onChange={e=>setMonth(e.target.value)} style={{padding:"5px 8px",borderRadius:6,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.1)",color:"#fff",fontSize:12,cursor:"pointer"}}>
                {MONTHS.map(m=><option key={m} value={m} style={{color:"#000"}}>{m}</option>)}
              </select>
              <select value={year} onChange={e=>setYear(Number(e.target.value))} style={{padding:"5px 8px",borderRadius:6,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.1)",color:"#fff",fontSize:12,cursor:"pointer"}}>
                {[2023,2024,2025,2026,2027].map(y=><option key={y} value={y} style={{color:"#000"}}>{y}</option>)}
              </select>
            </div>
            {/* Save + Export + Exit */}
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              {hasEdits && !pendingSaved && (
                <button onClick={handleSave} style={{padding:"7px 18px",background:"#f59e0b",border:"none",borderRadius:7,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 2px 8px rgba(245,158,11,0.5)",animation:"pulse 1.5s infinite"}}>
                  💾 Save Changes
                </button>
              )}
              {(hasEdits || lastSaved) && (
                <button onClick={handleReset} style={{padding:"7px 14px",background:"rgba(239,68,68,0.2)",border:"1px solid rgba(239,68,68,0.5)",borderRadius:7,color:"#fca5a5",cursor:"pointer",fontSize:12,fontWeight:700}}>
                  🗑️ Reset Edits
                </button>
              )}
              {autoUpdateStatus.monitoring && (
                <button onClick={handleAutoRefresh} disabled={refreshing} style={{padding:"6px 12px",background:autoUpdateStatus.modificationsDetected?"rgba(251,146,60,0.4)":"rgba(59,130,246,0.3)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:6,color:"#fff",cursor:refreshing?"not-allowed":"pointer",fontSize:11,fontWeight:600}}>
                  {autoUpdateStatus.modificationsDetected ? "🔄 Update Available" : "🔄 Auto-Update"}
                </button>
              )}
              {saveMsg && <span style={{fontSize:12,color:"#86efac",fontWeight:600}}>{saveMsg}</span>}
              {lastSaved && !saveMsg && <span style={{fontSize:10,color:"rgba(255,255,255,0.5)",whiteSpace:"nowrap"}}>💾 {lastSaved}</span>}
              <button onClick={handleExport} style={{padding:"7px 18px",background:"#16a34a",border:"none",borderRadius:7,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:"0 2px 8px rgba(22,163,74,0.4)"}}>
                📥 Export Excel
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:"flex",gap:0,marginTop:12,alignItems:"flex-end"}}>
            {[["dashboard","📊 Dashboard"],["table","📋 Roster Table"],["editor","✏️ Edit Data"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setTab(id)} style={{padding:"10px 24px",background:tab===id?"rgba(255,255,255,0.18)":"transparent",border:"none",borderBottom:tab===id?"3px solid #fff":"3px solid transparent",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:tab===id?800:500,transition:"all 0.2s",letterSpacing:0.3}}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AUTHOR BAR */}
      <div style={{background:"linear-gradient(90deg,#1e3a5f,#2563eb)",color:"#fff",padding:"6px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{background:"#f59e0b",color:"#1e1e1e",padding:"3px 12px",borderRadius:20,fontWeight:900,fontSize:13,letterSpacing:0.5}}>HEAD CLERK</span>
          <span style={{fontWeight:800,fontSize:15,letterSpacing:0.3}}>Nagesh D.M.</span>
          <span style={{opacity:0.7,fontSize:12}}>|</span>
          <span style={{fontSize:12,fontWeight:600}}>Office: <b>02266083</b></span>
          <span style={{opacity:0.7,fontSize:12}}>|</span>
          <span style={{fontSize:12,fontWeight:600}}>Mob: <b style={{color:"#fde68a",fontSize:13}}>7875388248</b></span>
        </div>
        <div style={{fontSize:11,opacity:0.6,fontStyle:"italic"}}>MSEDCL Pune Zone — Backlog Roster System</div>
      </div>

      {/* ── BODY ── */}
      <div style={{maxWidth:1700,margin:"0 auto",padding:"16px",display:"flex",gap:16}}>

        {/* Sidebar */}
        <div style={{width:226,flexShrink:0}}>
          <Sidebar cls={cls} setCls={switchCls} selCircles={selCircles} toggleCircle={toggleCircle}
            selDivs={selDivs} toggleDiv={toggleDiv} allDesigs={allDesigs}
            selDesigs={selDesigs} setSelDesigs={setSelDesigs} toggleDesig={toggleDesig} isIV={cls==="IV"}/>
        </div>

        {/* Main */}
        <div style={{flex:1,minWidth:0}}>
          {tab==="dashboard" && <Dashboard summary={summary} grouped={grouped} activeRows={activeRows} cls={cls}/>}
          {tab==="table"     && <TableView grouped={grouped} cls={cls}/>}
          {tab==="editor" && <EditorView activeRows={activeRows} applyEdit={applyEdit} sanctionEdits={sanctionEdits} filledEdits={filledEdits} surplusEdits={surplusEdits} applySurplusEdit={applySurplusEdit} addManualSurplus={(row)=>addManualSurplus(cls,row)} removeManualSurplus={(srKey)=>removeManualSurplus(cls,srKey)} cls={cls} onSave={handleSave} pendingSaved={pendingSaved}/>}
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.7}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────

function Sidebar({cls,setCls,selCircles,toggleCircle,selDivs,toggleDiv,allDesigs,selDesigs,setSelDesigs,toggleDesig,isIV}){
  const [openC,setOpenC]=useState(null);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Card>
        <Label>CLASS / SENIORITY</Label>
        <div style={{display:"flex",gap:6,marginBottom:6}}>
          {["III","IV"].map(c=><button key={c} onClick={()=>setCls(c)} style={{flex:1,padding:"6px 0",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:13,background:cls===c?"#2563eb":"#e2e8f0",color:cls===c?"#fff":"#475569",transition:"all 0.2s"}}>Class {c}</button>)}
        </div>
        <div style={{fontSize:10,color:"#94a3b8",lineHeight:1.5}}>III = Circle seniority<br/>IV = Division seniority</div>
      </Card>

      <Card>
        <Label>CIRCLES</Label>
        {CIRCLES.map(c=>(
          <div key={c}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <input type="checkbox" checked={selCircles.includes(c)} onChange={()=>toggleCircle(c)} style={{accentColor:"#2563eb",cursor:"pointer"}}/>
              <span style={{fontSize:12,fontWeight:700,flex:1,cursor:"pointer",color:"#1e3a5f"}} onClick={()=>toggleCircle(c)}>{c}</span>
              {isIV&&<button onClick={()=>setOpenC(openC===c?null:c)} style={{border:"none",background:"none",cursor:"pointer",fontSize:11,color:"#2563eb",padding:"0 2px"}}>{openC===c?"▲":"▼"}</button>}
            </div>
            {isIV&&openC===c&&(
              <div style={{paddingLeft:18,marginBottom:4}}>
                {DIVS[c]?.map(div=>(
                  <div key={div} style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                    <input type="checkbox" checked={selDivs[c]?.includes(div)} onChange={()=>toggleDiv(c,div)} style={{accentColor:"#2563eb",cursor:"pointer"}}/>
                    <span style={{fontSize:10,color:"#475569",cursor:"pointer",lineHeight:1.4}} onClick={()=>toggleDiv(c,div)}>{div.replace(" Division","")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </Card>

      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <Label style={{margin:0}}>DESIGNATIONS</Label>
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>setSelDesigs([...allDesigs])} style={{fontSize:9,padding:"2px 6px",border:"1px solid #cbd5e1",borderRadius:3,cursor:"pointer",background:"#f8fafc",color:"#475569"}}>All</button>
            <button style={{fontSize:9,padding:"2px 6px",border:"1px solid #cbd5e1",borderRadius:3,cursor:"pointer",background:"#f8fafc",color:"#475569"}} onClick={()=>setSelDesigs([])}>None</button>
          </div>
        </div>
        <div style={{maxHeight:240,overflowY:"auto"}}>
          {allDesigs.map(d=>(
            <div key={d} style={{display:"flex",alignItems:"flex-start",gap:5,marginBottom:4}}>
              <input type="checkbox" checked={selDesigs.includes(d)} onChange={()=>toggleDesig(d)} style={{accentColor:"#2563eb",marginTop:2,cursor:"pointer"}}/>
              <span style={{fontSize:11,color:"#334155",cursor:"pointer",lineHeight:1.4}} onClick={()=>toggleDesig(d)}>{d}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function Dashboard({summary,grouped,activeRows,cls}){
  const CASTE_COLORS = {SC:"#ef4444",ST:"#f97316","VJ-A":"#eab308","NT-B":"#84cc16","NT-C":"#10b981","NT-D":"#06b6d4",SBC:"#8b5cf6",OBC:"#ec4899",SEBC:"#f43f5e",EWS:"#6366f1",OPEN:"#64748b",TOTAL:"#1e293b"};

  // Calculate circle-wise totals
  const circleTotals = activeRows.reduce((acc, r) => {
    if (!acc[r.circle]) acc[r.circle] = { s: 0, f: 0, v: 0 };
    acc[r.circle].s += r.sanction.TOTAL || 0;
    acc[r.circle].f += r.filled.TOTAL || 0;
    acc[r.circle].v += r.vacant.TOTAL || 0;
    return acc;
  }, {});

  // Calculate division-wise totals (for Class IV)
  const divisionTotals = activeRows.reduce((acc, r) => {
    if (!r.division) return acc;
    const key = `${r.circle}|${r.division}`;
    if (!acc[key]) acc[key] = { circle: r.circle, division: r.division, s: 0, f: 0, v: 0 };
    acc[key].s += r.sanction.TOTAL || 0;
    acc[key].f += r.filled.TOTAL || 0;
    acc[key].v += r.vacant.TOTAL || 0;
    return acc;
  }, {});

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:16}}>
        <StatCard icon="📌" label="Total Sanctioned" val={summary.s} color="#2563eb"/>
        <StatCard icon="✅" label="Total Filled" val={summary.f} color="#16a34a"/>
        <StatCard icon="⚠️" label="Total Vacant" val={summary.v} color="#dc2626"/>
      </div>

      <Card style={{marginBottom:14}}>
        <b style={{fontSize:13,display:"block",marginBottom:12}}>Circle-wise Zone Totals</b>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#1e3a5f",color:"#fff"}}>
                {["Circle","Sanctioned","Filled","Vacant","Fill %"].map(h=>(
                  <th key={h} style={{padding:"8px 10px",textAlign:"center",fontWeight:700,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(circleTotals).map(([circ, {s, f, v}], i) => {
                const p = s > 0 ? Math.round(f / s * 100) : 0;
                return (
                  <tr key={circ} style={{background:i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                    <td style={{padding:"5px 10px",fontWeight:700,color:"#2563eb",fontSize:11,textAlign:"left"}}>{CIRCLE_FULL[circ] || circ}</td>
                    <td style={{padding:"5px 10px",textAlign:"center",fontSize:11}}>{s}</td>
                    <td style={{padding:"5px 10px",textAlign:"center",color:"#16a34a",fontWeight:700,fontSize:11}}>{f}</td>
                    <td style={{padding:"5px 10px",textAlign:"center",color:v>0?"#dc2626":"#16a34a",fontWeight:700,fontSize:11}}>{v}</td>
                    <td style={{padding:"5px 10px",textAlign:"center"}}>
                      <span style={{padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:700,background:p>=80?"#dcfce7":p>=60?"#fef3c7":"#fee2e2",color:p>=80?"#16a34a":p>=60?"#b45309":"#dc2626"}}>{p}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {cls === "IV" && Object.keys(divisionTotals).length > 0 && (
        <Card style={{marginBottom:14}}>
          <b style={{fontSize:13,display:"block",marginBottom:12}}>Division-wise Zone Totals</b>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#1e3a5f",color:"#fff"}}>
                  {["Circle","Division","Sanctioned","Filled","Vacant","Fill %"].map(h=>(
                    <th key={h} style={{padding:"8px 10px",textAlign:"center",fontWeight:700,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(divisionTotals).map(([key, {circle, division, s, f, v}], i) => {
                  const p = s > 0 ? Math.round(f / s * 100) : 0;
                  return (
                    <tr key={key} style={{background:i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                      <td style={{padding:"5px 10px",fontWeight:700,color:"#2563eb",fontSize:11,textAlign:"left"}}>{CIRCLE_FULL[circle] || circle}</td>
                      <td style={{padding:"5px 10px",fontSize:11,textAlign:"left"}}>{division}</td>
                      <td style={{padding:"5px 10px",textAlign:"center",fontSize:11}}>{s}</td>
                      <td style={{padding:"5px 10px",textAlign:"center",color:"#16a34a",fontWeight:700,fontSize:11}}>{f}</td>
                      <td style={{padding:"5px 10px",textAlign:"center",color:v>0?"#dc2626":"#16a34a",fontWeight:700,fontSize:11}}>{v}</td>
                      <td style={{padding:"5px 10px",textAlign:"center"}}>
                        <span style={{padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:700,background:p>=80?"#dcfce7":p>=60?"#fef3c7":"#fee2e2",color:p>=80?"#16a34a":p>=60?"#b45309":"#dc2626"}}>{p}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card style={{marginBottom:14}}>
        <b style={{fontSize:13,display:"block",marginBottom:12}}>Caste-wise Vacancy by Circle (counts only)</b>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#1e3a5f",color:"#fff"}}>
                <th style={{padding:"8px 10px",textAlign:"left",fontWeight:700,fontSize:11,whiteSpace:"nowrap"}}>Circle</th>
                {CASTES.filter(c=>c!=="TOTAL").map(c=>(<th key={c} style={{padding:"8px 10px",textAlign:"center",fontWeight:700,fontSize:11,whiteSpace:"nowrap"}}>{c}</th>))}
                <th style={{padding:"8px 10px",textAlign:"center",fontWeight:700,fontSize:11,whiteSpace:"nowrap"}}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(circleTotals).map((circ,i)=>{
                const row = {};
                let rowTotal = 0;
                CASTES.filter(c=>c!=="TOTAL").forEach(c=>{ const v = activeRows.reduce((a,r)=>r.circle===circ?a+(r.vacant[c]||0):a,0); row[c]=v; rowTotal+=v; });
                return (
                  <tr key={circ} style={{background:i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                    <td style={{padding:"5px 10px",fontWeight:700,color:"#2563eb",fontSize:11,textAlign:"left"}}>{CIRCLE_FULL[circ]||circ}</td>
                    {CASTES.filter(c=>c!=="TOTAL").map(c=>(<td key={c} style={{padding:"5px 10px",textAlign:"center",fontSize:11}}>{row[c]}</td>))}
                    <td style={{padding:"5px 10px",textAlign:"center",fontWeight:800,fontSize:11}}>{rowTotal}</td>
                  </tr>
                );
              })}
              <tr style={{background:"#1f2937",color:"#fff"}}>
                <td style={{padding:"8px 10px",fontWeight:800,fontSize:11}}>Pune Zone Total</td>
                {CASTES.filter(c=>c!=="TOTAL").map(c=>{
                  const v = activeRows.reduce((a,r)=>a+(r.vacant[c]||0),0);
                  return (<td key={c} style={{padding:"8px 10px",textAlign:"center",fontWeight:800,fontSize:11}}>{v}</td>);
                })}
                <td style={{padding:"8px 10px",textAlign:"center",fontWeight:900,fontSize:11}}>{CASTES.filter(c=>c!=="TOTAL").reduce((a,c)=>a+activeRows.reduce((s,r)=>s+(r.vacant[c]||0),0),0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE VIEW
// ─────────────────────────────────────────────────────────────────────────────

function TableView({grouped,cls}){
  const [mode,setMode]=useState("all");
  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontWeight:700,fontSize:13}}>Show:</span>
        {[["all","All (S/F/V)"],["sanction","Sanctioned"],["filled","Filled"],["vacant","Vacant"]].map(([v,l])=>(
          <button key={v} onClick={()=>setMode(v)} style={{padding:"6px 14px",border:"none",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:mode===v?700:400,background:mode===v?"#2563eb":"#e2e8f0",color:mode===v?"#fff":"#475569"}}>{l}</button>
        ))}
      </div>
      {Object.entries(grouped).map(([desig,rows])=>(
        <DesigTable key={desig} desig={desig} rows={rows} mode={mode} cls={cls}/>
      ))}
    </div>
  );
}

function DesigTable({desig,rows,mode,cls}){
  const showSanction = mode==="all"||mode==="sanction";
  const showFilled   = mode==="all"||mode==="filled";
  const showVacant   = mode==="all"||mode==="vacant";
  const TCOLOR={sanction:"#1e40af",filled:"#15803d",vacant:"#b91c1c"};
  const TBG   ={sanction:"#dbeafe",filled:"#dcfce7",vacant:"#fee2e2"};
  return(
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <div style={{width:4,height:24,background:"#2563eb",borderRadius:2}}/>
        <b style={{fontSize:14,color:"#1e3a5f"}}>{desig}</b>
        {rows.some(r=>r.hasSurplus) && (
          <span style={{background:"#fff7ed",color:"#c2410c",border:"1px solid #fed7aa",borderRadius:12,fontSize:10,fontWeight:700,padding:"2px 8px"}}>⚠ Surplus Adjusted</span>
        )}
        <span style={{marginLeft:"auto",fontSize:11,color:"#64748b"}}>{rows.length} row(s)</span>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr style={{background:"#1e3a5f",color:"#fff"}}>
              <th style={TH}>Circle</th>
              {cls==="IV"&&<th style={TH}>Division</th>}
              <th style={TH}>Sanction Type</th>
              <th style={TH}>Type</th>
              {CASTES.map(c=><th key={c} style={{...TH,minWidth:34,background:c==="TOTAL"?"#1e40af":undefined}}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,ri)=>(
              <>
                {showSanction&&(
                  <tr key={`${r.key}|s`} style={{background:ri%2===0?"rgba(30,41,59,0.4)":"rgba(56,189,246,0.1)",borderBottom:"1px solid rgba(148,163,184,0.15)"}}>
                    <td style={{...TD,fontWeight:700,color:"#60a5fa"}}>{r.circle}</td>
                    {cls==="IV"&&<td style={{...TD,fontSize:10}}>{r.division}</td>}
                    <td style={{...TD,fontSize:10}}>{r.sanctionType}</td>
                    <td style={{...TD,fontWeight:700,fontSize:10,color:TCOLOR.sanction,background:TBG.sanction,whiteSpace:"nowrap"}}>SANCTIONED</td>
                    {CASTES.map(c=><td key={c} style={{...TD,textAlign:"center",fontWeight:c==="TOTAL"?700:400}}>{r.sanction[c]||0}</td>)}
                  </tr>
                )}

                {showFilled&&(
                  <tr key={`${r.key}|f`} style={{background:ri%2===0?"rgba(16,185,129,0.1)":"rgba(16,185,129,0.15)",borderBottom:r.hasSurplus?"none":"1px solid rgba(16,185,129,0.2)"}}>
                    {!showSanction&&<td style={{...TD,fontWeight:700,color:"#34d399"}}>{r.circle}</td>}
                    {!showSanction&&cls==="IV"&&<td style={{...TD,fontSize:10}}>{r.division}</td>}
                    {showSanction&&<td style={{...TD,color:"#34d399",fontSize:10}}>↳ {r.circle}</td>}
                    {showSanction&&cls==="IV"&&<td style={{...TD,fontSize:10}}>{r.division}</td>}
                    <td style={{...TD,fontSize:10}}>{r.sanctionType}</td>
                    <td style={{...TD,fontWeight:700,fontSize:10,color:TCOLOR.filled,background:TBG.filled,whiteSpace:"nowrap"}}>
                      FILLED{r.hasSurplus&&<span style={{marginLeft:4,fontSize:9,color:"#f97316"}}>+SURPLUS</span>}
                    </td>
                    {CASTES.map(c=>(
                      <td key={c} style={{...TD,textAlign:"center",fontWeight:c==="TOTAL"?700:400,color:"#34d399"}}>
                        {r.filled[c]||0}
                        {c==="TOTAL"&&r.hasSurplus&&(
                          <div style={{fontSize:8,color:"#f97316",fontWeight:600}}>({r.filledBase[c]||0}+{(r.filled[c]||0)-(r.filledBase[c]||0)})</div>
                        )}
                      </td>
                    ))}
                  </tr>
                )}

                {showFilled&&r.hasSurplus&&r.surplusRows.map((sr,si)=>(
                  <tr key={`${r.key}|surplus|${si}`} style={{background:"rgba(249,115,22,0.1)",borderBottom:si===r.surplusRows.length-1?"1px solid rgba(249,115,22,0.3)":"1px dashed rgba(249,115,22,0.2)"}}>
                    <td style={{...TD,color:"#f97316",fontSize:10,paddingLeft:16}}>↳</td>
                    {cls==="IV"&&<td style={{...TD,fontSize:9,color:"#f97316"}}>{sr.division||"—"}</td>}
                    <td style={{...TD,fontSize:10}}>
                      <span style={{fontStyle:"italic",color:"#fdba74"}}>From: <b>{sr.designation}</b></span>
                    </td>
                    <td style={{...TD,whiteSpace:"nowrap"}}>
                      <span style={{background:"#f97316",color:"#fff",padding:"2px 7px",borderRadius:4,fontSize:9,fontWeight:700,letterSpacing:0.5}}>SURPLUS</span>
                    </td>
                    {CASTES.map(c=>(
                      <td key={c} style={{...TD,textAlign:"center",fontSize:10,color:"#f97316",fontWeight:c==="TOTAL"?700:400,background:"rgba(249,115,22,0.1)"}}>
                        {sr[c]||0}
                      </td>
                    ))}
                  </tr>
                ))}

                {showVacant&&(
                  <tr key={`${r.key}|v`} style={{background:ri%2===0?"rgba(239,68,68,0.1)":"rgba(239,68,68,0.15)",borderBottom:"1px solid rgba(239,68,68,0.2)"}}>
                    {!showSanction&&!showFilled&&<td style={{...TD,fontWeight:700,color:"#f87171"}}>{r.circle}</td>}
                    {!showSanction&&!showFilled&&cls==="IV"&&<td style={{...TD,fontSize:10}}>{r.division}</td>}
                    {(showSanction||showFilled)&&<td style={{...TD,color:"#f87171",fontSize:10}}>↳</td>}
                    {(showSanction||showFilled)&&cls==="IV"&&<td style={{...TD,fontSize:10}}>{r.division}</td>}
                    <td style={{...TD,fontSize:10}}>{r.sanctionType}</td>
                    <td style={{...TD,fontWeight:700,fontSize:10,color:TCOLOR.vacant,background:TBG.vacant,whiteSpace:"nowrap"}}>VACANT</td>
                    {CASTES.map(c=>{
                      const v=r.vacant[c]||0;
                      return<td key={c} style={{...TD,textAlign:"center",fontWeight:c==="TOTAL"?700:400,color:v>0?"#f87171":v<0?"#a78bfa":"#cbd5e1"}}>{v}</td>;
                    })}
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDITOR VIEW — edit both sanction & filled
// ─────────────────────────────────────────────────────────────────────────────

function EditorView({activeRows, applyEdit, sanctionEdits, filledEdits, surplusEdits, applySurplusEdit, addManualSurplus, removeManualSurplus, cls, onSave, pendingSaved}){
  const [editing,setEditing]=useState(null); // {key, type, srKey?}
  const [tmp,setTmp]=useState({});
  const [editingName,setEditingName]=useState(null); // srKey being renamed
  const hasEdits = Object.keys(sanctionEdits).length>0||Object.keys(filledEdits).length>0||Object.keys(surplusEdits).length>0;

  const startEdit=(row,type,srKey)=>{
    setEditing({key:row.key,type,srKey});
    let src;
    if(type==="surplus"&&srKey){
      const sr = row.surplusRows.find(s=>`${normalize(s.circle)}||${normalize(s.division)}||${normalize(s.designation)}`===srKey);
      src = sr ? {...sr,...(surplusEdits[srKey]||{})} : {};
    } else {
      src = type==="sanction" ? row.sanction : row.filledBase;
    }
    const init={};
    CASTES.forEach(c=>{ init[c]=src[c]||0; });
    setTmp(init);
  };

  const saveEdit=(row)=>{
    if(editing.type==="surplus"&&editing.srKey){
      CASTES.filter(c=>c!=="TOTAL").forEach(c=>{ applySurplusEdit(editing.srKey,c,tmp[c]||0); });
      const tot=CASTES.filter(c=>c!=="TOTAL").reduce((a,c)=>a+(parseInt(tmp[c])||0),0);
      applySurplusEdit(editing.srKey,"TOTAL",tot);
    } else {
      CASTES.filter(c=>c!=="TOTAL").forEach(c=>{ applyEdit(editing.type,row.key,c,tmp[c]||0); });
      const tot=CASTES.filter(c=>c!=="TOTAL").reduce((a,c)=>a+(parseInt(tmp[c])||0),0);
      applyEdit(editing.type,row.key,"TOTAL",tot);
    }
    setEditing(null);
  };

  const isEdited=(key,type)=>type==="sanction"?!!sanctionEdits[key]:!!filledEdits[key];

  return(
    <div>
      {/* Info bar */}
      <Card style={{marginBottom:14,background:"#fffbeb",border:"1px solid #fcd34d"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div>
            <b style={{fontSize:15,color:"#92400e"}}>✏️ Edit Sanction, Filled &amp; Surplus Strength</b>
            <div style={{fontSize:13,color:"#78350f",marginTop:3,fontWeight:600}}>
              <b>Edit S</b> = Sanctioned strength &nbsp;|&nbsp; <b>Edit F</b> = Filled strength &nbsp;|&nbsp;
              <b style={{color:"#f97316"}}>Edit Surplus</b> = Edit surplus post counts &nbsp;|&nbsp;
              <b style={{color:"#7c3aed"}}>➕ Add Surplus</b> = Add new surplus post manually
            </div>
          </div>
          {hasEdits && (
            <button onClick={onSave} style={{padding:"9px 22px",background:pendingSaved?"#16a34a":"#f59e0b",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontWeight:900,fontSize:14,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
              {pendingSaved?"✅ Saved":"💾 Save All Changes"}
            </button>
          )}
        </div>
      </Card>

      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:900}}>
          <thead>
            <tr style={{background:"#0f172a",color:"#fff",position:"sticky",top:0,zIndex:10}}>
              <th style={TH}>Circle</th><th style={TH}>Div</th><th style={TH}>Designation / Surplus Post</th><th style={TH}>Sanction Type</th><th style={TH}>Mode</th>
              {CASTES.map(c=><th key={c} style={{...TH,background:c==="TOTAL"?"#4c1d95":undefined,minWidth:40}}>{c}</th>)}
              <th style={TH}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((r,ri)=>{
              const eSanc = editing?.key===r.key&&editing?.type==="sanction";
              const eFill = editing?.key===r.key&&editing?.type==="filled";
              return(
                <>
                  {/* SANCTION ROW */}
                  <tr key={`${r.key}|s`} style={{background:ri%2===0?"#eff6ff":"#dbeafe",borderBottom:"1px solid #bfdbfe"}}>
                    <td style={{...TD,fontWeight:800,color:"#1d4ed8",fontSize:13}}>{r.circle}</td>
                    <td style={{...TD,fontSize:12,fontWeight:600}}>{r.division||"—"}</td>
                    <td style={{...TD,fontWeight:700,fontSize:13}}>{r.designation}</td>
                    <td style={{...TD,fontSize:12}}>{r.sanctionType}</td>
                    <td style={{...TD}}><span style={{background:"#1e40af",color:"#fff",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:800}}>SANCTION</span>{isEdited(r.key,"sanction")&&<span style={{marginLeft:4,color:"#7c3aed",fontSize:10,fontWeight:700}}>✎edited</span>}</td>
                    {CASTES.map(c=>(
                      <td key={c} style={{...TD,textAlign:"center",padding:"3px 4px"}}>
                        {eSanc
                          ? <input type="number" min={0} value={tmp[c]||0} onChange={e=>setTmp(p=>({...p,[c]:parseInt(e.target.value)||0}))} style={{width:44,textAlign:"center",padding:"3px",border:"1px solid #93c5fd",borderRadius:3,fontSize:12,fontWeight:700}}/>
                          : <span style={{fontWeight:c==="TOTAL"?800:600,fontSize:13}}>{r.sanction[c]||0}</span>}
                      </td>
                    ))}
                    <td style={{...TD,textAlign:"center",whiteSpace:"nowrap"}}>
                      {eSanc
                        ? <><Btn lbl="✓ Save" color="#16a34a" onClick={()=>saveEdit(r)}/><Btn lbl="✕" color="#dc2626" onClick={()=>setEditing(null)}/></>
                        : <Btn lbl="Edit S" color="#1d4ed8" onClick={()=>startEdit(r,"sanction",null)}/>}
                    </td>
                  </tr>

                  {/* FILLED ROW */}
                  <tr key={`${r.key}|f`} style={{background:ri%2===0?"#f0fdf4":"#dcfce7",borderBottom:"1px solid #86efac"}}>
                    <td style={{...TD,fontWeight:800,color:"#15803d",fontSize:13}}>{r.circle}</td>
                    <td style={{...TD,fontSize:12,fontWeight:600}}>{r.division||"—"}</td>
                    <td style={{...TD,fontWeight:700,fontSize:13}}>{r.designation}</td>
                    <td style={{...TD,fontSize:12}}>{r.sanctionType}</td>
                    <td style={{...TD}}>
                      <span style={{background:"#15803d",color:"#fff",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:800}}>FILLED</span>
                      {r.hasSurplus&&<span style={{marginLeft:4,fontSize:10,color:"#f97316",fontWeight:700}}>+SURPLUS</span>}
                      {isEdited(r.key,"filled")&&<span style={{marginLeft:4,color:"#7c3aed",fontSize:10,fontWeight:700}}>✎edited</span>}
                    </td>
                    {CASTES.map(c=>(
                      <td key={c} style={{...TD,textAlign:"center",padding:"3px 4px"}}>
                        {eFill
                          ? <input type="number" min={0} value={tmp[c]||0} onChange={e=>setTmp(p=>({...p,[c]:parseInt(e.target.value)||0}))} style={{width:44,textAlign:"center",padding:"3px",border:"1px solid #86efac",borderRadius:3,fontSize:12,fontWeight:700,background:(r.sanction[c]||0)<(parseInt(tmp[c])||0)?"#fee2e2":"#fff"}}/>
                          : <span style={{fontWeight:c==="TOTAL"?800:600,fontSize:13}}>{r.filled[c]||0}</span>}
                      </td>
                    ))}
                    <td style={{...TD,textAlign:"center",whiteSpace:"nowrap"}}>
                      {eFill
                        ? <><Btn lbl="✓ Save" color="#16a34a" onClick={()=>saveEdit(r)}/><Btn lbl="✕" color="#dc2626" onClick={()=>setEditing(null)}/></>
                        : <Btn lbl="Edit F" color="#15803d" onClick={()=>startEdit(r,"filled",null)}/>}
                    </td>
                  </tr>

                  {/* SURPLUS ROWS — each editable individually */}
                  {r.surplusRows.map((sr,si)=>{
                    const srKey=`${normalize(sr.circle)}||${normalize(sr.division)}||${normalize(sr.designation)}`;
                    const eSR=editing?.type==="surplus"&&editing?.srKey===srKey;
                    const edited=!!surplusEdits[srKey];
                    return(
                      <tr key={`${r.key}|sr|${si}`} style={{background:"#fff7ed",borderBottom:si===r.surplusRows.length-1?"1px solid #fed7aa":"1px dashed #fde68a"}}>
                        <td style={{...TD,color:"#92400e",fontSize:12,fontWeight:700}}>↳ {sr.circle}</td>
                        <td style={{...TD,fontSize:11,color:"#92400e",fontWeight:600}}>{sr.division||"—"}</td>
                        <td style={{...TD,fontSize:13}}><span style={{fontStyle:"italic",color:"#78350f",fontWeight:700}}>Surplus: </span><b>{sr.designation}</b></td>
                        <td style={{...TD,fontSize:11}}>
                          <span style={{background:"#f97316",color:"#fff",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:800}}>SURPLUS</span>
                          {edited&&<span style={{marginLeft:4,color:"#7c3aed",fontSize:9,fontWeight:700}}>✎edited</span>}
                        </td>
                        <td style={{...TD}}><span style={{fontSize:10,color:"#92400e",fontWeight:600}}>Surplus Post</span></td>
                        {CASTES.map(c=>{
                          const effVal=(surplusEdits[srKey]?surplusEdits[srKey][c]:undefined)??sr[c]??0;
                          return(
                            <td key={c} style={{...TD,textAlign:"center",padding:"3px 4px",background:"rgba(249,115,22,0.07)"}}>
                              {eSR
                                ? <input type="number" min={0} value={tmp[c]||0} onChange={e=>setTmp(p=>({...p,[c]:parseInt(e.target.value)||0}))} style={{width:44,textAlign:"center",padding:"3px",border:"1px solid #f97316",borderRadius:3,fontSize:12,fontWeight:700}}/>
                                : <span style={{fontWeight:c==="TOTAL"?800:600,fontSize:13,color:"#92400e"}}>{effVal}</span>}
                            </td>
                          );
                        })}
                        <td style={{...TD,textAlign:"center",whiteSpace:"nowrap"}}>
                          {eSR
                            ? <><Btn lbl="✓ Save" color="#16a34a" onClick={()=>saveEdit(r)}/><Btn lbl="✕" color="#dc2626" onClick={()=>setEditing(null)}/></>
                            : <Btn lbl="Edit Surplus" color="#f97316" onClick={()=>startEdit(r,"surplus",srKey)}/>}
                        </td>
                      </tr>
                    );
                  })}

                  {/* ADD MANUAL SURPLUS BUTTON */}
                  {(r.sanctionType||'').toLowerCase().includes('direct')&&(
                    <tr key={`${r.key}|addsr`} style={{background:"#fdf4ff",borderBottom:"2px solid #e9d5ff"}}>
                      <td colSpan={5+CASTES.length+1} style={{...TD,textAlign:"center",padding:"6px"}}>
                        <button onClick={()=>addManualSurplus(r)} style={{padding:"5px 18px",background:"#7c3aed22",color:"#7c3aed",border:"1px solid #7c3aed55",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:800}}>
                          ➕ Add New Surplus Post for {r.circle}{r.division?` / ${r.division}`:""}
                        </button>
                        <span style={{marginLeft:12,fontSize:11,color:"#94a3b8"}}>Use when a new surplus employee joins under this designation</span>
                      </td>
                    </tr>
                  )}

                  {/* VACANT ROW */}
                  <tr key={`${r.key}|v`} style={{background:"#fff7ed",borderBottom:"3px solid #fed7aa"}}>
                    <td style={{...TD,fontWeight:800,color:"#c2410c",fontSize:13}}>{r.circle}</td>
                    <td style={{...TD,fontSize:12,fontWeight:600}}>{r.division||"—"}</td>
                    <td style={{...TD,fontWeight:700,fontSize:13}}>{r.designation}</td>
                    <td style={{...TD,fontSize:12}}>{r.sanctionType}</td>
                    <td style={{...TD}}><span style={{background:"#b91c1c",color:"#fff",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:800}}>VACANT</span></td>
                    {CASTES.map(c=>{
                      const v=r.vacant[c]||0;
                      return<td key={c} style={{...TD,textAlign:"center",fontWeight:c==="TOTAL"?800:600,fontSize:13,color:v>0?"#dc2626":v<0?"#7c3aed":"#16a34a"}}>{v}</td>;
                    })}
                    <td style={{...TD,textAlign:"center",color:"#94a3b8",fontSize:11,fontWeight:600}}>auto</td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────────────────────────────

function Card({children,style={}}){ return <div style={{background:"#fff",borderRadius:10,padding:16,boxShadow:"0 1px 8px rgba(0,0,0,0.07)",...style}}>{children}</div>; }
function Label({children,style={}}){ return <div style={{fontWeight:800,fontSize:13,letterSpacing:0.8,color:"#64748b",marginBottom:8,textTransform:"uppercase",...style}}>{children}</div>; }
function StatCard({icon,label,val,color}){
  return(
    <Card>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:28}}>{icon}</div>
        <div>
          <div style={{fontSize:28,fontWeight:900,color}}>{typeof val==="number"?val.toLocaleString():val}</div>
          <div style={{fontSize:13,color:"#64748b",marginTop:2,fontWeight:600}}>{label}</div>
        </div>
      </div>
    </Card>
  );
}
function Btn({lbl,color,onClick}){
  return <button onClick={onClick} style={{marginRight:3,padding:"4px 10px",background:color+"22",color,border:`1px solid ${color}55`,borderRadius:4,cursor:"pointer",fontSize:11,fontWeight:800}}>{lbl}</button>;
}

const TH = {padding:"8px 10px",textAlign:"left",fontWeight:800,fontSize:12,whiteSpace:"nowrap",borderBottom:"1px solid rgba(255,255,255,0.15)"};
const TD = {padding:"6px 8px",fontSize:13,whiteSpace:"nowrap",borderBottom:"1px solid #e2e8f0",fontWeight:600};
