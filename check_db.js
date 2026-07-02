const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({take: 5});
  const emps = await prisma.employee.findMany({take: 5});
  console.log('Users:', users.map(u => ({ username: u.username, role: u.role })));
  console.log('Emps:', emps.map(e => e.empno));
}

main().catch(console.error).finally(() => prisma.$disconnect());
