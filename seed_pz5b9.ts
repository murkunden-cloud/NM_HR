import 'dotenv/config';
import { prisma } from './src/lib/prisma';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

async function main() {
  console.log('Reading PZ5b9.xlsx...');
  const buffer = fs.readFileSync('PZ5b9.xlsx');
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} records. Deleting old records...`);
  await prisma.vacancyLocation.deleteMany();

  console.log('Inserting new records...');
  
  // Batch insert
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize).map((row: any) => ({
      region: row.REGION || null,
      zone: row.ZONE || null,
      circle: row.CIRCLE || null,
      division: row.DIVISION || null,
      subdivision: row.SUBDIVISION || null,
      orgname: row.ORGNAME || null,
      cadre: row.CADRE || null,
      paygroup: row.PAYGROUP ? String(row.PAYGROUP) : null,
      type: row.TYPEs || row.TYPE || null,
      designation: row.DESIGNATION || null,
      sanctioned: parseInt(row.SANCTIONED) || 0,
      filled_in: parseInt(row.FILLED_IN) || 0,
    }));
    
    await prisma.vacancyLocation.createMany({
      data: batch
    });
    
    process.stdout.write(`\rInserted ${Math.min(i + batchSize, data.length)} / ${data.length}`);
  }
  
  console.log('\nSeeding completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
