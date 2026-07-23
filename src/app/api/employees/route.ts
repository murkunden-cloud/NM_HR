import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

import dayjs from 'dayjs';

function computeRetirement(emp: any) {
  let status = 'Unknown';
  let computedRetDate = emp.dtofretir;

  if (emp.brthdt) {
    let bdate = dayjs(emp.brthdt);
    if (!bdate.isValid() && emp.brthdt.includes('/')) {
      const parts = emp.brthdt.split(/[/-]/);
      bdate = dayjs(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    
    if (bdate.isValid()) {
      const payGroup = (emp.paygrp || '').toString().toLowerCase();
      const isClass4 = payGroup === '4' || payGroup === 'iv' || payGroup.includes('class 4') || payGroup.includes('class-4') || payGroup.includes('class-iv');
      const retAge = isClass4 ? 60 : 58;
      
      computedRetDate = bdate.add(retAge, 'year').endOf('month').format('YYYY-MM-DD');
    }
  }

  if (computedRetDate) {
    const today = dayjs().format('YYYY-MM-DD');
    status = computedRetDate < today ? 'Retired' : 'Live';
  }

  return { ...emp, dtofretir: computedRetDate, retir_status: status };
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pzhr_session')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const session = await verifySessionToken(token);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { username: session.sub } });
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const scopeFilter: any = {};
    const isAdminAccount = ['2266083', '2232590'].includes(user.username) || user.role === 'SUPER_ADMIN';
    if (!isAdminAccount) {
      if (user.zonenm) scopeFilter.zonenm = user.zonenm;
      if (user.circl) scopeFilter.circl = user.circl;
      if (user.divnm) scopeFilter.divnm = user.divnm;
      if (user.subdnm) scopeFilter.subdnm = user.subdnm;
    }

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
      if (!isAdminAccount) {
        const superAdmins = await prisma.user.findMany({
          where: { role: 'SUPER_ADMIN' },
          select: { username: true }
        });
        const hiddenIds = ['2266083', '2232590', ...superAdmins.map((u: any) => u.username)];
        if (hiddenIds.includes(empno)) {
          return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
        }
      }
      const employee = await prisma.employee.findFirst({
        where: { empno, ...scopeFilter }
      });
      if (!employee) {
        return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
      }
      
      let fullPayscale = employee.payscl;
      if (employee.payscl) {
        const pScale = await prisma.payScale.findUnique({
          where: { scaleno: employee.payscl }
        });
        if (pScale && pScale.payscl) {
          fullPayscale = pScale.payscl;
        }
      }
      
      return NextResponse.json({ success: true, employee: computeRetirement({ ...employee, fullPayscale }) });
    }

    const today = dayjs().format('YYYY-MM-DD');
    const baseWhere: any = {
      ...scopeFilter,
      OR: [
        { dtofretir: { gte: today } },
        { dtofretir: null },
        { dtofretir: '' }
      ]
    };

    if (!isAdminAccount) {
      const superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { username: true }
      });
      const hiddenIds = ['2266083', '2232590', ...superAdmins.map((u: any) => u.username)];
      baseWhere.empno = { notIn: hiddenIds };
    }

    // 2. Filter by explicit fields (for Seniority)
    if (loccode || desigz || zonenm || circl || divnm) {
      const employees = await prisma.employee.findMany({
        where: {
          ...baseWhere,
          ...(loccode ? { loccode } : {}),
          ...(zonenm ? { zonenm } : {}),
          ...(circl ? { circl } : {}),
          ...(divnm ? { divnm } : {}),
          ...(desigz ? { desigz } : {})
        },
        take: limit
      });
      return NextResponse.json({ success: true, employees: employees.map(computeRetirement) });
    }

    // 3. Search employees
    if (query) {
      const trimmed = query.trim();
      const employees = await prisma.employee.findMany({
        where: {
          ...baseWhere,
          OR: [
            { empno: { contains: trimmed, mode: 'insensitive' } },
            { empnm: { contains: trimmed, mode: 'insensitive' } },
            { divnm: { contains: trimmed, mode: 'insensitive' } }
          ]
        },
        take: limit
      });
      return NextResponse.json({ success: true, employees: employees.map(computeRetirement) });
    }

    // 4. Get recent employees as default list
    const employees = await prisma.employee.findMany({
      where: baseWhere,
      take: limit,
      orderBy: { empno: 'asc' }
    });
    return NextResponse.json({ success: true, employees: employees.map(computeRetirement) });

  } catch (error) {
    console.error('API Employees GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pzhr_session')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const session = await verifySessionToken(token);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { username: session.sub } });
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const isAdminAccount = ['2266083', '2232590'].includes(user.username) || user.role === 'SUPER_ADMIN';
    const scopeFilter: any = {};
    if (!isAdminAccount) {
      if (user.zonenm) scopeFilter.zonenm = user.zonenm;
      if (user.circl) scopeFilter.circl = user.circl;
      if (user.divnm) scopeFilter.divnm = user.divnm;
      if (user.subdnm) scopeFilter.subdnm = user.subdnm;
    }

    const body = await request.json();
    if (body.bulk && Array.isArray(body.bulk)) {
      // Bulk update logic
      const results = [];
      const errors = [];
      for (const item of body.bulk) {
        if (item.empno && item.data) {
          try {
            // Verify scope for each item
            if (!isAdminAccount && item.empno !== user.username) {
              const targetEmp = await prisma.employee.findFirst({
                where: { empno: item.empno, ...scopeFilter }
              });
              if (!targetEmp) {
                errors.push(item.empno);
                continue;
              }
            }

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
    // First verify if the employee being updated is within the admin's scope or is the admin themselves
    if (!isAdminAccount && empno !== user.username) {
      const targetEmp = await prisma.employee.findFirst({
        where: { empno, ...scopeFilter }
      });
      if (!targetEmp) {
        return NextResponse.json({ success: false, error: 'Forbidden: Employee not in your scope' }, { status: 403 });
      }
    }

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
