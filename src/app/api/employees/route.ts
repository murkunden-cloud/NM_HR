import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pz_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const session = await verifySessionToken(token);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { username: session.username } });
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const scopeFilter: any = {};
    if (user.zonenm) scopeFilter.zonenm = user.zonenm;
    if (user.circl) scopeFilter.circl = user.circl;
    if (user.divnm) scopeFilter.divnm = user.divnm;
    if (user.subdnm) scopeFilter.subdnm = user.subdnm;

    const url = new URL(request.url);
    const empno = url.searchParams.get('empno');
    const query = url.searchParams.get('query');
    const loccode = url.searchParams.get('loccode');
    const zonenm = url.searchParams.get('zonenm');
    const circl = url.searchParams.get('circl');
    const divnm = url.searchParams.get('divnm');
    const desigz = url.searchParams.get('desigz');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    // 1. Fetch single employee by empno
    if (empno) {
      const employee = await prisma.employee.findFirst({
        where: { empno, ...scopeFilter }
      });
      if (!employee) {
        return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, employee });
    }

    // 2. Filter by explicit fields (for Seniority)
    if (loccode || desigz || zonenm || circl || divnm) {
      const employees = await prisma.employee.findMany({
        where: {
          ...scopeFilter,
          ...(loccode ? { loccode } : {}),
          ...(zonenm ? { zonenm } : {}),
          ...(circl ? { circl } : {}),
          ...(divnm ? { divnm } : {}),
          ...(desigz ? { desigz } : {})
        },
        take: limit
      });
      return NextResponse.json({ success: true, employees });
    }

    // 3. Search employees
    if (query) {
      const trimmed = query.trim();
      const employees = await prisma.employee.findMany({
        where: {
          ...scopeFilter,
          OR: [
            { empno: { contains: trimmed, mode: 'insensitive' } },
            { empnm: { contains: trimmed, mode: 'insensitive' } },
            { divnm: { contains: trimmed, mode: 'insensitive' } }
          ]
        },
        take: limit
      });
      return NextResponse.json({ success: true, employees });
    }

    // 4. Get recent employees as default list
    const employees = await prisma.employee.findMany({
      where: scopeFilter,
      take: limit,
      orderBy: { empno: 'asc' }
    });
    return NextResponse.json({ success: true, employees });

  } catch (error) {
    console.error('API Employees GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.bulk && Array.isArray(body.bulk)) {
      // Bulk update logic
      const results = [];
      const errors = [];
      for (const item of body.bulk) {
        if (item.empno && item.data) {
          try {
            // Convert any numeric fields correctly if needed or let Prisma handle it 
            // since we already passed strings/numbers.
            // Using upsert to safely create new employees or update existing ones.
            const updated = await prisma.employee.upsert({
              where: { empno: item.empno },
              update: {
                ...item.data
              },
              create: {
                empno: item.empno,
                ...item.data
              }
            });
            results.push(updated);
          } catch (err) {
            console.error(`Error updating empno ${item.empno}:`, err);
            errors.push(item.empno);
          }
        }
      }
      return NextResponse.json({ 
        success: true, 
        count: results.length,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    const { empno, data } = body;

    if (!empno || !data) {
      return NextResponse.json({ success: false, error: 'Missing empno or data payload' }, { status: 400 });
    }

    // Clean data fields if needed before updating
    const updatedEmployee = await prisma.employee.update({
      where: { empno },
      data: {
        ...data,
        basic: data.basic !== undefined ? parseFloat(data.basic) : undefined,
        suspension_days: data.suspension_days !== undefined ? parseInt(data.suspension_days, 10) : undefined,
        exleave_nopay_days: data.exleave_nopay_days !== undefined ? parseInt(data.exleave_nopay_days, 10) : undefined,
        exleave_counted: data.exleave_counted !== undefined ? parseInt(data.exleave_counted, 10) : undefined,
        increment_stoppages: data.increment_stoppages !== undefined ? parseInt(data.increment_stoppages, 10) : undefined
      }
    });

    return NextResponse.json({ success: true, employee: updatedEmployee });

  } catch (error) {
    console.error('API Employees POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update employee' }, { status: 500 });
  }
}
