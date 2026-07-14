import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

export async function GET() {
  try {
    const emps = await prisma.employee.findMany({ select: { empno: true, brthdt: true, paygrp: true, dtofretir: true } });
    
    let updatedCount = 0;
    for (const emp of emps) {
      if (!emp.brthdt) continue;
      
      let bdate = dayjs(emp.brthdt);
      if (!bdate.isValid() && emp.brthdt.includes('/')) {
        const parts = emp.brthdt.split('/');
        bdate = dayjs(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      if (!bdate.isValid()) continue;

      const payGroup = (emp.paygrp || '').toString().toLowerCase();
      const isClass4 = payGroup === '4' || payGroup === 'iv' || payGroup.includes('class 4') || payGroup.includes('class-4') || payGroup.includes('class-iv');
      const retAge = isClass4 ? 60 : 58;

      const retDate = bdate.add(retAge, 'year').endOf('month').format('YYYY-MM-DD');
      
      if (emp.dtofretir !== retDate) {
        await prisma.employee.update({
          where: { empno: emp.empno },
          data: { dtofretir: retDate }
        });
        updatedCount++;
      }
    }
    
    return NextResponse.json({ success: true, updatedCount });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
