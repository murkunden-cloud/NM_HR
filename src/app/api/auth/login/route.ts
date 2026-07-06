import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, portal } = body;

    // 1. Basic Validation
    if (!username || !password || !portal) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing credentials' 
      }, { status: 400 });
    }

    // 2. Fetch User by Username
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() }
    });

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid credentials. Please double check and try again.' 
      }, { status: 401 });
    }

    // 3. Verify Password (handles legacy PBKDF2 hashes or scrypt hashes)
    const isPasswordCorrect = verifyPassword(password, user.password_hash);
    if (!isPasswordCorrect) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid credentials. Please double check and try again.' 
      }, { status: 401 });
    }

    // 4. Role Authorization matching Portal type
    const isAdminRole = user.role.toLowerCase().includes('admin') || user.role === 'ADMIN';
    if (portal === 'admin' && !isAdminRole) {
      return NextResponse.json({ 
        success: false, 
        error: `Access Denied: You do not have permissions to access the Admin portal.` 
      }, { status: 403 });
    }
    if (portal === 'employee' && isAdminRole) {
      // Allow admins to login to Employee Portal as well if desired, or verify Employee portal access.
    }

    // 5. Check Guest Session Limits
    if (user.role === 'GUEST') {
      const oneMinuteAgo = new Date(Date.now() - 60000);
      
      // Delete expired guest sessions
      await prisma.guestSession.deleteMany({
        where: { lastActive: { lt: oneMinuteAgo } }
      });
      
      // Check active count
      const activeCount = await prisma.guestSession.count();
      if (activeCount >= 5) {
        return NextResponse.json({ 
          success: false, 
          error: 'Guest login limit reached. Maximum 5 guest users can login at a time. Please try again later.' 
        }, { status: 403 });
      }
    }

    // 6. Generate Session Token
    const sessionToken = createSessionToken(user.username, user.role);

    if (user.role === 'GUEST') {
      await prisma.guestSession.create({
        data: {
          token: sessionToken,
          username: user.username,
        }
      });
    }

    // 6. Return Response and Set Cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully',
      token: sessionToken,
      user: {
        username: user.username,
        full_name: user.full_name,
        role: user.role
      }
    });

    // Set secure HttpOnly cookie
    response.cookies.set('pzhr_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'An internal error occurred during login.' 
    }, { status: 500 });
  }
}
