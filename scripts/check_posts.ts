import { prisma } from '../src/lib/prisma';

async function main() {
  const posts = await prisma.post.findMany({
    select: { types: true, cat: true, desigz: true },
    take: 100
  });

  const distinctTypes = [...new Set(posts.map(p => p.types))];
  const distinctCat = [...new Set(posts.map(p => p.cat))];


  console.log("Distinct Types:", distinctTypes);
  console.log("Distinct Categories:", distinctCat);
  console.log("Samples:", posts.slice(0, 10));
}

main().catch(console.error).finally(() => prisma.$disconnect());
