const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const emps = await prisma.employee.findMany({
      where: {
        empno: { notIn: ['2266083', '2232590'] },
        OR: [
          { empno: { contains: '1', mode: 'insensitive' } },
          { empnm: { contains: '1', mode: 'insensitive' } },
          { divnm: { contains: '1', mode: 'insensitive' } }
        ]
      },
      take: 1
    });
    console.log('success, emps length = ' + emps.length);
  } catch (e) {
    console.error('PRISMA ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
