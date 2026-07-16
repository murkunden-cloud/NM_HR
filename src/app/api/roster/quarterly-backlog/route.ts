import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

function getStats(data: any[], desigKeywords: string[], typeKeyword: string) {
  let totals = { SC:0, ST:0, VJA:0, NTB:0, NTC:0, NTD:0, SBC:0, OBC:0, SEBC:0, EWS:0, OPEN:0, TOTAL:0 };
  data.forEach(row => {
    const desig = (row[2] || '').toLowerCase();
    const type = (row[3] || '').toLowerCase();
    
    let desigMatch = desigKeywords.some(kw => desig.includes(kw.toLowerCase()));
    let typeMatch = type.includes(typeKeyword.toLowerCase());
    
    if (desigMatch && typeMatch) {
      totals.SC += row[4] || 0;
      totals.ST += row[5] || 0;
      totals.VJA += row[6] || 0;
      totals.NTB += row[7] || 0;
      totals.NTC += row[8] || 0;
      totals.NTD += row[9] || 0;
      totals.SBC += row[10] || 0;
      totals.OBC += row[11] || 0;
      totals.SEBC += row[12] || 0;
      totals.EWS += row[13] || 0;
      totals.OPEN += row[14] || 0;
      totals.TOTAL += (row[15] || row[16] || 0);
    }
  });
  return totals;
}

function writeRowData(sheet: any, rowIdx: number, sStats: any, fStats: any) {
  const cats = ['SC', 'ST', 'VJA', 'NTB', 'NTC', 'NTD', 'SBC', 'OBC', 'SEBC', 'EWS', 'OPEN', 'TOTAL'];
  const cols = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'];
  
  const vacant = Math.max(0, sStats.TOTAL - fStats.TOTAL);
  
  sheet['D'+rowIdx] = { v: sStats.TOTAL, t: 'n' };
  sheet['E'+rowIdx] = { v: fStats.TOTAL, t: 'n' };
  sheet['F'+rowIdx] = { v: vacant, t: 'n' };
  
  for(let i=0; i<cats.length; i++) {
    const cat = cats[i];
    const col = cols[i];
    let backlog = Math.max(0, sStats[cat] - fStats[cat]);
    if(cat === 'TOTAL') {
      let sum = 0;
      for(let j=0; j<cats.length-1; j++) {
        sum += Math.max(0, sStats[cats[j]] - fStats[cats[j]]);
      }
      backlog = sum;
    }
    sheet[col+rowIdx] = { v: backlog, t: 'n' };
  }
}

function writeRowDataC(sheet: any, rowIdx: number, sStats: any, fStats: any) {
  const cats = ['SC', 'ST', 'VJA', 'NTB', 'NTC', 'NTD', 'SBC', 'OBC', 'SEBC', 'EWS', 'OPEN', 'TOTAL'];
  const cols = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
  
  const vacant = Math.max(0, sStats.TOTAL - fStats.TOTAL);
  
  sheet['C'+rowIdx] = { v: sStats.TOTAL, t: 'n' };
  sheet['D'+rowIdx] = { v: fStats.TOTAL, t: 'n' };
  sheet['E'+rowIdx] = { v: vacant, t: 'n' };
  
  for(let i=0; i<cats.length; i++) {
    const cat = cats[i];
    const col = cols[i];
    let backlog = Math.max(0, sStats[cat] - fStats[cat]);
    if(cat === 'TOTAL') {
      let sum = 0;
      for(let j=0; j<cats.length-1; j++) {
        sum += Math.max(0, sStats[cats[j]] - fStats[cats[j]]);
      }
      backlog = sum;
    }
    sheet[col+rowIdx] = { v: backlog, t: 'n' };
  }
}

function sumStats(statsList: any[]) {
  let totals = { SC:0, ST:0, VJA:0, NTB:0, NTC:0, NTD:0, SBC:0, OBC:0, SEBC:0, EWS:0, OPEN:0, TOTAL:0 };
  statsList.forEach(s => {
    Object.keys(totals).forEach(k => {
      (totals as any)[k] += s[k];
    });
  });
  return totals;
}

