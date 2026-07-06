const { Client } = require('pg');

async function checkLocal() {
  const c = new Client('postgresql://postgres:postgres@localhost:5432/pzhr?schema=public');
  await c.connect();
  const tables = ['locations', 'pay_scales', 'designations', 'posts', 'employees', 'promotion_history', 'transfer_history', 'leave_records', 'sanctioned_posts', 'seniority_override'];
  for (let t of tables) {
    const res = await c.query(`SELECT count(*) FROM "${t}"`);
    console.log(`${t}:`, res.rows[0].count);
  }
  await c.end();
}
checkLocal().catch(console.error);
