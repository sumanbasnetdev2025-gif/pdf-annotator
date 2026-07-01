import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    new URL(url); // validate URL
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const isImage = contentType.startsWith('image/');
    const isPdf = contentType.includes('pdf');

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: 'URL does not point to a PDF or image' },
        { status: 400 }
      );
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'attachment',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Could not fetch file: ${String(err)}` },
      { status: 500 }
    );
  }
}