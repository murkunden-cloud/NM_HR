import 'dotenv/config';
import { prisma } from './src/lib/prisma';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const CASTES = ["SC", "ST", "VJ-A", "NT-B", "NT-C", "NT-D", "SBC", "OBC", "SEBC", "EWS", "OPEN"];

function extractSheetData(buffer: Buffer, sheetName: string) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  if (!wb.Sheets[sheetName]) return [];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const data: any[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as any[];
    if (!row || row.length === 0 || !row[2]) continue; // Must have designation
    
    CASTES.forEach((caste, idx) => {
      const count = Number(row[4 + idx] || 0);
      if (count > 0) {
        data.push({
          circle: String(row[0] || 'Unknown'),
          division: String(row[1] || ''),
          designation: String(row[2]),
          sanctionType: String(row[3] || 'Unknown'),
          caste: caste,
          count: count
        });
      }
    });
  }
  return data;
}

async function main() {
  console.log("Reading sanction.xlsx...");
  const buffer = fs.readFileSync('src/components/Roster/sanction.xlsx');
  
  const sIII = extractSheetData(buffer, "III");
  const sIV = extractSheetData(buffer, "IV");
  const allData = [...sIII, ...sIV];
  
  console.log(`Found ${allData.length} non-zero sanction records. Inserting...`);
  
  await prisma.sanctionedPost.deleteMany(); // Clear existing
  
  // Insert in chunks to avoid query size limits
  const chunkSize = 5000;
  for (let i = 0; i < allData.length; i += chunkSize) {
    const chunk = allData.slice(i, i + chunkSize);
    await prisma.sanctionedPost.createMany({
      data: chunk
    });
    console.log(`Inserted chunk ${Math.floor(i/chunkSize) + 1}`);
  }
  
  console.log("Done seeding Sanctioned Posts!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
