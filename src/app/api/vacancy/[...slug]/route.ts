import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join('/');

  try {
    if (path === 'filter-options') {
      const posts = await prisma.sanctionedPost.findMany({
        select: { circle: true, division: true, designation: true }
      });
      const employees = await prisma.employee.findMany({
        select: { office: true }
      });

      const circles = [...new Set(posts.map(p => p.circle).filter(Boolean))];
      const divisions = [...new Set(posts.map(p => p.division).filter(Boolean))];
      const designations = [...new Set(posts.map(p => p.designation).filter(Boolean))];
      const orgnames = [...new Set(employees.map(e => e.office).filter(Boolean))];

      return NextResponse.json({
        cadres: ["Unclassified"],
        paygroups: ["1", "2", "3", "4"],
        classes: ["Class-I", "Class-II", "Class-III", "Class-IV"],
        circles,
        divisions,
        designations,
        types: ["Technical", "Non-Technical"],
        orgnames
      });
    }

    if (path === 'locations') {
      // Fetch all sanctioned posts
      const posts = await prisma.sanctionedPost.findMany();
      // Fetch all employees to count FILLED_IN
      const employees = await prisma.employee.findMany({
        select: { office: true, designation: true }
      });

      // Fetch transfers out
      const transfersOut = await prisma.transferOut.findMany();
      const transfersIn = await prisma.transferInDeployed.findMany();

      // We need to map these to the format Vacancy.js expects
      const locMap: Record<string, any> = {};

      for (const p of posts) {
        // Group employees by office and designation
        const filled = employees.filter(e => e.office === p.division && e.designation === p.designation).length;
        
        // orgname in legacy was division/subdivision?
        const orgname = p.division || 'Unknown';
        const key = `${orgname}_${p.designation}`.toUpperCase();

        const out_c = transfersOut.find(t => t.key === key)?.count || 0;
        const in_c = transfersIn.find(t => t.key === key)?.count || 0;
        
        const sanc = p.count || 0;
        const active = filled - out_c + in_c;

        locMap[key] = {
          REGION: "Pune",
          ZONE: "Pune",
          CIRCLE: p.circle || "",
          DIVISION: p.division || "",
          SUBDIVISION: "",
          ORGNAME: orgname,
          CADRE: "Unclassified",
          PAYGROUP: "3", // Hardcoded for now
          TYPE: p.sanctionType || "Technical",
          DESIGNATION: p.designation,
          SANCTIONED: sanc,
          FILLED_IN: filled,
          CLASS: "Class-III",
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
        where: { office: orgname, designation: designation }
      });
      const mapped = data.map(e => ({
        id: e.id,
        name: e.empnm || '',
        cpfno: e.empno,
        designation: e.designation || '',
        orgname: e.office || '',
        original_orgname: e.office || ''
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
        designation: e.designation || '',
        office: e.office || '',
        division: e.office || '', // fallback
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
          { designation: { contains: q, mode: 'insensitive' } },
          { office: { contains: q, mode: 'insensitive' } }
        ];
      }
      if (designation && designation !== 'All') where.designation = designation;
      
      const data = await prisma.employee.findMany({ where });
      const mapped = data.map(e => ({
        id: e.id,
        name: e.empnm || '',
        cpfno: e.empno,
        designation: e.designation || '',
        orgname: e.office || '',
        original_orgname: e.office || ''
      }));
      return NextResponse.json(mapped);
    }

    if (path === 'locations/unmatched') {
      // Find employees where their office is not in sanctionedPosts.division
      const posts = await prisma.sanctionedPost.findMany({ select: { division: true }});
      const validOffices = new Set(posts.map(p => p.division).filter(Boolean));
      
      const emps = await prisma.employee.findMany({ select: { office: true }});
      
      const unmatchedCounts: Record<string, number> = {};
      for (const e of emps) {
        if (e.office && !validOffices.has(e.office)) {
          unmatchedCounts[e.office] = (unmatchedCounts[e.office] || 0) + 1;
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
