import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('pzhr_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ success: false, error: 'No session' }, { status: 401 });
    }

    const payload = verifySessionToken(sessionToken);
    if (!payload || !payload.sub) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    if (payload.role === 'GUEST') {
      const updated = await prisma.guestSession.updateMany({
        where: { token: sessionToken },
        data: { lastActive: new Date() }
      });

      // If the session was deleted (e.g., expired), force logout
      if (updated.count === 0) {
        return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
