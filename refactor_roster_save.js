const fs = require('fs');
let code = fs.readFileSync('d:/MYPRO/pzhr_web/src/components/Roster/RosterView.jsx', 'utf8');

const startIdx = code.indexOf('  // Save handler');
const endIdx = code.indexOf('  // Reset all edits');

if (startIdx !== -1 && endIdx !== -1) {
  const newLogic = `
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
      setSaveMsg(\`✅ Saved to database at \${new Date().toLocaleTimeString("en-IN")}\`);
      setTimeout(()=>setSaveMsg(""), 4000);
    } catch (e) {
      console.error(e);
      setSaveMsg("❌ Error saving to database");
      setTimeout(()=>setSaveMsg(""), 4000);
    }
  };

`;
  code = code.substring(0, startIdx) + newLogic + code.substring(endIdx);
  fs.writeFileSync('d:/MYPRO/pzhr_web/src/components/Roster/RosterView.jsx', code);
  console.log('Replaced handleSave successfully');
} else {
  console.log('Could not find indices', startIdx, endIdx);
}
