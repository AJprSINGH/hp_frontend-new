import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parseCSVData } from '@/lib/matcher';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');
    const industriesCSV = await fs.readFile(path.join(dataDir, 's_industries.csv'), 'utf-8');
    const industries = parseCSVData(industriesCSV);
    
    return NextResponse.json(industries);
  } catch (error) {
    console.error('Error loading industries data:', error);
    return NextResponse.json(
      { error: 'Failed to load industries' },
      { status: 500 }
    );
  }
}