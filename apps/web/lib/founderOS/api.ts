// Founder OS API Client
// Provides typed functions for interacting with Founder OS backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  warnings?: string[];
}

export interface Workspace {
  id: string;
  userId: string;
  slug: string;
  name: string;
  description?: string;
  objectives: string[];
  constraints: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  workspaceId: string;
  title: string;
  type: ArtifactType;
  status: ArtifactStatus;
  version: number;
  content: string;
  contentHash: string;
  tags: string[];
  createdBy: string;
  source?: string;
  parentId?: string;
  lineage: string[];
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: string;
    title: string;
    version: number;
  };
  children?: {
    id: string;
    title: string;
    version: number;
  }[];
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
}

export type ArtifactType =
  | 'PLAYBOOK'
  | 'PILOT_PACK'
  | 'PRD'
  | 'PITCH'
  | 'OUTREACH_EMAIL'
  | 'MODEL_SHEET'
  | 'MEETING_NOTES'
  | 'CONTRACT'
  | 'RESEARCH_NOTE'
  | 'DESIGN_DOC'
  | 'TEST_PLAN'
  | 'OTHER';

export type ArtifactStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'APPROVED'
  | 'SENT'
  | 'SIGNED'
  | 'ARCHIVED';

export interface SearchResult {
  artifacts: Array<{
    id: string;
    title: string;
    type: ArtifactType;
    status: ArtifactStatus;
    snippet: string;
    tags: string[];
    updatedAt: string;
    rank: number;
    workspace: {
      name: string;
      slug: string;
    };
  }>;
  tasks: any[]; // Extend with proper Task type
  total: number;
  query: string;
}

export interface DashboardData {
  onFire: any[];
  inProgress: any[];
  next: any[];
  blocked: any[];
  activeArtifacts: Array<{
    id: string;
    title: string;
    type: ArtifactType;
    status: ArtifactStatus;
    version: number;
    updatedAt: string;
    workspace: {
      name: string;
      slug: string;
    };
  }>;
  recentDecisions: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
    workspace: {
      name: string;
    };
  }>;
  stats: {
    totalTasks: number;
    completedToday: number;
    artifactsThisWeek: number;
  };
}

export interface SessionSummary {
  sessionStart: string;
  summary: {
    artifactsCreated: number;
    artifactsEdited: number;
    tasksCreated: number;
    tasksCompleted: number;
    decisionsMade: number;
  };
  details: {
    artifactsCreated: Array<{ id: string; title: string; type: ArtifactType }>;
    artifactsEdited: Array<{ id: string; title: string; type: ArtifactType }>;
    tasksCreated: Array<{ id: string; title: string; priority: string }>;
    tasksCompleted: Array<{ id: string; title: string }>;
    decisions: Array<{ id: string; title: string }>;
    openThreads: any[];
  };
}

