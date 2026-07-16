import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { cpf, secret, newPassword } = await request.json();

    if (!cpf || !secret || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Only allow superadmin to reset
    if (cpf !== '2266083') {
      return NextResponse.json({ error: 'Password reset is only available for the Super Admin (2266083).' }, { status: 403 });
    }

    // Verify secret (we will check if secret matches Mobile No or PAN No in Employee table)
    const emp = await prisma.employee.findUnique({
      where: { empno: cpf }
    });

    if (!emp) {
      return NextResponse.json({ error: 'Employee record not found.' }, { status: 404 });
    }

    const validSecret = (emp.mobileno && emp.mobileno.trim().toLowerCase() === secret.trim().toLowerCase()) ||
                        (emp.panno && emp.panno.trim().toLowerCase() === secret.trim().toLowerCase());

    if (!validSecret) {
      return NextResponse.json({ error: 'Verification failed. Secret does not match Mobile or PAN number.' }, { status: 401 });
    }

    // Hash the new password and update User table
    const password_hash = hashPassword(newPassword);

    await prisma.user.update({
      where: { username: cpf },
      data: { password_hash }
    });

    return NextResponse.json({ success: true, message: 'Password reset successfully!' });
  } catch (error: any) {
    console.error('Superadmin reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
