import { NextResponse } from 'next/server';

// Remove or restrict the GET endpoint since we're now using email search
export async function GET(request: Request) {
  return NextResponse.json(
    { message: 'This endpoint has been deprecated' },
    { status: 404 }
  );
} 