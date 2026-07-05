const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const connectionString = "postgresql://postgres.nvmfhjhhqjdwlkydsguj:Aaryan857480@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log("Connected to Supabase via IPv4 pooler.");
    
    const sql = fs.readFileSync('init.sql', 'utf16le');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (let stmt of statements) {
      console.log("Executing:", stmt.substring(0, 50).replace(/\n/g, " ") + "...");
      await client.query(stmt);
    }
    
    console.log("Successfully executed init.sql");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

run();
