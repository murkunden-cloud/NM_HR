import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const records = await prisma.employee.findMany({
      select: {
        zonenm: true,
        circl: true,
        divnm: true,
        subdnm: true,
        sectionm: true,
        substnm: true
      },
      distinct: ['zonenm', 'circl', 'divnm', 'subdnm', 'sectionm', 'substnm'],
      orderBy: [
        { zonenm: 'asc' },
        { circl: 'asc' },
        { divnm: 'asc' },
        { subdnm: 'asc' },
        { sectionm: 'asc' },
        { substnm: 'asc' }
      ]
    });

    const hierarchy: any = {};

    records.forEach(r => {
      const z = r.zonenm || 'Unknown Zone';
      const c = r.circl || 'Unknown Circle';
      const d = r.divnm || 'Unknown Division';
      const sd = r.subdnm || 'Unknown Subdivision';
      const sec = r.sectionm || 'Unknown Section';
      const sub = r.substnm || 'Unknown Substation';

      if (!hierarchy[z]) {
        hierarchy[z] = { name: z, circles: {} };
      }
      if (!hierarchy[z].circles[c]) {
        hierarchy[z].circles[c] = { name: c, divisions: {} };
      }
      if (!hierarchy[z].circles[c].divisions[d]) {
        hierarchy[z].circles[c].divisions[d] = { name: d, subdivisions: {} };
      }
      if (!hierarchy[z].circles[c].divisions[d].subdivisions[sd]) {
        hierarchy[z].circles[c].divisions[d].subdivisions[sd] = { name: sd, sections: {} };
      }
      if (!hierarchy[z].circles[c].divisions[d].subdivisions[sd].sections[sec]) {
        hierarchy[z].circles[c].divisions[d].subdivisions[sd].sections[sec] = { name: sec, substations: [] };
      }
      if (!hierarchy[z].circles[c].divisions[d].subdivisions[sd].sections[sec].substations.includes(sub)) {
        hierarchy[z].circles[c].divisions[d].subdivisions[sd].sections[sec].substations.push(sub);
      }
    });

    return NextResponse.json({ success: true, hierarchy });
  } catch (error) {
    console.error('API Hierarchy GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
