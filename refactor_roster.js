const fs = require('fs');
let code = fs.readFileSync('d:/MYPRO/pzhr_web/src/components/Roster/RosterView.jsx', 'utf8');

const startIdx = code.indexOf('  // Manually trigger refresh');
const endIdx = code.indexOf('  const applyEdit = (type, key, field, val) => {');

if (startIdx !== -1 && endIdx !== -1) {
  const newFetchLogic = `
  useEffect(() => {
    const fetchRoster = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/roster');
        const data = await res.json();
        const { sanctionArr, filledArr } = data;
        
        setSanctionIII(sanctionArr.filter(r => r.sanctionType === "III"));
        setSanctionIV(sanctionArr.filter(r => r.sanctionType === "IV"));
        setFilledIII(filledArr.filter(r => r.sanctionType === "III"));
        setFilledIV(filledArr.filter(r => r.sanctionType === "IV"));
        
        const allDesigs = [...new Set(sanctionArr.map(r => r.designation))];
        if (allDesigs.length) setSelDesigs(allDesigs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoster();
  }, []);

`;
  code = code.substring(0, startIdx) + newFetchLogic + code.substring(endIdx);
  fs.writeFileSync('d:/MYPRO/pzhr_web/src/components/Roster/RosterView.jsx', code);
  console.log('Replaced fetch logic successfully');
} else {
  console.log('Could not find indices', startIdx, endIdx);
}
