import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'shortcuts', 'Veltis.shortcut');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Shortcut file not found on server' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-apple-shortcut',
        'Content-Disposition': 'attachment; filename="Veltis.shortcut"',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Failed to serve shortcut file:', error);
    return NextResponse.json(
      { error: 'Internal server error downloading shortcut' },
      { status: 500 }
    );
  }
}
