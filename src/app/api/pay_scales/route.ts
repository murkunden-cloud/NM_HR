import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payScales = await prisma.payScale.findMany();
    // Sort numerically by parsing the string scaleno
    payScales.sort((a, b) => {
      const numA = parseInt(a.scaleno.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.scaleno.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
    return NextResponse.json({ success: true, payScales });
  } catch (error) {
    console.error('API PayScales GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
