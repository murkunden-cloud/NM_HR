import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to parse dates safely
function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  try {
    const valClean = String(val).trim();
    return new Date(valClean.substring(0, 10));
  } catch {
    return null;
  }
}

// Helper to format date for display
function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = parseDate(dateStr);
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return '';
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const desigz = url.searchParams.get('desigz');
    const circl = url.searchParams.get('circl');
    const divnm = url.searchParams.get('divnm');
    const isClass3 = url.searchParams.get('isClass3') === 'true';

    if (!desigz || !circl) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    // Build where clause
    const where: any = { desigz, circl };
    if (!isClass3 && divnm) {
      where.divnm = divnm;
    } else if (isClass3 && divnm && divnm !== '(All Divisions)') {
      where.divnm = divnm;
    }

    // Fetch employees with seniority overrides
    const employees = await prisma.employee.findMany({
      where,
      include: {
        seniorityOverrides: {
          where: { designation: desigz }
        }
      }
    });

    // Fetch promotion history for these employees
    const empNos = employees.map(e => e.empno);
    const promotionHistory = await prisma.promotionHistory.findMany({
      where: { empno: { in: empNos }, to_desig: desigz }
    });

    const promMap = new Map();
    for (const prom of promotionHistory) {
      promMap.set(prom.empno, prom);
    }

    // Process each employee
    const processedRows = employees.map(emp => {
      const override = emp.seniorityOverrides?.[0];
      const prom = promMap.get(emp.empno);
      
      // Determine effective seniority date
      let effDate = emp.ppljoindt || emp.compjoindt;
      const transdt = emp.transdt;
      const transferType = emp.transfer_type || '';
      
      // Seniority loss rule: if request transfer, seniority resets to transdt
      if (transdt && transferType.toLowerCase().includes('request')) {
        effDate = transdt;
      }

      return {
        ...emp,
        eff_seniority_dt: effDate,
        seniority_no: override?.seniority_no || 0,
        remarks: override?.remarks || '',
        prom_from_desig: prom?.from_desig || '',
        prom_date: prom?.prom_date || effDate
      };
    });

    // Custom sort function
    processedRows.sort((a, b) => {
      // First by override seniority number (lowest first, 0 means no override)
      const aOverride = a.seniority_no || 0;
      const bOverride = b.seniority_no || 0;
      
      if (aOverride > 0 && bOverride > 0) {
        return aOverride - bOverride;
      }
      if (aOverride > 0) return -1;
      if (bOverride > 0) return 1;

      // Then by effective seniority date (earliest first)
      const aDate = parseDate(a.eff_seniority_dt);
      const bDate = parseDate(b.eff_seniority_dt);
      
      if (aDate && bDate) {
        if (aDate.getTime() !== bDate.getTime()) {
          return aDate.getTime() - bDate.getTime();
        }
      } else if (aDate) {
        return -1;
      } else if (bDate) {
        return 1;
      }

      // Then by birth date
      const aDob = parseDate(a.brthdt);
      const bDob = parseDate(b.brthdt);
      
      if (aDob && bDob) {
        if (aDob.getTime() !== bDob.getTime()) {
          return aDob.getTime() - bDob.getTime();
        }
      }

      // Finally by empno
      return a.empno.localeCompare(b.empno);
    });

    // Assign sequential ranks for employees without override
    let rank = 1;
    for (const row of processedRows) {
      if (!row.seniority_no || row.seniority_no <= 0) {
        row.seniority_no = rank;
      }
      rank++;
    }

    // Re-sort to ensure all ranks are in order
    processedRows.sort((a, b) => (a.seniority_no || 0) - (b.seniority_no || 0));

    // Format for display
    const displayRows = processedRows.map(row => ({
      seniorityNo: row.seniority_no,
      empNo: row.empno,
      employeeName: row.empnm || '',
      division: row.divnm || '',
      location: row.locnm || '',
      casteCategory: row.caste_category || row.cast || '',
      subCaste: row.subcast || '',
      casteValidityStatus: row.caste_validity_status || row.validity || '',
      casteValidityCertNo: row.caste_validity_no || row.valdtno || '',
      casteValidityDate: formatDisplayDate(row.caste_validity_dt || row.valddt),
      promotedFromPost: row.prom_from_desig || '',
      promotionJoiningDate: formatDisplayDate(row.prom_date),
      transferDate: formatDisplayDate(row.transdt),
      transferType: row.transfer_type || '',
      transferFromZoneCircle: '',
      dateJoinedCompany: formatDisplayDate(row.compjoindt),
      presentPostJoiningDate: formatDisplayDate(row.ppljoindt),
      effectiveSeniorityDate: formatDisplayDate(row.eff_seniority_dt),
      dateOfBirth: formatDisplayDate(row.brthdt),
      remarks: row.remarks || ''
    }));

    return NextResponse.json({ success: true, data: displayRows });

  } catch (error) {
    console.error('API Seniority GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { updates, desigz, username } = body;
    
    if (!updates || !desigz || !username) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    let seniorityUpdates = 0;
    let empUpdates = 0;

    for (const update of updates) {
      const empNo = update.empNo;
      
      // 1. Update seniority override
      if (update.seniorityNo !== undefined || update.remarks !== undefined) {
        await prisma.seniorityOverride.upsert({
          where: { empno_designation: { empno: empNo, designation: desigz } },
          create: {
            empno: empNo,
            designation: desigz,
            seniority_no: update.seniorityNo || 0,
            remarks: update.remarks || '',
            updated_by: username,
            updated_dt: nowStr
          },
          update: {
            seniority_no: update.seniorityNo !== undefined ? update.seniorityNo : undefined,
            remarks: update.remarks !== undefined ? update.remarks : undefined,
            updated_by: username,
            updated_dt: nowStr
          }
        });
        seniorityUpdates++;
      }

      // 2. Update employee fields
      const empData: any = {
        updated_by: username,
        updated_dt: nowStr
      };

      const fieldMapping: Record<string, string> = {
        employeeName: 'empnm',
        casteCategory: 'caste_category',
        subCaste: 'subcast',
        casteValidityStatus: 'caste_validity_status',
        casteValidityCertNo: 'caste_validity_no',
        casteValidityDate: 'caste_validity_dt',
        transferDate: 'transdt',
        transferType: 'transfer_type',
        dateJoinedCompany: 'compjoindt',
        presentPostJoiningDate: 'ppljoindt',
        dateOfBirth: 'brthdt'
      };

      let hasUpdates = false;
      for (const [displayField, dbField] of Object.entries(fieldMapping)) {
        if (update[displayField] !== undefined) {
          // Convert display date (DD-MM-YYYY) to DB format (YYYY-MM-DD)
          let value = update[displayField];
          if (value && dbField.includes('dt') || dbField.includes('date')) {
            const parts = value.split('-');
            if (parts.length === 3) {
              value = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
          }
          empData[dbField] = value || null;
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        await prisma.employee.update({
          where: { empno: empNo },
          data: empData
        });
        empUpdates++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      seniorityUpdates, 
      empUpdates,
      message: `Saved ${seniorityUpdates} seniority ranking(s) and ${empUpdates} employee record(s)`
    });

  } catch (error) {
    console.error('API Seniority POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save seniority data' }, { status: 500 });
  }
}
