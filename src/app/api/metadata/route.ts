import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { loccode: 'asc' }
    });
    const designations = await prisma.designation.findMany({
      orderBy: [
        { types: 'asc' },
        { cat: 'asc' },
        { desigz: 'asc' }
      ]
    });
    const posts = await prisma.post.findMany({
      orderBy: [
        { types: 'asc' },
        { cat: 'asc' },
        { desigz: 'asc' }
      ]
    });

    const uniqueZones = await prisma.employee.findMany({
      where: { zonenm: { not: null, not: '' } },
      distinct: ['zonenm'],
      select: { zonenm: true }
    });
    const uniqueCircles = await prisma.employee.findMany({
      where: { circl: { not: null, not: '' } },
      distinct: ['circl'],
      select: { circl: true }
    });
    const uniqueDivisions = await prisma.employee.findMany({
      where: { divnm: { not: null, not: '' } },
      distinct: ['divnm'],
      select: { divnm: true }
    });

    return NextResponse.json({
      success: true,
      locations,
      designations,
      posts,
      zones: uniqueZones.map((z: any) => z.zonenm).filter(Boolean).sort(),
      circles: uniqueCircles.map((c: any) => c.circl).filter(Boolean).sort(),
      divisions: uniqueDivisions.map((d: any) => d.divnm).filter(Boolean).sort()
    });
  } catch (error) {
    console.error('API Metadata GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
