import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  
  try {
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
