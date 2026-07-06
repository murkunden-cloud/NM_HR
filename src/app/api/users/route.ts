import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await prisma.user.findMany();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newUser = await prisma.user.create({
      data: {
        username: body.username,
        full_name: body.full_name,
        password_hash: hashPassword(body.password || 'password123'),
        role: body.role || 'EMPLOYEE',
        zonenm: body.zonenm || null,
        circl: body.circl || null,
        divnm: body.divnm || null,
        subdnm: body.subdnm || null,
      }
    });
    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error("CREATE USER ERROR:", error);
    return NextResponse.json({ error: 'Failed to create user', details: error?.message || String(error) }, { status: 500 });
  }
}
