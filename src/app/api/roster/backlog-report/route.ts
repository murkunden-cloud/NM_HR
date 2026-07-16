import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// Helper function to filter internal notification
function filterInternalNotification(data: any[]) {
  return data.filter(row => {
    const sanctionType = row[3];
    return sanctionType && !sanctionType.includes("Internal Notification");
  });
}

// Helper function to map recruitment type
function mapRecruitmentType(sanctionType: string) {
  if (sanctionType.includes("Direct Recruitment")) return "DIRECT";
  if (sanctionType.includes("Promotion")) return "PROMOTION";
  return "OTHER";
}

// Helper function to aggregate by circle
function aggregateByCircle(data: any[], isFilled = false) {
  const circles: any = {};
  
  data.forEach(row => {
    const circle = row[0];
    const sanctionType = row[3];
    const recruitType = mapRecruitmentType(sanctionType || "");
    
    if (!circle || recruitType === "OTHER") return;
    
    const categories = {
      SC: row[4] || 0, ST: row[5] || 0, VJA: row[6] || 0,
      NTB: row[7] || 0, NTC: row[8] || 0, NTD: row[9] || 0,
      SBC: row[10] || 0, OBC: row[11] || 0, SEBC: row[12] || 0,
      EWS: row[13] || 0, OPEN: row[14] || 0
    };
    
    const total = isFilled ? (row[16] || 0) : (row[15] || 0);
    
    if (!circles[circle]) {
      circles[circle] = {
        DIRECT: { SC: 0, ST: 0, VJA: 0, NTB: 0, NTC: 0, NTD: 0, SBC: 0, OBC: 0, SEBC: 0, EWS: 0, OPEN: 0, TOTAL: 0 },
        PROMOTION: { SC: 0, ST: 0, VJA: 0, NTB: 0, NTC: 0, NTD: 0, SBC: 0, OBC: 0, SEBC: 0, EWS: 0, OPEN: 0, TOTAL: 0 }
      };
    }
    
    if (recruitType === "DIRECT" || recruitType === "PROMOTION") {
      Object.keys(categories).forEach(cat => {
        circles[circle][recruitType][cat] += (categories as any)[cat];
      });
      circles[circle][recruitType].TOTAL += total;
    }
  });
  
  return circles;
}

// Helper function to calculate zone totals
function calculateZone_totels(circles: any) {
  const zoneTotal: any = {
    DIRECT: { SC: 0, ST: 0, VJA: 0, NTB: 0, NTC: 0, NTD: 0, SBC: 0, OBC: 0, SEBC: 0, EWS: 0, OPEN: 0, TOTAL: 0 },
    PROMOTION: { SC: 0, ST: 0, VJA: 0, NTB: 0, NTC: 0, NTD: 0, SBC: 0, OBC: 0, SEBC: 0, EWS: 0, OPEN: 0, TOTAL: 0 }
  };
  
  Object.keys(circles).forEach(circle => {
    ["DIRECT", "PROMOTION"].forEach(type => {
      Object.keys(circles[circle][type]).forEach(cat => {
        zoneTotal[type][cat] += circles[circle][type][cat];
      });
    });
  });
  
  return zoneTotal;
}

