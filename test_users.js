const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  try {
    await client.connect();
    const users = await client.query('SELECT username, role, full_name FROM "User"');
    console.log("Users:", users.rows);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}
checkUsers();
