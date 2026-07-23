import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const CASTES = ["SC", "ST", "VJ-A", "NT-B", "NT-C", "NT-D", "SBC", "OBC", "SEBC", "EWS", "OPEN"];

export async function GET(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action');
    const type = req.nextUrl.searchParams.get('type');
    console.log("GET /api/roster - action:", action, "type:", type);
    
    if (action === 'download') {
      let filePath = '';
      if (type === 'sanction') {
        filePath = path.join(process.cwd(), 'src/components/Roster/sanction.xlsx');
      } else if (type === 'filled') {
        filePath = path.join(process.cwd(), 'src/components/Roster/filled.xlsx');
      } else {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
      }

      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${type}.xlsx"`,
        },
      });
    }

    // Extract user session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('pzhr_session')?.value;
    let userFilter: any = {};
    let empFilter: any = {};
    
    if (sessionToken) {
      const payload = verifySessionToken(sessionToken);
      if (payload && payload.sub) {
        const username = payload.sub;
        const user = await prisma.user.findUnique({ where: { username } });
        if (user) {
          const isAdminAccount = ['2266083', '2232590'].includes(user.username) || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
          if (!isAdminAccount) {
            let hasFilter = false;
            if (user.zonenm && user.zonenm.trim() !== '') {
              empFilter.zonenm = user.zonenm;
              hasFilter = true;
            }
            if (user.circl && user.circl.trim() !== '') {
              userFilter.circle = user.circl;
              empFilter.circl = user.circl;
              hasFilter = true;
            }
            if (user.divnm && user.divnm.trim() !== '') {
              userFilter.division = user.divnm;
              empFilter.divnm = user.divnm;
              hasFilter = true;
            }
            if (user.subdnm && user.subdnm.trim() !== '') {
              empFilter.subdnm = user.subdnm;
              hasFilter = true;
            }
            
            if (!hasFilter) {
              // Enforce no access if not admin and no specific location assigned
              userFilter.circle = 'NONE_ASSIGNED';
              empFilter.circl = 'NONE_ASSIGNED';
            }
          }
        }
      }
    }

    // 1. Get Sanctioned Posts from database
    const sanctionedRecords = await prisma.sanctionedPost.findMany({
      where: userFilter
    });
    
    const sanctionMap = new Map();
    for (const record of sanctionedRecords) {
      const key = `${record.circle}||${record.division || ''}||${record.designation}||${record.sanctionType}`;
      if (!sanctionMap.has(key)) {
        sanctionMap.set(key, {
          circle: record.circle,
          division: record.division || '',
          designation: record.designation,
          sanctionType: record.sanctionType,
          SC: 0, ST: 0, "VJ-A": 0, "NT-B": 0, "NT-C": 0, "NT-D": 0, SBC: 0, OBC: 0, SEBC: 0, EWS: 0, OPEN: 0, TOTAL: 0
        });
      }
      const obj = sanctionMap.get(key);
      if (CASTES.includes(record.caste)) {
        obj[record.caste] = record.count;
        obj.TOTAL += record.count;
      }
    }
    
    // 2. Calculate Filled Posts from Employees table
    const employees = await prisma.employee.findMany({
      where: empFilter,
      select: {
        circl: true,
        divnm: true,
        desigz: true,
        cast: true,
        paygrp: true
      }
    });

    const filledMap = new Map();
    for (const emp of employees) {
      if (!emp.desigz || !emp.circl) continue;
      
      let sanctionType = "III";
      if (emp.paygrp && String(emp.paygrp).includes("4")) sanctionType = "IV";

      const key = `${emp.circl}||${emp.divnm || ''}||${emp.desigz}||${sanctionType}`;
      if (!filledMap.has(key)) {
        filledMap.set(key, {
          circle: emp.circl,
          division: emp.divnm || '',
          designation: emp.desigz,
          sanctionType: sanctionType,
          SC: 0, ST: 0, "VJ-A": 0, "NT-B": 0, "NT-C": 0, "NT-D": 0, SBC: 0, OBC: 0, SEBC: 0, EWS: 0, OPEN: 0, TOTAL: 0
        });
      }
      
      const obj = filledMap.get(key);
      
      let caste = (emp.cast || "OPEN").toUpperCase().trim();
      
      if (caste.includes("VJ") || caste.includes("DT")) caste = "VJ-A";
      else if (caste.includes("NT") && caste.includes("B")) caste = "NT-B";
      else if (caste.includes("NT") && caste.includes("C")) caste = "NT-C";
      else if (caste.includes("NT") && caste.includes("D")) caste = "NT-D";
      else if (!CASTES.includes(caste)) caste = "OPEN";
      
      obj[caste] += 1;
      obj.TOTAL += 1;
    }

    return NextResponse.json({
      sanctionArr: Array.from(sanctionMap.values()),
      filledArr: Array.from(filledMap.values())
    });

  } catch (error: any) {
    console.error("Error fetching roster:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    console.log("POST /api/roster - file:", !!file, "type:", type);

    if (!file || !type) {
      return NextResponse.json({ error: 'Missing file or type' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let filePath = '';
    if (type === 'sanction') {
      filePath = path.join(process.cwd(), 'src/components/Roster/sanction.xlsx');
    } else if (type === 'filled') {
      filePath = path.join(process.cwd(), 'src/components/Roster/filled.xlsx');
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(filePath, buffer);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

