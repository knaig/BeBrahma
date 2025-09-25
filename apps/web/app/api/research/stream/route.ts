import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

function sse(data: any, event?: string) {
  const payload = `data: ${JSON.stringify(data)}\n${event ? `event: ${event}\n` : ''}\n`;
  return payload;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || '';
  const role = searchParams.get('role') || 'agent';
  const mode = searchParams.get('mode') || 'standard';

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: any, event?: string) => controller.enqueue(encoder.encode(sse(data, event)));
      try {
        // Kickoff
        send({ phase: 'starting', message: `Starting research for: ${query}`, role, mode }, 'progress');
        await new Promise(r => setTimeout(r, 300));

        // Searching
        send({ phase: 'searching', message: 'Searching sources and portals…' }, 'progress');
        await new Promise(r => setTimeout(r, 600));

        // Crawling
        send({ phase: 'crawling', message: 'Crawling candidate URLs…', urls: [
          'https://www.producthunt.com',
          'https://example.com/reviews',
          'https://example.com/blog'
        ] }, 'progress');
        await new Promise(r => setTimeout(r, 800));

        // Extracting
        send({ phase: 'extracting', message: 'Extracting content and tables…' }, 'progress');
        await new Promise(r => setTimeout(r, 600));

        // Analyzing
        send({ phase: 'analyzing', message: 'Analyzing and ranking evidence…' }, 'progress');
        await new Promise(r => setTimeout(r, 600));

        // Synthesizing (streamed)
        const summary = [
          '### Research Summary',
          '',
          '- Market shows rising interest among SMBs',
          '- Pricing bands cluster around INR 2k–10k/mo',
          '- Key gaps: India-specific adoption benchmarks'
        ];
        for (const line of summary) {
          send({ phase: 'synthesizing', delta: line + '\n' }, 'summary_delta');
          await new Promise(r => setTimeout(r, 250));
        }

        // Complete
        const citations = [
          { source: 'Product Hunt', url: 'https://www.producthunt.com', snippet: 'Recent launches and traction' },
          { source: 'Review portal', url: 'https://example.com/reviews', snippet: 'SMB reviews indicating demand' }
        ];
        send({ phase: 'complete', message: 'Research complete', citations }, 'complete');
        controller.close();
      } catch (e) {
        send({ phase: 'error', message: (e as Error).message }, 'error');
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
}


