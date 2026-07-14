import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const empno = url.searchParams.get('empno');

    if (!empno) {
      return NextResponse.json({ error: 'empno parameter is required' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { empno },
      select: {
        empno: true,
        empnm: true,
        desigz: true,
        locnm: true,
        divnm: true,
        circl: true,
        zonenm: true
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, employee });
  } catch (err: any) {
    console.error("CPF Fetch Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
