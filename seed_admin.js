const { Client } = require('pg');
const crypto = require('crypto');

function hashPassword(password) {
  const staticSalt = 'mscdcl_pune_zone_salt_12345';
  const derivedKey = crypto.pbkdf2Sync(password, staticSalt, 100000, 32, 'sha256');
  return derivedKey.toString('hex');
}

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/pzhr?schema=public'
  });
  
  await client.connect();
  
  const username = '2266083';
  const password = 'PuneAdmin@123';
  const hash = hashPassword(password);
  
  try {
    await client.query(`
      INSERT INTO "User" (username, password_hash, full_name, role) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) 
      DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;
    `, [username, hash, 'Admin User', 'ADMIN']);
    
    console.log('Admin user seeded:', username);
  } catch (err) {
    console.error('Error inserting user:', err);
  } finally {
    await client.end();
  }
}

main();
