import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function PUT(request: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pzhr_session')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const session = await verifySessionToken(token);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { username: session.sub } });
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const isSuperAdmin = ['2266083', '2232590'].includes(user.username) || user.role === 'SUPER_ADMIN';
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { username } = await params;
    const body = await request.json();
    
    const updateData: any = {
      full_name: body.full_name,
      role: body.role,
      zonenm: body.zonenm,
      circl: body.circl,
      divnm: body.divnm,
      subdnm: body.subdnm,
    };

    if (body.password) {
      updateData.password_hash = hashPassword(body.password);
      updateData.plain_password = body.password;
    }

    const updatedUser = await prisma.user.update({
      where: { username },
      data: updateData
    });
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pzhr_session')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const session = await verifySessionToken(token);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { username: session.sub } });
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const isSuperAdmin = ['2266083', '2232590'].includes(user.username) || user.role === 'SUPER_ADMIN';
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { username } = await params;
    await prisma.user.delete({
      where: { username }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
