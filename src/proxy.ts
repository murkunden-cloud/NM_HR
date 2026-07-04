import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define protected routes
  const isAdminRoute = path.startsWith('/admin');
  const isDashboardRoute = path.startsWith('/dashboard');
  
  if (!isAdminRoute && !isDashboardRoute) {
    return NextResponse.next();
  }

  // Get session cookie
  const sessionToken = request.cookies.get('pzhr_session')?.value;

  if (!sessionToken) {
    // Not logged in
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Decode JWT payload (without verifying signature - signature is verified on API routes/backend)
    // We just need to route them correctly on the client side.
    const parts = sessionToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    
    const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
    const payload = JSON.parse(payloadStr);
    
    // Check expiration
    if (Math.floor(Date.now() / 1000) > payload.exp) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    const role = (payload.role || '').toLowerCase();
    const isAdmin = role.includes('admin');

    // Route Protection Logic
    if (isAdminRoute && !isAdmin) {
      // Employees cannot access Admin
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    if (isDashboardRoute && isAdmin) {
      // Admins should probably use the admin dashboard, but optionally they can see the employee dashboard.
      // We'll allow it, or you can redirect them to /admin.
      // Let's redirect to /admin to avoid confusion.
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Invalid token
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
};
