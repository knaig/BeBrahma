export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';

interface OpenProjectConfig {
  baseUrl: string;
  apiToken: string;
  projectId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config: OpenProjectConfig = body?.config || {};
    const actions: Array<{ title: string; description?: string; priority?: string; estimate?: string }> = body?.actions || [];

    if (!config.baseUrl || !config.apiToken || !config.projectId) {
      return NextResponse.json({ error: 'Missing OpenProject configuration (baseUrl, apiToken, projectId).' }, { status: 400 });
    }
    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ error: 'No actions to export.' }, { status: 400 });
    }

    const results: any[] = [];
    for (const action of actions) {
      const payload = {
        subject: action.title,
        description: {
          format: 'markdown',
          raw: action.description || ''
        },
        _links: {
          project: { href: `/api/v3/projects/${config.projectId}` }
        }
      };

      const encoded = (global as any).Buffer
        ? (global as any).Buffer.from(`${config.apiToken}:api_token`).toString('base64')
        : typeof btoa !== 'undefined'
          ? btoa(`${config.apiToken}:api_token`)
          : '';

      const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/api/v3/work_packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${encoded}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.text();
        results.push({ title: action.title, status: 'error', error: err });
        continue;
      }
      const data = await res.json();
      results.push({ title: action.title, status: 'created', id: data?.id, href: data?._links?.self?.href });
    }

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


