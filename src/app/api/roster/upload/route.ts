import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;

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

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file to disk
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
