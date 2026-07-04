import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifySessionToken } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('pzhr_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifySessionToken(sessionToken);
    if (!payload || !payload.sub) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const username = payload.sub;

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Try to find matching employee record (case insensitive)
    const employee = await prisma.employee.findFirst({
      where: { 
        empno: { equals: username, mode: 'insensitive' }
      }
    });

    // Also fetch leave balances
    let leaves: any[] = [];
    if (employee) {
      leaves = await prisma.leaveRecord.findMany({
        where: { empno: employee.empno }
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
      employee: employee || null,
      leaves: leaves
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
