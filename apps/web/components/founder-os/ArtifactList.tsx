'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { founderOSAPI } from '@/lib/founderOS/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Calendar, Tag, ArrowUpRight, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Artifact = {
  id: string;
  title: string;
  type: string;
  status: string;
  version: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
};

type ArtifactListProps = {
  workspaceSlug?: string;
  limit?: number;
};

const ARTIFACT_TYPE_COLORS: Record<string, string> = {
  PLAYBOOK: 'bg-purple-100 text-purple-800',
  PILOT_PACK: 'bg-blue-100 text-blue-800',
  PRD: 'bg-green-100 text-green-800',
  PITCH: 'bg-red-100 text-red-800',
  ONE_PAGER: 'bg-yellow-100 text-yellow-800',
  WORKFLOW: 'bg-indigo-100 text-indigo-800',
  DECISION: 'bg-orange-100 text-orange-800',
  MEETING_NOTES: 'bg-gray-100 text-gray-800',
  RESEARCH: 'bg-teal-100 text-teal-800',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ARCHIVED: 'bg-gray-300 text-gray-600',
};

export default function ArtifactList({ workspaceSlug, limit }: ArtifactListProps) {
  const router = useRouter();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  useEffect(() => {
    loadArtifacts();
  }, [workspaceSlug, typeFilter, statusFilter, tierFilter]);

  const loadArtifacts = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {};
      if (workspaceSlug) filters.workspaceSlug = workspaceSlug;
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (tierFilter !== 'all') filters.tier = tierFilter;
      if (limit) filters.limit = limit;

      const response = await founderOSAPI.artifact.list(filters);

      if (response.success) {
        setArtifacts(response.data);
      } else {
        setError(response.error || 'Failed to load artifacts');
      }
    } catch (err) {
      setError('Failed to load artifacts');
      console.error('Artifact list error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleArtifactClick = (artifact: Artifact) => {
    router.push(`/founder-os/artifacts/${artifact.id}`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Artifacts</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-sm font-medium">Filters</CardTitle>
            </div>
            {(typeFilter !== 'all' || statusFilter !== 'all' || tierFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setTierFilter('all');
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="PLAYBOOK">Playbook</SelectItem>
                  <SelectItem value="PILOT_PACK">Pilot Pack</SelectItem>
                  <SelectItem value="PRD">PRD</SelectItem>
                  <SelectItem value="PITCH">Pitch</SelectItem>
                  <SelectItem value="ONE_PAGER">One Pager</SelectItem>
                  <SelectItem value="WORKFLOW">Workflow</SelectItem>
                  <SelectItem value="DECISION">Decision</SelectItem>
                  <SelectItem value="MEETING_NOTES">Meeting Notes</SelectItem>
                  <SelectItem value="RESEARCH">Research</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tier Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Tier</label>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="ACTIVE">Active (Hot)</SelectItem>
                  <SelectItem value="REFERENCE">Reference (Warm)</SelectItem>
                  <SelectItem value="ARCHIVE">Archive (Cold)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Artifact List */}
      {artifacts.length === 0 ? (
        <Card className="border-gray-200">
          <CardHeader className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-gray-600">No artifacts found</CardTitle>
            <CardDescription>
              {typeFilter !== 'all' || statusFilter !== 'all' || tierFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first artifact to get started'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {artifacts.map((artifact) => (
            <Card
              key={artifact.id}
              className="hover:shadow-md transition-shadow cursor-pointer border-l-4"
              style={{
                borderLeftColor:
                  artifact.status === 'ARCHIVED'
                    ? '#9ca3af'
                    : artifact.status === 'DRAFT'
                      ? '#fbbf24'
                      : '#10b981',
              }}
              onClick={() => handleArtifactClick(artifact)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="secondary"
                        className={
                          ARTIFACT_TYPE_COLORS[artifact.type] || 'bg-gray-100 text-gray-800'
                        }
                      >
                        {artifact.type.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="outline" className={STATUS_COLORS[artifact.status]}>
                        {artifact.status}
                      </Badge>
                      <span className="text-xs text-gray-500">v{artifact.version}</span>
                    </div>
                    <CardTitle className="flex items-center gap-2">
                      {artifact.title}
                      <ArrowUpRight className="h-4 w-4 text-gray-400" />
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {artifact.workspace.name}
                    </CardDescription>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Updated {formatDistanceToNow(new Date(artifact.updatedAt), { addSuffix: true })}
                  </div>
                  {artifact.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      <div className="flex gap-1">
                        {artifact.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs text-gray-600">
                            #{tag}
                          </span>
                        ))}
                        {artifact.tags.length > 3 && (
                          <span className="text-xs text-gray-400">+{artifact.tags.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
