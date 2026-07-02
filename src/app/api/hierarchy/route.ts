import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const records = await prisma.employee.findMany({
      select: {
        zonenm: true,
        circl: true,
        divnm: true
      },
      distinct: ['zonenm', 'circl', 'divnm'],
      orderBy: [
        { zonenm: 'asc' },
        { circl: 'asc' },
        { divnm: 'asc' }
      ]
    });

    const hierarchy: any = {};

    records.forEach(r => {
      const z = r.zonenm || 'Unknown Zone';
      const c = r.circl || 'Unknown Circle';
      const d = r.divnm || 'Unknown Division';

      if (!hierarchy[z]) {
        hierarchy[z] = { name: z, circles: {} };
      }
      if (!hierarchy[z].circles[c]) {
        hierarchy[z].circles[c] = { name: c, divisions: [] };
      }
      if (!hierarchy[z].circles[c].divisions.includes(d)) {
        hierarchy[z].circles[c].divisions.push(d);
      }
    });

    return NextResponse.json({ success: true, hierarchy });
  } catch (error) {
    console.error('API Hierarchy GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
