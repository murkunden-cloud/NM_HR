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

    return NextResponse.json({
      success: true,
      locations,
      designations,
      posts
    });
  } catch (error) {
    console.error('API Metadata GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
