/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function cleanFloat(val: any): number {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

function cleanInt(val: any): number {
  if (val === null || val === undefined) return 0;
  const num = parseInt(val, 10);
  return isNaN(num) ? 0 : num;
}

export async function POST(request: Request) {
  try {
    const { table, records } = await request.json();

    // Support clear_all action
    if (table === 'clear_all') {
      await prisma.leaveRecord.deleteMany();
      await prisma.seniorityOverride.deleteMany();
      await prisma.transferHistory.deleteMany();
      await prisma.promotionHistory.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.user.deleteMany();
      await prisma.appSettings.deleteMany();
      await prisma.post.deleteMany();
      await prisma.designation.deleteMany();
      await prisma.payScale.deleteMany();
      await prisma.location.deleteMany();
      return NextResponse.json({
        success: true,
        message: 'All tables cleared successfully'
      });
    }

    if (!table || !Array.isArray(records)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payload: table and records (array) are required'
      }, { status: 400 });
    }

    let resultCount = 0;

    switch (table) {
      case 'locations': {
        const formatted = records.map((r: any) => ({
          loccode: String(r.loccode),
          locnm: r.locnm ? String(r.locnm) : null
        }));
        const res = await prisma.location.createMany({ data: formatted });
        resultCount = res.count;
        break;
      }

      case 'pay_scales': {
        const formatted = records.map((r: any) => ({
          scaleno: String(r.scaleno),
          payscl: r.payscl ? String(r.payscl) : null,
          stage1: cleanFloat(r.stage1),
          incri1: cleanFloat(r.incri1),
          stage2: cleanFloat(r.stage2),
          incri2: cleanFloat(r.incri2),
          stage3: cleanFloat(r.stage3),
          incri3: cleanFloat(r.incri3),
          stage4: cleanFloat(r.stage4),
          incri4: cleanFloat(r.incri4),
          category: r.category ? String(r.category) : null,
          circular_no: r.circular_no ? String(r.circular_no) : null,
          is_current: cleanInt(r.is_current)
        }));
        const res = await prisma.payScale.createMany({ data: formatted });
        resultCount = res.count;
        break;
      }

      case 'designations': {
        const formatted = records.map((r: any) => ({
          dez_id: String(r.dez_id),
          desigz: r.desigz ? String(r.desigz) : null,
          paygrp: r.paygrp ? String(r.paygrp) : null,
          paysclno: r.paysclno ? String(r.paysclno) : null,
          payscl: r.payscl ? String(r.payscl) : null,
          paysclno1: r.paysclno1 ? String(r.paysclno1) : null,
          payscl1: r.payscl1 ? String(r.payscl1) : null,
          types: r.types ? String(r.types) : null,
          cat: r.cat ? String(r.cat) : null,
          seniority: r.seniority ? String(r.seniority) : null
        }));
        const res = await prisma.designation.createMany({ data: formatted });
        resultCount = res.count;
        break;
      }

      case 'posts': {
        const formatted = records.map((r: any) => ({
          dez_id: String(r.dez_id),
          desigz: r.desigz ? String(r.desigz) : null,
          paygrp: r.paygrp ? String(r.paygrp) : null,
          paysclno: r.paysclno ? String(r.paysclno) : null,
          payscl: r.payscl ? String(r.payscl) : null,
          cat: r.cat ? String(r.cat) : null,
          types: r.types ? String(r.types) : null,
          seniority: r.seniority ? String(r.seniority) : null
        }));
        const res = await prisma.post.createMany({ data: formatted });
        resultCount = res.count;
        break;
      }

      case 'employees': {
        const formatted = records.map((r: any) => ({
          empno: String(r.empno),
          loccode: r.loccode ? String(r.loccode) : null,
          empnm: r.empnm ? String(r.empnm) : null,
          desigz: r.desigz ? String(r.desigz) : null,
          locnm: r.locnm ? String(r.locnm) : null,
          corp: r.corp ? String(r.corp) : null,
          regionm: r.regionm ? String(r.regionm) : null,
          zonenm: r.zonenm ? String(r.zonenm) : null,
          circl: r.circl ? String(r.circl) : null,
          divnm: r.divnm ? String(r.divnm) : null,
          subdnm: r.subdnm ? String(r.subdnm) : null,
          sectionm: r.sectionm ? String(r.sectionm) : null,
          substnm: r.substnm ? String(r.substnm) : null,
          paygrp: r.paygrp ? String(r.paygrp) : null,
          cader: r.cader ? String(r.cader) : null,
          gender: r.gender ? String(r.gender) : null,
          types: r.types ? String(r.types) : null,
          compjoindt: r.compjoindt ? String(r.compjoindt) : null,
          brthdt: r.brthdt ? String(r.brthdt) : null,
          dtofretir: r.dtofretir ? String(r.dtofretir) : null,
          cast: r.cast ? String(r.cast) : null,
          subcast: r.subcast ? String(r.subcast) : null,
          validity: r.validity ? String(r.validity) : null,
          valdtno: r.valdtno ? String(r.valdtno) : null,
          valddt: r.valddt ? String(r.valddt) : null,
          ppljoindt: r.ppljoindt ? String(r.ppljoindt) : null,
          panno: r.panno ? String(r.panno) : null,
          basic: cleanFloat(r.basic),
          bankno: r.bankno ? String(r.bankno) : null,
          payscl: r.payscl ? String(r.payscl) : null,
          banknm: r.banknm ? String(r.banknm) : null,
          qtrtype: r.qtrtype ? String(r.qtrtype) : null,
          dtofincri: r.dtofincri ? String(r.dtofincri) : null,
          mobileno: r.mobileno ? String(r.mobileno) : null,
          educ: r.educ ? String(r.educ) : null,
          email: r.email ? String(r.email) : null,
          
          istgodt: r.istgodt ? String(r.istgodt) : null,
          ist_go_scale: r.ist_go_scale ? String(r.ist_go_scale) : null,
          ist_go_pay: cleanFloat(r.ist_go_pay),
          iindgodt: r.iindgodt ? String(r.iindgodt) : null,
          iind_go_scale: r.iind_go_scale ? String(r.iind_go_scale) : null,
          iind_go_pay: cleanFloat(r.iind_go_pay),
          iiirdgodt: r.iiirdgodt ? String(r.iiirdgodt) : null,
          iiird_go_scale: r.iiird_go_scale ? String(r.iiird_go_scale) : null,
          iiird_go_pay: cleanFloat(r.iiird_go_pay),
          
          transdt: r.transdt ? String(r.transdt) : null,
          transfer_type: r.transfer_type ? String(r.transfer_type) : null,
          
          is_rejoined: cleanInt(r.is_rejoined),
          rejoindt: r.rejoindt ? String(r.rejoindt) : null,
          rejoin_mode: r.rejoin_mode ? String(r.rejoin_mode) : null,
          original_compjoindt: r.original_compjoindt ? String(r.original_compjoindt) : null,
          
          updated_by: r.updated_by ? String(r.updated_by) : null,
          updated_dt: r.updated_dt ? String(r.updated_dt) : null,
          
          suspension_days: cleanInt(r.suspension_days),
          exleave_nopay_days: cleanInt(r.exleave_nopay_days),
          exleave_counted: cleanInt(r.exleave_counted),
          exleave_reason: r.exleave_reason ? String(r.exleave_reason) : null,
          officiating_post: r.officiating_post ? String(r.officiating_post) : null,
          officiating_from: r.officiating_from ? String(r.officiating_from) : null,
          increment_stoppages: cleanInt(r.increment_stoppages),
          last_increment_dt: r.last_increment_dt ? String(r.last_increment_dt) : null,
          next_increment_dt: r.next_increment_dt ? String(r.next_increment_dt) : null,
          increment_note: r.increment_note ? String(r.increment_note) : null,
          
          aadhaarno: r.aadhaarno ? String(r.aadhaarno) : null,
          gpfno: r.gpfno ? String(r.gpfno) : null,
          spousenm: r.spousenm ? String(r.spousenm) : null,
          caste_category: r.caste_category ? String(r.caste_category) : null,
          caste_validity_status: r.caste_validity_status ? String(r.caste_validity_status) : null,
          caste_validity_no: r.caste_validity_no ? String(r.caste_validity_no) : null,
          caste_validity_dt: r.caste_validity_dt ? String(r.caste_validity_dt) : null
        }));
        const res = await prisma.employee.createMany({ data: formatted });
        resultCount = res.count;
        break;
      }

      case 'promotion_history': {
        const formatted = records.map((r: any) => ({
          empno: String(r.empno),
          prom_date: r.prom_date ? String(r.prom_date) : null,
          from_desig: r.from_desig ? String(r.from_desig) : null,
          to_desig: r.to_desig ? String(r.to_desig) : null,
          from_scale: r.from_scale ? String(r.from_scale) : null,
          to_scale: r.to_scale ? String(r.to_scale) : null,
          pay_before: cleanFloat(r.pay_before),
          pay_after: cleanFloat(r.pay_after),
          prom_type: r.prom_type ? String(r.prom_type) : null,
          remarks: r.remarks ? String(r.remarks) : null,
          created_dt: r.created_dt ? String(r.created_dt) : null
        }));
        const res = await prisma.promotionHistory.createMany({ data: formatted });
        resultCount = res.count;
        break;
      }

      case 'transfer_history': {
        const formatted = records.map((r: any) => ({
          empno: String(r.empno),
          transfer_date: r.transfer_date ? String(r.transfer_date) : null,
          from_date: r.from_date ? String(r.from_date) : null,
          to_date: r.to_date ? String(r.to_date) : null,
          from_location: r.from_location ? String(r.from_location) : null,
          from_loccode: r.from_loccode ? String(r.from_loccode) : null,
          to_location: r.to_location ? String(r.to_location) : null,
          to_loccode: r.to_loccode ? String(r.to_loccode) : null,
          from_desig: r.from_desig ? String(r.from_desig) : null,
          to_desig: r.to_desig ? String(r.to_desig) : null,
          transfer_type: r.transfer_type ? String(r.transfer_type) : null,
          promotion_no: cleanInt(r.promotion_no),
          order_no: r.order_no ? String(r.order_no) : null,
          remarks: r.remarks ? String(r.remarks) : null,
          created_dt: r.created_dt ? String(r.created_dt) : null
        }));
        const res = await prisma.transferHistory.createMany({ data: formatted });
        resultCount = res.count;
        break;
      }

      case 'app_settings': {
        const formatted = records.map((r: any) => ({
          key: String(r.key),
          value: String(r.value)
        }));
        const res = await prisma.appSettings.createMany({ data: formatted });
        resultCount = res.count;
        break;
      }

      case 'users': {
        const formatted = records.map((r: any) => ({
          username: String(r.username),
          password_hash: String(r.password_hash),
          full_name: r.full_name ? String(r.full_name) : null,
          role: String(r.role),
          circl: r.circl ? String(r.circl) : null,
          divnm: r.divnm ? String(r.divnm) : null,
          permissions: r.permissions ? String(r.permissions) : null
        }));
        const res = await prisma.user.createMany({ data: formatted });
        resultCount = res.count;
        break;
      }

      case 'seniority_override': {
        const formatted = records.map((r: any) => ({
          empno: String(r.empno),
          designation: String(r.designation),
          seniority_no: cleanInt(r.seniority_no),
          remarks: r.remarks ? String(r.remarks) : null,
          updated_by: r.updated_by ? String(r.updated_by) : null,
          updated_dt: r.updated_dt ? String(r.updated_dt) : null
        }));
        const res = await prisma.seniorityOverride.createMany({ data: formatted });
        resultCount = res.count;
        break;
      }

      case 'leave_records': {
        const formatted = records.map((r: any) => ({
          empno: String(r.empno),
          leave_type: String(r.leave_type),
          from_dt: String(r.from_dt),
          to_dt: String(r.to_dt),
          days: cleanFloat(r.days),
          sanction_order: r.sanction_order ? String(r.sanction_order) : null,
          remarks: r.remarks ? String(r.remarks) : null,
          created_dt: r.created_dt ? String(r.created_dt) : null
        }));
        const res = await prisma.leaveRecord.createMany({ data: formatted });
        resultCount = res.count;
        break;
      }

      default: {
        return NextResponse.json({
          success: false,
          error: `Table '${table}' is not supported for import`
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${resultCount} records into ${table}`
    });

  } catch (error: any) {
    console.error('API Import error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'An error occurred during bulk import'
    }, { status: 500 });
  }
}
