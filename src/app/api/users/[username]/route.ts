import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: { username: string } }) {
  try {
    const { username } = await params;
    const body = await request.json();
    
    const updateData: any = {
      full_name: body.full_name,
      role: body.role,
    };

    if (body.password) {
      updateData.password_hash = hashPassword(body.password);
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

export async function DELETE(request: Request, { params }: { params: { username: string } }) {
  try {
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