export async function GET() {
  try {
    const SANCTION_PATH = path.join(process.cwd(), 'src', 'components', 'Roster', 'sanction.xlsx');
    const FILLED_PATH = path.join(process.cwd(), 'src', 'components', 'Roster', 'filled.xlsx');
    
    if (!fs.existsSync(SANCTION_PATH) || !fs.existsSync(FILLED_PATH)) {
      return NextResponse.json({ error: 'Master files not found' }, { status: 404 });
    }

    const sanctionWb = XLSX.read(fs.readFileSync(SANCTION_PATH), { type: 'buffer' });
    const filledWb = XLSX.read(fs.readFileSync(FILLED_PATH), { type: 'buffer' });

    const sanctionIII = XLSX.utils.sheet_to_json(sanctionWb.Sheets["III"] || sanctionWb.Sheets[sanctionWb.SheetNames[0]], { header: 1 }) as any[];
    const sanctionIV = XLSX.utils.sheet_to_json(sanctionWb.Sheets["IV"] || sanctionWb.Sheets[sanctionWb.SheetNames[1]], { header: 1 }) as any[];
    const filledIII = XLSX.utils.sheet_to_json(filledWb.Sheets["III"] || filledWb.Sheets[filledWb.SheetNames[0]], { header: 1 }) as any[];
    const filledIV = XLSX.utils.sheet_to_json(filledWb.Sheets["IV"] || filledWb.Sheets[filledWb.SheetNames[1]], { header: 1 }) as any[];
    
    const sanctionIIIFiltered = filterInternalNotification(sanctionIII.slice(1));
    const sanctionIVFiltered = filterInternalNotification(sanctionIV.slice(1));
    const filledIIIFiltered = filterInternalNotification(filledIII.slice(1));
    const filledIVFiltered = filterInternalNotification(filledIV.slice(1));
    
    const sanctionIIICircles = aggregateByCircle(sanctionIIIFiltered, false);
    const sanctionIVCircles = aggregateByCircle(sanctionIVFiltered, false);
    const filledIIICircles = aggregateByCircle(filledIIIFiltered, true);
    const filledIVCircles = aggregateByCircle(filledIVFiltered, true);
    
    const sanctionIIIZone = calculateZone_totels(sanctionIIICircles);
    const sanctionIVZone = calculateZone_totels(sanctionIVCircles);
    const filledIIIZone = calculateZone_totels(filledIIICircles);
    const filledIVZone = calculateZone_totels(filledIVCircles);

    const outputData: any[] = [];
    
    function createRow(payGroup: any, recruitType: any, sanction: any, filled: any, circleName = "") {
      const vacant = Math.max(0, sanction.TOTAL - filled.TOTAL);
      const vacantOpen = Math.max(0, sanction.OPEN - filled.OPEN);
      
      return [
        payGroup, recruitType, sanction.TOTAL, filled.TOTAL, vacant, vacantOpen, 0, 0,
        filled.SC, filled.ST, filled.VJA, filled.NTB, filled.NTC, filled.NTD, filled.SBC, filled.OBC, filled.SEBC, filled.EWS, filled.OPEN, filled.TOTAL,
        sanction.SC, sanction.ST, sanction.VJA, sanction.NTB, sanction.NTC, sanction.NTD, sanction.SBC, sanction.OBC, sanction.SEBC, sanction.EWS, sanction.TOTAL,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, circleName
      ];
    }

    Object.keys(sanctionIIICircles).sort().forEach(circle => {
      outputData.push(createRow(3, "DIRECT", sanctionIIICircles[circle].DIRECT, filledIIICircles[circle]?.DIRECT || {SC:0,ST:0,VJA:0,NTB:0,NTC:0,NTD:0,SBC:0,OBC:0,SEBC:0,EWS:0,OPEN:0,TOTAL:0}, circle));
      outputData.push(createRow(3, "PROMOTION", sanctionIIICircles[circle].PROMOTION, filledIIICircles[circle]?.PROMOTION || {SC:0,ST:0,VJA:0,NTB:0,NTC:0,NTD:0,SBC:0,OBC:0,SEBC:0,EWS:0,OPEN:0,TOTAL:0}, circle));
    });
    
    outputData.push(["TOTAL (3)", "DIRECT", ...createRow(null, "DIRECT", sanctionIIIZone.DIRECT, filledIIIZone.DIRECT, "ZONE TOTAL").slice(2)]);
    outputData.push([null, "PROMOTION", ...createRow(null, "PROMOTION", sanctionIIIZone.PROMOTION, filledIIIZone.PROMOTION, "ZONE TOTAL").slice(2)]);
    
    Object.keys(sanctionIVCircles).sort().forEach(circle => {
      outputData.push(createRow(4, "DIRECT", sanctionIVCircles[circle].DIRECT, filledIVCircles[circle]?.DIRECT || {SC:0,ST:0,VJA:0,NTB:0,NTC:0,NTD:0,SBC:0,OBC:0,SEBC:0,EWS:0,OPEN:0,TOTAL:0}, circle));
      outputData.push(createRow(4, "PROMOTION", sanctionIVCircles[circle].PROMOTION, filledIVCircles[circle]?.PROMOTION || {SC:0,ST:0,VJA:0,NTB:0,NTC:0,NTD:0,SBC:0,OBC:0,SEBC:0,EWS:0,OPEN:0,TOTAL:0}, circle));
    });
    
    outputData.push(["TOTAL (4)", "DIRECT", ...createRow(null, "DIRECT", sanctionIVZone.DIRECT, filledIVZone.DIRECT, "ZONE TOTAL").slice(2)]);
    outputData.push([null, "PROMOTION", ...createRow(null, "PROMOTION", sanctionIVZone.PROMOTION, filledIVZone.PROMOTION, "ZONE TOTAL").slice(2)]);
    
    const wb = XLSX.utils.book_new();
    
    const header1 = [
      "PAYGROUP CAT", "RECRUIT TYPE", "TOT SANC", "TOT FILLED POST", "TOT VACANT POST",
      "VACANT  POST ONLY FOR OPEN", "CURRENT RESERVATION POST AMONG VACANT", "RESERV POST AMONG VACANT POST",
      "FILEED POST BIFURGATION", null, null, null, null, null, null, null, null, null, null, null,
      "BIFURGATION OF RESERVATION", null, null, null, null, null, null, null, null, null, null,
      "BIFURGATION CURRENT RESERVATION", null, null, null, null, null, null, null, null, null, null,
      "SUPERNUMRY", "REMARKS"
    ];
    
    const header2 = [
      null, null, null, null, null, null, null, null,
      "SC", "ST", "VJA", "NTB", "NTC", "NTD", "SBC", "OBC", "EWS", "SEBC", "OPEN", "TOTAL",
      "SC", "ST", "VJA", "NTB", "NTC", "NTD", "SBC", "OBC", "EWS", "SEBC", "TOTAL",
      "SC", "ST", "VJA", "NTB", "NTC", "NTD", "SBC", "OBC", "EWS", "SEBC", "TOTAL"
    ];
    
    const header3 = Array.from({ length: 44 }, (_, i) => i + 1);
    
    const finalData = [header1, header2, header3, ...outputData];
    
    const ws = XLSX.utils.aoa_to_sheet(finalData);
    XLSX.utils.book_append_sheet(wb, ws, "Proforma A");
    
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Backlog_Proforma_A.xlsx"'
      }
    });
  } catch (error: any) {
    console.error('Error generating backlog report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
