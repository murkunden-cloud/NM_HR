import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import dayjs from 'dayjs';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pzhr_session')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const session = await verifySessionToken(token);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { username: session.sub } });
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const month = url.searchParams.get('month'); // Expected format: YYYY-MM
    const zone = url.searchParams.get('zone');
    
    if (!month) {
      return NextResponse.json({ success: false, error: 'Month parameter (YYYY-MM) is required' }, { status: 400 });
    }

    const scopeFilter: any = {};
    if (zone) {
      scopeFilter.zonenm = zone;
    }
    
    const isAdminAccount = ['2266083', '2232590'].includes(user.username) || user.role === 'SUPER_ADMIN';
    if (!isAdminAccount) {
      if (user.zonenm) scopeFilter.zonenm = user.zonenm;
      if (user.circl) scopeFilter.circl = user.circl;
      if (user.divnm) scopeFilter.divnm = user.divnm;
      if (user.subdnm) scopeFilter.subdnm = user.subdnm;
      
      const superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { username: true }
      });
      const hiddenIds = ['2266083', '2232590', ...superAdmins.map((u: any) => u.username)];
      scopeFilter.empno = { notIn: hiddenIds };
    }

    // Since date formats might be varied, we fetch the employees and filter them
    // For large databases, a direct startsWith might be better, but retirement calculation is complex.
    // For performance, we first try to fetch by dtofretir starting with the month.
    
    // Some dtofretir might be DD/MM/YYYY or YYYY-MM-DD. We assume YYYY-MM-DD based on computeRetirement.
    const employees = await prisma.employee.findMany({
      where: {
        ...scopeFilter,
        dtofretir: {
          startsWith: month
        }
      },
      orderBy: { empno: 'asc' }
    });

    // Add fullPayscale and compute status
    const result = employees.map(emp => {
      const today = dayjs().format('YYYY-MM-DD');
      return {
        ...emp,
        retir_status: (emp.dtofretir && emp.dtofretir < today) ? 'Retired' : 'Live'
      };
    });

    return NextResponse.json({ success: true, count: result.length, employees: result });

  } catch (error) {
    console.error('API Retired Employees GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