function buildSheetForCircle(targetCircle: string, wbBuffer: Buffer, sDataFull: any[], fDataFull: any[], proforma: string) {
  const wb = XLSX.read(wbBuffer, { type: 'buffer' });
  const sData = targetCircle === 'All' ? sDataFull : sDataFull.filter(r => r[0] === targetCircle);
  const fData = targetCircle === 'All' ? fDataFull : fDataFull.filter(r => r[0] === targetCircle);
  
  let targetSheetName = '';
  let sheet;

  if (proforma === 'A') {
    targetSheetName = wb.SheetNames[0]; // Proforma-A
    sheet = wb.Sheets[targetSheetName];

    // Calculate UDC
    const udc_s_85 = getStats(sData, ['Upper Division Clerk'], '85%');
    const udc_f_85 = getStats(fData, ['Upper Division Clerk'], '85%');
    const udc_s_15 = getStats(sData, ['Upper Division Clerk'], '15%');
    const udc_f_15 = getStats(fData, ['Upper Division Clerk'], '15%');
    const udc_s_tot = sumStats([udc_s_85, udc_s_15]);
    const udc_f_tot = sumStats([udc_f_85, udc_f_15]);

    // Calculate LDC
    const ldc_s_75 = getStats(sData, ['Lower Division Clerk'], '75%');
    const ldc_f_75 = getStats(fData, ['Lower Division Clerk'], '75%');
    const ldc_s_15 = getStats(sData, ['Lower Division Clerk'], '15%');
    const ldc_f_15 = getStats(fData, ['Lower Division Clerk'], '15%');
    const ldc_s_10 = getStats(sData, ['Lower Division Clerk'], '10%');
    const ldc_f_10 = getStats(fData, ['Lower Division Clerk'], '10%');
    const ldc_s_tot_75 = sumStats([ldc_s_75]);
    const ldc_f_tot_75 = sumStats([ldc_f_75]);
    const ldc_s_tot = sumStats([ldc_s_75, ldc_s_15, ldc_s_10]);
    const ldc_f_tot = sumStats([ldc_f_75, ldc_f_15, ldc_f_10]);

    // Calculate Driver, Jr Assistant, Peon
    const drv_s_100 = getStats(sData, ['Vehicle Driver', 'Driver'], 'Direct');
    const drv_f_100 = getStats(fData, ['Vehicle Driver', 'Driver'], 'Direct');
    const jra_s_100 = getStats(sData, ['Junior Office Assistant'], 'Direct');
    const jra_f_100 = getStats(fData, ['Junior Office Assistant'], 'Direct');
    const peon_s_100 = getStats(sData, ['PEON'], 'Direct');
    const peon_f_100 = getStats(fData, ['PEON'], 'Direct');

    writeRowData(sheet, 7, udc_s_85, udc_f_85);
    writeRowData(sheet, 8, udc_s_15, udc_f_15);
    writeRowData(sheet, 9, udc_s_tot, udc_f_tot);
    writeRowData(sheet, 10, ldc_s_75, ldc_f_75);
    writeRowData(sheet, 13, ldc_s_tot_75, ldc_f_tot_75);
    writeRowData(sheet, 14, ldc_s_15, ldc_f_15);
    writeRowData(sheet, 15, ldc_s_10, ldc_f_10);
    writeRowData(sheet, 16, ldc_s_tot, ldc_f_tot);
    writeRowData(sheet, 17, drv_s_100, drv_f_100);
    writeRowData(sheet, 18, jra_s_100, jra_f_100);
    writeRowData(sheet, 20, jra_s_100, jra_f_100);
    writeRowData(sheet, 21, peon_s_100, peon_f_100);
    writeRowData(sheet, 23, peon_s_100, peon_f_100);
  } else if (proforma === 'B') {
    targetSheetName = wb.SheetNames[1]; // Proforma-B
    sheet = wb.Sheets[targetSheetName];
    
    const udc_ac_s_85 = getStats(sData, ['Upper Division Clerk(AC)'], '85%');
    const udc_ac_f_85 = getStats(fData, ['Upper Division Clerk(AC)'], '85%');
    const udc_ac_s_15 = getStats(sData, ['Upper Division Clerk(AC)'], '15%');
    const udc_ac_f_15 = getStats(fData, ['Upper Division Clerk(AC)'], '15%');
    const empty = { SC:0, ST:0, VJA:0, NTB:0, NTC:0, NTD:0, SBC:0, OBC:0, SEBC:0, EWS:0, OPEN:0, TOTAL:0 };
    const udc_ac_s_tot = sumStats([udc_ac_s_85, udc_ac_s_15]);
    const udc_ac_f_tot = sumStats([udc_ac_f_85, udc_ac_f_15]);

    const ldc_ac_s_75 = getStats(sData, ['Lower Division Clerk (Accounts)'], '75%');
    const ldc_ac_f_75 = getStats(fData, ['Lower Division Clerk (Accounts)'], '75%');
    const ldc_ac_s_15 = getStats(sData, ['Lower Division Clerk (Accounts)'], '15%');
    const ldc_ac_f_15 = getStats(fData, ['Lower Division Clerk (Accounts)'], '15%');
    const ldc_ac_s_10 = getStats(sData, ['Lower Division Clerk (Accounts)'], '10%');
    const ldc_ac_f_10 = getStats(fData, ['Lower Division Clerk (Accounts)'], '10%');
    const ldc_ac_s_tot_75 = sumStats([ldc_ac_s_75]);
    const ldc_ac_f_tot_75 = sumStats([ldc_ac_f_75]);
    const ldc_ac_s_tot = sumStats([ldc_ac_s_75, ldc_ac_s_15, ldc_ac_s_10]);
    const ldc_ac_f_tot = sumStats([ldc_ac_f_75, ldc_ac_f_15, ldc_ac_f_10]);

    writeRowData(sheet, 7, udc_ac_s_85, udc_ac_f_85);
    writeRowData(sheet, 8, udc_ac_s_15, udc_ac_f_15);
    writeRowData(sheet, 9, empty, empty); // Account Assistant
    writeRowData(sheet, 10, udc_ac_s_tot, udc_ac_f_tot);
    writeRowData(sheet, 11, ldc_ac_s_75, ldc_ac_f_75);
    writeRowData(sheet, 12, empty, empty); // Junior Assistant A/C
    writeRowData(sheet, 13, ldc_ac_s_tot_75, ldc_ac_f_tot_75);
    writeRowData(sheet, 14, ldc_ac_s_15, ldc_ac_f_15);
    writeRowData(sheet, 15, ldc_ac_s_10, ldc_ac_f_10);
    writeRowData(sheet, 16, ldc_ac_s_tot, ldc_ac_f_tot);
  } else if (proforma === 'C') {
    targetSheetName = wb.SheetNames[2]; // Proforma-C
    sheet = wb.Sheets[targetSheetName];
    const empty = { SC:0, ST:0, VJA:0, NTB:0, NTC:0, NTD:0, SBC:0, OBC:0, SEBC:0, EWS:0, OPEN:0, TOTAL:0 };
    
    const po_s = getStats(sData, ['Principal Operator'], '');
    const po_f = getStats(fData, ['Principal Operator'], '');
    const so_s = getStats(sData, ['Senior Operator'], '');
    const so_f = getStats(fData, ['Senior Operator'], '');
    const o_s = getStats(sData, ['Operator'], '');
    const o_f = getStats(fData, ['Operator'], '');
    const to_s = sumStats([po_s, so_s, o_s]);
    const to_f = sumStats([po_f, so_f, o_f]);
    
    writeRowDataC(sheet, 3, po_s, po_f); 
    writeRowDataC(sheet, 4, so_s, so_f);
    writeRowDataC(sheet, 5, o_s, o_f);
    writeRowDataC(sheet, 6, empty, empty); // Upkendra Sahayak
    writeRowDataC(sheet, 7, to_s, to_f);
    writeRowDataC(sheet, 8, to_s, to_f); // Grand Total of All Operators

    const ct_s = getStats(sData, ['Chief Technician'], '');
    const ct_f = getStats(fData, ['Chief Technician'], '');
    const pt_s = getStats(sData, ['Principal Technician'], '');
    const pt_f = getStats(fData, ['Principal Technician'], '');
    const st_s = getStats(sData, ['Senior Technician'], '');
    const st_f = getStats(fData, ['Senior Technician'], '');
    const t_s = getStats(sData, ['Technician'], '');
    const t_f = getStats(fData, ['Technician'], '');
    const tt_s = sumStats([ct_s, pt_s, st_s, t_s]);
    const tt_f = sumStats([ct_f, pt_f, st_f, t_f]);
    
    writeRowDataC(sheet, 10, ct_s, ct_f);
    writeRowDataC(sheet, 11, pt_s, pt_f);
    writeRowDataC(sheet, 12, st_s, st_f);
    writeRowDataC(sheet, 13, t_s, t_f);
    writeRowDataC(sheet, 14, empty, empty); // Vidyut Sahayak
    writeRowDataC(sheet, 15, tt_s, tt_f);
    writeRowDataC(sheet, 16, tt_s, tt_f); // Grand Total of All Technicians
  } else {
    targetSheetName = wb.SheetNames[0];
    sheet = wb.Sheets[targetSheetName];
  }

  // Update header text to reflect circle (e.g. "Name of Zone: Pune Zone (RPUC)")
  if (proforma === 'A' || proforma === 'B') {
    const hdrCell = sheet['A3'] || sheet['B3'] || sheet['N3']; // Proforma A/B usually has Name of Zone in A3/B3/N3
    // We don't overwrite if we can't find it easily without knowing exact cell, but let's try A3.
  }

  return sheet;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const proforma = searchParams.get('proforma') || 'A';
    const circle = searchParams.get('circle') || 'All';
    
    const TEMPLATE_PATH = path.join(process.cwd(), 'Vacancy Backlog format.xls');
    const SANCTION_PATH = path.join(process.cwd(), 'src', 'components', 'Roster', 'sanction.xlsx');
    const FILLED_PATH = path.join(process.cwd(), 'src', 'components', 'Roster', 'filled.xlsx');
    
    if (!fs.existsSync(TEMPLATE_PATH) || !fs.existsSync(SANCTION_PATH) || !fs.existsSync(FILLED_PATH)) {
      return NextResponse.json({ error: 'Required files not found' }, { status: 404 });
    }

    const sanctionWb = XLSX.read(fs.readFileSync(SANCTION_PATH), { type: 'buffer' });
    const filledWb = XLSX.read(fs.readFileSync(FILLED_PATH), { type: 'buffer' });

    const s3 = XLSX.utils.sheet_to_json(sanctionWb.Sheets['III'] || sanctionWb.Sheets[sanctionWb.SheetNames[0]], { header: 1 }) as any[];
    const s4 = XLSX.utils.sheet_to_json(sanctionWb.Sheets['IV'] || sanctionWb.Sheets[sanctionWb.SheetNames[1]], { header: 1 }) as any[];
    const f3 = XLSX.utils.sheet_to_json(filledWb.Sheets['III'] || filledWb.Sheets[filledWb.SheetNames[0]], { header: 1 }) as any[];
    const f4 = XLSX.utils.sheet_to_json(filledWb.Sheets['IV'] || filledWb.Sheets[filledWb.SheetNames[1]], { header: 1 }) as any[];

    const sData = s3.slice(1).concat(s4.slice(1));
    const fData = f3.slice(1).concat(f4.slice(1));

    const fileBuffer = fs.readFileSync(TEMPLATE_PATH);
    const outWb = XLSX.utils.book_new();

    if (circle === 'All') {
      const circles = ['RPUC', 'GKUC', 'PRC', 'All'];
      circles.forEach(c => {
        const sheet = buildSheetForCircle(c, fileBuffer, sData, fData, proforma);
        const nameSuffix = c === 'All' ? 'Zone Total' : c;
        XLSX.utils.book_append_sheet(outWb, sheet, `${nameSuffix}`);
      });
    } else {
      const sheet = buildSheetForCircle(circle, fileBuffer, sData, fData, proforma);
      XLSX.utils.book_append_sheet(outWb, sheet, `Proforma ${proforma} - ${circle}`);
    }
    
    const buf = XLSX.write(outWb, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Quarterly_Backlog_Proforma_${proforma}_${circle}.xlsx"`
      }
    });
  } catch (error: any) {
    console.error('Error serving quarterly backlog:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
