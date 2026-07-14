import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join('/');

  try {
    if (path === 'filter-options') {
      const posts = await prisma.vacancyLocation.findMany({
        select: { circle: true, division: true, designation: true, cadre: true, paygroup: true, type: true, orgname: true }
      });

      const cadres = [...new Set(posts.map(p => p.cadre).filter(Boolean))];
      const paygroups = [...new Set(posts.map(p => p.paygroup).filter(Boolean))];
      const circles = [...new Set(posts.map(p => p.circle).filter(Boolean))];
      const divisions = [...new Set(posts.map(p => p.division).filter(Boolean))];
      const designations = [...new Set(posts.map(p => p.designation).filter(Boolean))];
      const types = [...new Set(posts.map(p => p.type).filter(Boolean))];
      const orgnames = [...new Set(posts.map(p => p.orgname).filter(Boolean))];

      return NextResponse.json({
        cadres,
        paygroups,
        classes: ["Class-I", "Class-II", "Class-III", "Class-IV"],
        circles,
        divisions,
        designations,
        types,
        orgnames
      });
    }

    if (path === 'locations') {
      const posts = await prisma.vacancyLocation.findMany();
      // Fetch transfers out
      const transfersOut = await prisma.transferOut.findMany();
      const transfersIn = await prisma.transferInDeployed.findMany();

      const locMap: Record<string, any> = {};

      for (const p of posts) {
        const orgname = p.orgname || 'Unknown';
        const designation = p.designation || 'Unknown';
        const key = `${orgname}_${designation}`.toUpperCase();

        const out_c = transfersOut.find(t => t.key === key)?.count || 0;
        const in_c = transfersIn.find(t => t.key === key)?.count || 0;
        
        const sanc = p.sanctioned || 0;
        const base_filled = p.filled_in || 0;
        const active = base_filled - out_c + in_c;

        const classMap: Record<string, string> = { "1": "Class-I", "2": "Class-II", "3": "Class-III", "4": "Class-IV" };

        locMap[key] = {
          REGION: p.region || "",
          ZONE: p.zone || "",
          CIRCLE: p.circle || "",
          DIVISION: p.division || "",
          SUBDIVISION: p.subdivision || "",
          ORGNAME: orgname,
          CADRE: p.cadre || "Unclassified",
          PAYGROUP: p.paygroup || "3",
          TYPE: p.type || "Technical",
          DESIGNATION: designation,
          SANCTIONED: sanc,
          FILLED_IN: base_filled,
          CLASS: classMap[p.paygroup || "3"] || "Unclassified",
          KEY: key,
          OUT_COUNT: out_c,
          IN_COUNT: in_c,
          ACTIVE_FILLED: active,
          NET_VACANCY: sanc - active
        };
      }

      return NextResponse.json(Object.values(locMap));
    }

    if (path === 'locations/staff') {
      const url = new URL(req.url);
      const orgname = url.searchParams.get('orgname');
      const designation = url.searchParams.get('designation');
      if (!orgname || !designation) return NextResponse.json([]);
      const data = await prisma.employee.findMany({
        where: { divnm: orgname, desigz: designation }
      });
      const mapped = data.map(e => ({
        id: e.empno,
        name: e.empnm || '',
        cpfno: e.empno,
        designation: e.desigz || '',
        orgname: e.divnm || '',
        original_orgname: e.divnm || ''
      }));
      return NextResponse.json(mapped);
    }

    if (path === 'transfers/out') {
      const data = await prisma.transferOut.findMany();
      return NextResponse.json(data);
    }

    if (path === 'transfers/in/pool') {
      const data = await prisma.transferInPool.findMany();
      return NextResponse.json(data);
    }

    if (path === 'master-employees/search') {
      const url = new URL(req.url);
      const q = url.searchParams.get('q') || '';
      if (!q) return NextResponse.json([]);
      const data = await prisma.employee.findMany({
        where: {
          OR: [
            { empnm: { contains: q, mode: 'insensitive' } },
            { empno: { contains: q, mode: 'insensitive' } }
          ]
        },
        take: 20
      });
      // Map to legacy master-employee structure if needed, or return as is.
      // Vacancy.js expects: cpfno, name, designation, office, division, circle
      const mapped = data.map(e => ({
        cpfno: e.empno,
        name: e.empnm || '',
        designation: e.desigz || '',
        office: e.divnm || '',
        division: e.divnm || '', // fallback
        circle: ''
      }));
      return NextResponse.json(mapped);
    }

    if (path === 'employees') {
      const url = new URL(req.url);
      const q = url.searchParams.get('q') || '';
      const designation = url.searchParams.get('designation') || '';
      const circle = url.searchParams.get('circle') || '';
      const division = url.searchParams.get('division') || '';

      const where: any = {};
      if (q) {
        where.OR = [
          { empnm: { contains: q, mode: 'insensitive' } },
          { empno: { contains: q, mode: 'insensitive' } },
          { desigz: { contains: q, mode: 'insensitive' } },
          { divnm: { contains: q, mode: 'insensitive' } }
        ];
      }
      if (designation && designation !== 'All') where.desigz = designation;
      
      const data = await prisma.employee.findMany({ where });
      const mapped = data.map(e => ({
        id: e.empno,
        name: e.empnm || '',
        cpfno: e.empno,
        designation: e.desigz || '',
        orgname: e.divnm || '',
        original_orgname: e.divnm || ''
      }));
      return NextResponse.json(mapped);
    }

    if (path === 'locations/unmatched') {
      // Find employees where their office is not in vacancy_locations.orgname
      const posts = await prisma.vacancyLocation.findMany({ select: { orgname: true }});
      const validOffices = new Set(posts.map(p => p.orgname).filter(Boolean));
      
      const emps = await prisma.employee.findMany({ select: { divnm: true }});
      
      const unmatchedCounts: Record<string, number> = {};
      for (const e of emps) {
        if (e.divnm && !validOffices.has(e.divnm)) {
          unmatchedCounts[e.divnm] = (unmatchedCounts[e.divnm] || 0) + 1;
        }
      }
      
      const result = Object.entries(unmatchedCounts).map(([orgname, emp_count]) => ({
        orgname, emp_count
      })).sort((a, b) => b.emp_count - a.emp_count);
      
      return NextResponse.json(result);
    }

    if (path === 'locations/mappings') {
      const data = await prisma.locationMapping.findMany({
        orderBy: { created_at: 'desc' }
      });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Endpoint not implemented' }, { status: 404 });
  } catch (err: any) {
    console.error("Vacancy GET Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join('/');
  
  try {
    if (path === 'locations/bulk-upload') {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
      
      const buffer = Buffer.from(await file.arrayBuffer());
      const XLSX = require('xlsx');
      const wb = XLSX.read(buffer, { type: "buffer" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);
      
      await prisma.vacancyLocation.deleteMany();
      
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize).map((row: any) => ({
          region: row.REGION || null,
          zone: row.ZONE || null,
          circle: row.CIRCLE || null,
          division: row.DIVISION || null,
          subdivision: row.SUBDIVISION || null,
          orgname: row.ORGNAME || null,
          cadre: row.CADRE || null,
          paygroup: row.PAYGROUP ? String(row.PAYGROUP) : null,
          type: row.TYPEs || row.TYPE || null,
          designation: row.DESIGNATION || null,
          sanctioned: parseInt(row.SANCTIONED) || 0,
          filled_in: parseInt(row.FILLED_IN) || 0,
        }));
        await prisma.vacancyLocation.createMany({ data: batch });
      }
      return NextResponse.json({ loaded: data.length });
    }

    const body = await req.json().catch(() => ({}));

    if (path === 'transfers/in/pool') {
      const { designation, count } = body;
      const existing = await prisma.transferInPool.findUnique({ where: { designation } });
      const newCount = (existing?.count || 0) + count;
      await prisma.transferInPool.upsert({
        where: { designation },
        update: { count: newCount },
        create: { designation, count: newCount }
      });
      return NextResponse.json({ designation, count: newCount });
    }

    if (path === 'transfers/out') {
      const { orgname, designation, count } = body;
      const key = `${orgname}_${designation}`.toUpperCase();
      const existing = await prisma.transferOut.findUnique({ where: { key } });
      const newCount = (existing?.count || 0) + count;
      await prisma.transferOut.upsert({
        where: { key },
        update: { orgname, designation, count: newCount },
        create: { key, orgname, designation, count: newCount }
      });
      return NextResponse.json({ key, count: newCount });
    }
    
    // Deploy from pool
    if (path === 'transfers/in/deploy') {
      const { designation, orgname, count } = body;
      const key = `${orgname}_${designation}`.toUpperCase();
      
      const pool = await prisma.transferInPool.findUnique({ where: { designation } });
      const avail = pool?.count || 0;
      if (avail < count) {
        return NextResponse.json({ error: `Pool has only ${avail} for ${designation}` }, { status: 400 });
      }

      const existing = await prisma.transferInDeployed.findUnique({ where: { key } });
      const newCount = (existing?.count || 0) + count;
      
      await prisma.transferInDeployed.upsert({
        where: { key },
        update: { orgname, designation, count: newCount },
        create: { key, orgname, designation, count: newCount }
      });
      
      const newPool = avail - count;
      if (newPool <= 0) {
        await prisma.transferInPool.delete({ where: { designation } });
      } else {
        await prisma.transferInPool.update({ where: { designation }, data: { count: newPool } });
      }
      
      return NextResponse.json({ deployed_to: key, count: newCount, pool_remaining: newPool });
    }

    return NextResponse.json({ error: 'Endpoint not implemented' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join('/');
  
  try {
    const body = await req.json().catch(() => ({}));
    
    if (path === 'locations/adjust') {
      const { orgname, designation, sanctioned, filled_in } = body;
      const existing = await prisma.vacancyLocation.findFirst({
        where: { orgname, designation }
      });
      if (!existing) return NextResponse.json({ error: 'Location not found' }, { status: 404 });
      
      const updateData: any = {};
      if (sanctioned !== undefined) updateData.sanctioned = Number(sanctioned);
      if (filled_in !== undefined) updateData.filled_in = Number(filled_in);
      
      const updated = await prisma.vacancyLocation.update({
        where: { id: existing.id },
        data: updateData
      });
      return NextResponse.json({ modified: 1 });
    }
    
    if (path === 'transfers/out') {
      const { orgname, designation, count } = body;
      const key = `${orgname}_${designation}`.toUpperCase();
      if (count <= 0) {
        await prisma.transferOut.delete({ where: { key } }).catch(() => {});
        return NextResponse.json({ key, count: 0 });
      }
      await prisma.transferOut.upsert({
        where: { key },
        update: { orgname, designation, count },
        create: { key, orgname, designation, count }
      });
      return NextResponse.json({ key, count });
    }

    if (path === 'transfers/in/pool') {
      const { designation, count } = body;
      if (count <= 0) {
        await prisma.transferInPool.delete({ where: { designation } }).catch(() => {});
        return NextResponse.json({ designation, count: 0 });
      }
      await prisma.transferInPool.upsert({
        where: { designation },
        update: { count },
        create: { designation, count }
      });
      return NextResponse.json({ designation, count });
    }

    return NextResponse.json({ error: 'Endpoint not implemented' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join('/');
  
  try {
    if (path === 'transfers/reset') {
      await prisma.transferOut.deleteMany({});
      await prisma.transferInPool.deleteMany({});
      await prisma.transferInDeployed.deleteMany({});
      return NextResponse.json({ out: 1, pool: 1, deployed: 1 });
    }

    return NextResponse.json({ error: 'Endpoint not implemented' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
