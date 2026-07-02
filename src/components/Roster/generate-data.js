
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const CASTES = ["SC","ST","VJ-A","NT-B","NT-C","NT-D","SBC","OBC","SEBC","EWS","OPEN","TOTAL"];

// Extract sanction sheet (no Remarks column)
function extractSanctionSheet(filePath, sheetName) {
  const wb = XLSX.readFile(filePath);
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
    CASTES.forEach((caste, idx) => { obj[caste] = Number(row[4 + idx] || 0); });
    data.push(obj);
  }
  return data;
}

// Extract filled sheet — separates regular vs surplus rows using Remarks column.
// Surplus rows store `adjustedAgainst` = the PRECEDING regular row they sit below,
// so we can match them exactly to the correct regular designation + sanctionType.
function extractFilledSheet(filePath, sheetName) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const header = rows[0];
  const remarkIdx = header.indexOf("Remarks");

  const regular = [];
  const surplus = [];
  let lastRegular = null; // track the regular row immediately preceding each surplus row

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Handle both "Surplus" and typo "Suplus" in Excel remarks
    const remarkVal = remarkIdx >= 0 ? String(row[remarkIdx] || "").toLowerCase() : "";
    const isSurplus = remarkVal.includes("surp") || remarkVal.includes("supl");

    const obj = {};
    obj.circle       = row[0];
    obj.division     = row[1] || undefined;
    obj.designation  = row[2];
    obj.sanctionType = row[3] || (isSurplus ? "Surplus (Adjusted)" : undefined);
    CASTES.forEach((caste, idx) => { obj[caste] = Number(row[4 + idx] || 0); });

    if (isSurplus) {
      obj.isSurplus = true;
      // Store adjacency: which regular row this surplus is adjusted against
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

const sanctionPath = path.join(__dirname, "sanction.xlsx");
const filledPath   = path.join(__dirname, "filled.xlsx");

const SANCTION_III   = extractSanctionSheet(sanctionPath, "III");
const SANCTION_IV    = extractSanctionSheet(sanctionPath, "IV");
const { regular: FILLED_III_MASTER, surplus: SURPLUS_III } = extractFilledSheet(filledPath, "III");
const { regular: FILLED_IV_MASTER, surplus: SURPLUS_IV  } = extractFilledSheet(filledPath, "IV");

// Print summary
console.log(`Sheet III: ${FILLED_III_MASTER.length} regular rows, ${SURPLUS_III.length} surplus rows`);
console.log(`Sheet IV : ${FILLED_IV_MASTER.length} regular rows, ${SURPLUS_IV.length} surplus rows`);
console.log("\nSurplus designations found (III):", [...new Set(SURPLUS_III.map(r => r.designation))]);
console.log("Surplus designations found (IV):",  [...new Set(SURPLUS_IV.map(r => r.designation))]);
console.log("\nSurplus adjacency mappings (III):");
SURPLUS_III.forEach(r => console.log(`  ${r.circle} | ${r.designation} => ${r.adjustedAgainst?.designation} (${r.adjustedAgainst?.sanctionType})`));

const output = `// ========================================
// AUTO-GENERATED DATA (DO NOT EDIT MANUALLY)
// Run: node generate-data.js  to regenerate from Excel files
// ========================================
export const SANCTION_III = ${JSON.stringify(SANCTION_III, null, 2)};
export const SANCTION_IV = ${JSON.stringify(SANCTION_IV, null, 2)};
export const FILLED_III_MASTER = ${JSON.stringify(FILLED_III_MASTER, null, 2)};
export const FILLED_IV_MASTER = ${JSON.stringify(FILLED_IV_MASTER, null, 2)};
export const SURPLUS_III = ${JSON.stringify(SURPLUS_III, null, 2)};
export const SURPLUS_IV = ${JSON.stringify(SURPLUS_IV, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, "data.js"), output.trim());
console.log("\n✅ Data saved to src/data.js successfully!");
