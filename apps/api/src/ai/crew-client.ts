export interface CrewStartRequest {
  sessionId: string;
  stepId?: string;
  task: string;
  context?: any;
}

export interface CrewNextRequest {
  sessionId: string;
}

export interface CrewStatusResponse {
  success: boolean;
  status?: any;
  message?: any;
  messages?: any[];
}

export interface CrewDecisionRequest {
  sessionId: string;
  decision: string;
  userMessage?: string;
}

export class CrewClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async start(req: CrewStartRequest): Promise<CrewStatusResponse> {
    const res = await fetch(`${this.baseUrl}/api/crew/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) throw new Error(`Crew start failed: ${res.status}`);
    return res.json();
  }

  async next(req: CrewNextRequest): Promise<CrewStatusResponse> {
    const res = await fetch(`${this.baseUrl}/api/crew/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) throw new Error(`Crew next failed: ${res.status}`);
    return res.json();
  }

  async status(sessionId: string): Promise<CrewStatusResponse> {
    const res = await fetch(`${this.baseUrl}/api/crew/status/${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error(`Crew status failed: ${res.status}`);
    return res.json();
  }

  async decision(req: CrewDecisionRequest): Promise<CrewStatusResponse> {
    const res = await fetch(`${this.baseUrl}/api/crew/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) throw new Error(`Crew decision failed: ${res.status}`);
    return res.json();
  }
}
