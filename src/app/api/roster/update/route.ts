import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { edits } = await req.json();
    
    // edits format from UI:
    // { "Pune Rural Circle||Manchar Division||Clerk||III": { "SC": 5, "ST": 2 } }

    const operations = [];

    for (const [key, casteUpdates] of Object.entries(edits)) {
      const [circle, division, designation, sanctionType] = key.split("||");
      
      for (const [caste, count] of Object.entries(casteUpdates as Record<string, any>)) {
        operations.push(
          prisma.sanctionedPost.upsert({
            where: {
              circle_division_designation_sanctionType_caste: {
                circle,
                division: division || '',
                designation,
                sanctionType,
                caste
              }
            },
            update: { count: Number(count) },
            create: {
              circle,
              division: division || '',
              designation,
              sanctionType,
              caste,
              count: Number(count)
            }
          })
        );
      }
    }

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, updated: operations.length });
  } catch (error: any) {
    console.error("Error updating roster:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
