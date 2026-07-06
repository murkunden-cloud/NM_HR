const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  try {
    await client.connect();
    console.log("Connected to Supabase successfully.");
    
    // Check tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables in DB:", res.rows.map(r => r.table_name));

    if (res.rows.find(r => r.table_name.toLowerCase() === 'user')) {
        const users = await client.query('SELECT * FROM "User"');
        console.log("Users count:", users.rowCount);
    } else {
        console.log("No User table found.");
    }
    
    if (res.rows.find(r => r.table_name === 'employees')) {
        const emps = await client.query('SELECT COUNT(*) FROM employees');
        console.log("Employees count:", emps.rows[0].count);
    } else {
        console.log("No employees table found.");
    }

  } catch (err) {
    console.error("Database connection/query error:", err.message);
  } finally {
    await client.end();
  }
}

checkDb();