// Helper to get auth token from Clerk
async function getAuthToken(): Promise<string | null> {
  // This will be replaced with actual Clerk token retrieval
  if (typeof window === 'undefined') return null;

  // Try to get from session storage or Clerk
  const token = sessionStorage.getItem('clerk_token');
  return token;
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Request failed',
        details: data.details,
      };
    }

    return data;
  } catch (error: any) {
    console.error('API request error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

// ============================================================================
// WORKSPACE API
// ============================================================================

export const workspaceAPI = {
  async create(data: {
    name: string;
    slug: string;
    description?: string;
    objectives?: string[];
    constraints?: string[];
  }): Promise<ApiResponse<Workspace>> {
    return apiRequest('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async list(): Promise<ApiResponse<Workspace[]>> {
    return apiRequest('/api/workspaces');
  },

  async get(slug: string): Promise<ApiResponse<Workspace>> {
    return apiRequest(`/api/workspaces/${slug}`);
  },

  async update(
    slug: string,
    data: Partial<Workspace>
  ): Promise<ApiResponse<Workspace>> {
    return apiRequest(`/api/workspaces/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(slug: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest(`/api/workspaces/${slug}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// ARTIFACT API
// ============================================================================

export const artifactAPI = {
  async create(data: {
    workspaceId?: string;
    title: string;
    type: ArtifactType;
    content: string;
    tags?: string[];
    status?: ArtifactStatus;
    source?: string;
    parentId?: string;
  }): Promise<ApiResponse<Artifact>> {
    return apiRequest('/api/artifacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async list(filters?: {
    workspaceId?: string;
    type?: ArtifactType;
    status?: ArtifactStatus;
    tier?: 'active' | 'reference' | 'archive';
    tags?: string;
  }): Promise<ApiResponse<Artifact[]>> {
    const params = new URLSearchParams(filters as any);
    return apiRequest(`/api/artifacts?${params}`);
  },

  async get(id: string): Promise<ApiResponse<Artifact>> {
    return apiRequest(`/api/artifacts/${id}`);
  },

  async update(
    id: string,
    data: Partial<Artifact>
  ): Promise<ApiResponse<Artifact>> {
    return apiRequest(`/api/artifacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async createVersion(
    id: string,
    data?: {
      title?: string;
      content?: string;
      tags?: string[];
    }
  ): Promise<ApiResponse<Artifact>> {
    return apiRequest(`/api/artifacts/${id}/version`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest(`/api/artifacts/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// SEARCH API
// ============================================================================

export const searchAPI = {
  async search(query: string, filters?: {
    type?: ArtifactType;
    status?: ArtifactStatus;
    workspaceId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<ApiResponse<SearchResult>> {
    const params = new URLSearchParams({
      q: query,
      ...(filters as any),
    });
    return apiRequest(`/api/search?${params}`);
  },

  async suggest(query: string): Promise<
    ApiResponse<{
      suggestions: Array<{ text: string; type: string; category?: string }>;
      tags: Array<{ text: string; type: string }>;
    }>
  > {
    return apiRequest(`/api/search/suggest?q=${encodeURIComponent(query)}`);
  },
};

// ============================================================================
// DASHBOARD API
// ============================================================================

export const dashboardAPI = {
  async get(workspaceId?: string): Promise<ApiResponse<DashboardData>> {
    const params = workspaceId ? `?workspaceId=${workspaceId}` : '';
    return apiRequest(`/api/dashboard${params}`);
  },

  async getSessionSummary(since?: string): Promise<ApiResponse<SessionSummary>> {
    const params = since ? `?since=${encodeURIComponent(since)}` : '';
    return apiRequest(`/api/dashboard/session-summary${params}`);
  },
};

// ============================================================================
// PLAYBOOK API
// ============================================================================

export const playbookAPI = {
  async create(data: any): Promise<ApiResponse<any>> {
    return apiRequest('/api/playbooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async list(filters?: { workspaceSlug?: string; status?: string }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams(filters as any);
    return apiRequest(`/api/playbooks?${params}`);
  },

  async get(id: string): Promise<ApiResponse<any>> {
    return apiRequest(`/api/playbooks/${id}`);
  },

  async start(id: string): Promise<ApiResponse<any>> {
    return apiRequest(`/api/playbooks/${id}/start`, {
      method: 'POST',
    });
  },

  async completePhase(phaseId: string, data: { gateResults: Record<string, boolean>; notes?: string }): Promise<ApiResponse<any>> {
    return apiRequest(`/api/playbooks/phases/${phaseId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateGate(gateId: string, data: { status: string; notes?: string }): Promise<ApiResponse<any>> {
    return apiRequest(`/api/playbooks/gates/${gateId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// ============================================================================
// SCOREBOARD API
// ============================================================================

export const scoreboardAPI = {
  async create(data: any): Promise<ApiResponse<any>> {
    return apiRequest('/api/scoreboards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async list(filters?: { workspaceSlug?: string; status?: string }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams(filters as any);
    return apiRequest(`/api/scoreboards?${params}`);
  },

  async get(id: string, period?: number): Promise<ApiResponse<any>> {
    const params = period ? `?period=${period}` : '';
    return apiRequest(`/api/scoreboards/${id}${params}`);
  },

  async recordMetric(id: string, data: { metricId: string; value: number; notes?: string }): Promise<ApiResponse<any>> {
    return apiRequest(`/api/scoreboards/${id}/metrics`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createReview(id: string, data: { insights?: string; actions?: any[] }): Promise<ApiResponse<any>> {
    return apiRequest(`/api/scoreboards/${id}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAnalytics(id: string): Promise<ApiResponse<any>> {
    return apiRequest(`/api/scoreboards/${id}/analytics`);
  },
};

// Export all
export const founderOSAPI = {
  workspace: workspaceAPI,
  artifact: artifactAPI,
  search: searchAPI,
  dashboard: dashboardAPI,
  playbook: playbookAPI,
  scoreboard: scoreboardAPI,
};

export default founderOSAPI;
