import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const empno = url.searchParams.get('empno');
    const type = url.searchParams.get('type'); // 'leaves', 'promotions', 'transfers'

    if (!empno) {
      return NextResponse.json({ success: false, error: 'Missing empno parameter' }, { status: 400 });
    }

    if (type === 'leaves') {
      const records = await prisma.leaveRecord.findMany({
        where: { empno },
        orderBy: { from_dt: 'desc' }
      });
      return NextResponse.json({ success: true, records });
    }

    if (type === 'promotions') {
      const records = await prisma.promotionHistory.findMany({
        where: { empno },
        orderBy: { prom_date: 'desc' }
      });
      return NextResponse.json({ success: true, records });
    }

    if (type === 'transfers') {
      const records = await prisma.transferHistory.findMany({
        where: { empno },
        orderBy: { transfer_date: 'desc' }
      });
      return NextResponse.json({ success: true, records });
    }

    // Default: fetch all
    const leaves = await prisma.leaveRecord.findMany({ where: { empno } });
    const promotions = await prisma.promotionHistory.findMany({ where: { empno } });
    const transfers = await prisma.transferHistory.findMany({ where: { empno } });

    return NextResponse.json({ success: true, leaves, promotions, transfers });

  } catch (error) {
    console.error('API Transactions GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data || !data.empno) {
      return NextResponse.json({ success: false, error: 'Missing type or record details' }, { status: 400 });
    }

    if (type === 'leave') {
      // Overlap check
      const overlaps = await prisma.leaveRecord.findMany({
        where: {
          empno: data.empno,
          OR: [
            {
              AND: [
                { from_dt: { lte: data.to_dt } },
                { to_dt: { gte: data.from_dt } }
              ]
            }
          ]
        }
      });

      if (overlaps.length > 0) {
        return NextResponse.json({ 
          success: false, 
          error: `Overlap Error: Leave dates overlap with an existing record (${overlaps[0].from_dt} to ${overlaps[0].to_dt})` 
        }, { status: 400 });
      }

      const newLeave = await prisma.leaveRecord.create({
        data: {
          empno: data.empno,
          leave_type: data.leave_type,
          from_dt: data.from_dt,
          to_dt: data.to_dt,
          days: parseFloat(data.days || '0'),
          sanction_order: data.sanction_order || null,
          remarks: data.remarks || null,
          created_dt: new Date().toISOString().split('T')[0]
        }
      });
      return NextResponse.json({ success: true, record: newLeave });
    }

    if (type === 'promotion') {
      const newProm = await prisma.promotionHistory.create({
        data: {
          empno: data.empno,
          prom_date: data.prom_date,
          from_desig: data.from_desig || null,
          to_desig: data.to_desig || null,
          from_scale: data.from_scale || null,
          to_scale: data.to_scale || null,
          pay_before: parseFloat(data.pay_before || '0'),
          pay_after: parseFloat(data.pay_after || '0'),
          prom_type: data.prom_type || null,
          remarks: data.remarks || null,
          created_dt: new Date().toISOString().split('T')[0]
        }
      });
      return NextResponse.json({ success: true, record: newProm });
    }

    if (type === 'transfer') {
      const newTransfer = await prisma.transferHistory.create({
        data: {
          empno: data.empno,
          transfer_date: data.transfer_date,
          from_date: data.from_date || null,
          to_date: data.to_date || null,
          from_location: data.from_location || null,
          from_loccode: data.from_loccode || null,
          to_location: data.to_location || null,
          to_loccode: data.to_loccode || null,
          from_desig: data.from_desig || null,
          to_desig: data.to_desig || null,
          transfer_type: data.transfer_type || null,
          promotion_no: parseInt(data.promotion_no || '0', 10),
          order_no: data.order_no || null,
          remarks: data.remarks || null,
          created_dt: new Date().toISOString().split('T')[0]
        }
      });
      return NextResponse.json({ success: true, record: newTransfer });
    }

    if (type === 'transfer_batch') {
      const { batch } = data;
      if (!Array.isArray(batch) || batch.length === 0) {
        return NextResponse.json({ success: false, error: 'Empty batch array' }, { status: 400 });
      }

      const createdRecords = [];
      for (const t of batch) {
        const newTransfer = await prisma.transferHistory.create({
          data: {
            empno: t.empno,
            transfer_date: t.transfer_date || new Date().toISOString().split('T')[0],
            from_location: t.from_location || null,
            to_location: t.to_location || null,
            from_desig: t.from_desig || null,
            to_desig: t.to_desig || null,
            transfer_type: t.transfer_type || null,
            order_no: t.order_no || null,
            remarks: t.remarks || null,
            created_dt: new Date().toISOString().split('T')[0]
          }
        });
        createdRecords.push(newTransfer);
      }
      return NextResponse.json({ success: true, count: createdRecords.length, records: createdRecords });
    }

    return NextResponse.json({ success: false, error: `Invalid transaction type: ${type}` }, { status: 400 });

  } catch (error) {
    console.error('API Transactions POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, type, data } = body;

    if (!id || !type || !data) {
      return NextResponse.json({ success: false, error: 'Missing id, type or data' }, { status: 400 });
    }

    if (type === 'promotion') {
      const updatedProm = await prisma.promotionHistory.update({
        where: { id },
        data: {
          prom_date: data.prom_date,
          from_desig: data.from_desig || null,
          to_desig: data.to_desig || null,
          from_scale: data.from_scale || null,
          to_scale: data.to_scale || null,
          pay_before: parseFloat(data.pay_before || '0'),
          pay_after: parseFloat(data.pay_after || '0'),
          prom_type: data.prom_type || null,
          remarks: data.remarks || null,
        }
      });
      return NextResponse.json({ success: true, record: updatedProm });
    }

    if (type === 'transfer') {
      const updatedTransfer = await prisma.transferHistory.update({
        where: { id },
        data: {
          transfer_date: data.transfer_date,
          from_date: data.from_date || null,
          to_date: data.to_date || null,
          from_location: data.from_location || null,
          from_loccode: data.from_loccode || null,
          to_location: data.to_location || null,
          to_loccode: data.to_loccode || null,
          from_desig: data.from_desig || null,
          to_desig: data.to_desig || null,
          transfer_type: data.transfer_type || null,
          promotion_no: parseInt(data.promotion_no || '0', 10),
          order_no: data.order_no || null,
          remarks: data.remarks || null,
        }
      });
      return NextResponse.json({ success: true, record: updatedTransfer });
    }

    return NextResponse.json({ success: false, error: `Invalid transaction type: ${type}` }, { status: 400 });

  } catch (error) {
    console.error('API Transactions PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 });
  }
}
