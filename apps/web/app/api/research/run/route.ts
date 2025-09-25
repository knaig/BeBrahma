import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { query, role, mode } = await req.json();
    if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

    // Stub response for now – integrate with apps/api or Beam later
    const findings = [
      { title: 'Competitor traction', summary: 'Top players show month-over-month growth in India SMB segment.' },
      { title: 'Pricing bands', summary: 'Common range INR 2k–10k/mo for SMB-tier plans.' }
    ];
    const citations = [
      { source: 'Product Hunt', url: 'https://www.producthunt.com', snippet: 'Recent launches and traction' },
      { source: 'Review portal', url: 'https://example.com/reviews', snippet: 'SMB reviews indicating demand' }
    ];
    const gaps = ['Need direct India-specific adoption benchmarks', 'Regional latency comparisons missing'];

    return NextResponse.json({ findings, citations, gaps, role, mode });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


