import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('pzhr_session')?.value;

    if (sessionToken) {
      await prisma.guestSession.deleteMany({
        where: { token: sessionToken }
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  }

  const response = NextResponse.json({ success: true });
  
  // Clear the HttpOnly session cookie
  response.cookies.set('pzhr_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0 // Expire immediately
  });

  return response;
}
