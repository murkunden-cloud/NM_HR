const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    select: { types: true, cat: true, desigz: true },
    take: 100
  });
  const distinctTypes = [...new Set(posts.map(p => p.types))];
  const distinctCat = [...new Set(posts.map(p => p.cat))];


  console.log("Distinct Types:", distinctTypes);
  console.log("Distinct Categories:", distinctCat);

  // Show a few examples
  console.log("Samples:", posts.slice(0, 10));
}

main().catch(console.error).finally(() => prisma.$disconnect());
