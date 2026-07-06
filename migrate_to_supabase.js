const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log("Connecting to Local PostgreSQL...");
  const localClient = new Client('postgresql://postgres:postgres@localhost:5432/pzhr?schema=public');
  await localClient.connect();

  console.log("Connecting to Supabase PostgreSQL via Prisma...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const tablesToMigrate = [
    { name: 'transfer_history', model: prisma.transferHistory },
    { name: 'promotion_history', model: prisma.promotionHistory },
    { name: 'leave_records', model: prisma.leaveRecord },
    { name: 'seniority_override', model: prisma.seniorityOverride }
  ];

  for (const { name, model } of tablesToMigrate) {
    console.log(`\n--- Migrating ${name} ---`);
    
    // Check local count
    const countRes = await localClient.query(`SELECT count(*) FROM "${name}"`);
    const totalLocal = parseInt(countRes.rows[0].count, 10);
    console.log(`Total local rows in ${name}: ${totalLocal}`);

    if (totalLocal === 0) {
      console.log(`Skipping ${name} (empty)`);
      continue;
    }

    // Clear remote table
    console.log(`Clearing existing data in Supabase ${name}...`);
    await model.deleteMany();

    // Fetch and insert in chunks
    const CHUNK_SIZE = 1000;
    let offset = 0;

    while (offset < totalLocal) {
      const res = await localClient.query(`SELECT * FROM "${name}" LIMIT ${CHUNK_SIZE} OFFSET ${offset}`);
      const rows = res.rows;
      
      if (rows.length === 0) break;

      try {
        await model.createMany({
          data: rows,
          skipDuplicates: true
        });
        console.log(`Inserted ${offset + rows.length} / ${totalLocal} into ${name}`);
      } catch (err) {
        console.error(`Error inserting chunk into ${name}:`, err.message);
        break;
      }
      offset += CHUNK_SIZE;
    }
  }

  console.log("\nMigration completed!");
  await localClient.end();
  await prisma.$disconnect();
}

main().catch(console.error);
