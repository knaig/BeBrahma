'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { founderOSAPI } from '@/lib/founderOS/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Calendar,
  Tag,
  Edit,
  GitBranch,
  Archive,
  Clock,
  User,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

type Artifact = {
  id: string;
  title: string;
  type: string;
  status: string;
  version: number;
  content: string;
  contentHash: string;
  tags: string[];
  createdBy: string;
  source: string | null;
  parentId: string | null;
  lineage: string[];
  createdAt: string;
  updatedAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  parent?: {
    id: string;
    title: string;
    version: number;
  };
  children?: Array<{
    id: string;
    title: string;
    version: number;
    createdAt: string;
  }>;
};

type ArtifactViewerProps = {
  artifactId: string;
  onEdit?: () => void;
};

const ARTIFACT_TYPE_COLORS: Record<string, string> = {
  PLAYBOOK: 'bg-purple-100 text-purple-800 border-purple-300',
  PILOT_PACK: 'bg-blue-100 text-blue-800 border-blue-300',
  PRD: 'bg-green-100 text-green-800 border-green-300',
  PITCH: 'bg-red-100 text-red-800 border-red-300',
  ONE_PAGER: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  WORKFLOW: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  DECISION: 'bg-orange-100 text-orange-800 border-orange-300',
  MEETING_NOTES: 'bg-gray-100 text-gray-800 border-gray-300',
  RESEARCH: 'bg-teal-100 text-teal-800 border-teal-300',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
  REVIEW: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  APPROVED: 'bg-green-100 text-green-700 border-green-300',
  PUBLISHED: 'bg-blue-100 text-blue-700 border-blue-300',
  ARCHIVED: 'bg-gray-300 text-gray-600 border-gray-400',
};

export default function ArtifactViewer({ artifactId, onEdit }: ArtifactViewerProps) {
  const router = useRouter();
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArtifact();
  }, [artifactId]);

  const loadArtifact = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await founderOSAPI.artifact.get(artifactId);

      if (response.success) {
        setArtifact(response.data);
      } else {
        setError(response.error || 'Failed to load artifact');
      }
    } catch (err) {
      setError('Failed to load artifact');
      console.error('Artifact viewer error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!artifact) return;

    try {
      const response = await founderOSAPI.artifact.archive(artifact.id);
      if (response.success) {
        setArtifact({ ...artifact, status: 'ARCHIVED' });
      }
    } catch (err) {
      console.error('Archive error:', err);
    }
  };

  const handleCreateVersion = async () => {
    if (!artifact) return;

    try {
      const response = await founderOSAPI.artifact.createVersion(artifact.id);
      if (response.success) {
        router.push(`/founder-os/artifacts/${response.data.id}/edit`);
      }
    } catch (err) {
      console.error('Create version error:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Artifact</CardTitle>
          <CardDescription>{error || 'Artifact not found'}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with metadata */}
      <Card className={`border-2 ${ARTIFACT_TYPE_COLORS[artifact.type]?.replace('bg-', 'border-').split(' ')[0] || 'border-gray-300'}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Badge
                  variant="secondary"
                  className={ARTIFACT_TYPE_COLORS[artifact.type] || 'bg-gray-100 text-gray-800'}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {artifact.type.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="outline" className={STATUS_COLORS[artifact.status]}>
                  {artifact.status}
                </Badge>
                <span className="text-xs text-gray-500 font-mono">v{artifact.version}</span>
              </div>
              <CardTitle className="text-3xl mb-2">{artifact.title}</CardTitle>
              <CardDescription className="text-sm">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {artifact.createdBy}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated {formatDistanceToNow(new Date(artifact.updatedAt), { addSuffix: true })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created {format(new Date(artifact.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCreateVersion}>
                <GitBranch className="h-4 w-4 mr-2" />
                New Version
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {artifact.status !== 'ARCHIVED' && (
                <Button variant="ghost" size="sm" onClick={handleArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              )}
            </div>
          </div>

          {/* Tags */}
          {artifact.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <Tag className="h-3 w-3 text-gray-500" />
              {artifact.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Source */}
          {artifact.source && (
            <div className="text-xs text-gray-500 mt-2">
              <span className="font-medium">Source:</span> {artifact.source}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Version Lineage */}
      {(artifact.parent || (artifact.children && artifact.children.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Version History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Parent version */}
              {artifact.parent && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  <button
                    onClick={() => router.push(`/founder-os/artifacts/${artifact.parent!.id}`)}
                    className="hover:underline"
                  >
                    v{artifact.parent.version}: {artifact.parent.title}
                  </button>
                </div>
              )}

              {/* Current version */}
              <div className="flex items-center gap-2 text-sm font-medium pl-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                v{artifact.version}: {artifact.title} (current)
              </div>

              {/* Child versions */}
              {artifact.children && artifact.children.length > 0 && (
                <div className="pl-4 space-y-1">
                  {artifact.children.map((child) => (
                    <div key={child.id} className="flex items-center gap-2 text-sm text-gray-600">
                      <ChevronRight className="h-4 w-4" />
                      <button
                        onClick={() => router.push(`/founder-os/artifacts/${child.id}`)}
                        className="hover:underline"
                      >
                        v{child.version}: {child.title}
                      </button>
                      <span className="text-xs text-gray-400">
                        ({formatDistanceToNow(new Date(child.createdAt), { addSuffix: true })})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{artifact.content}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* Metadata footer */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-xs font-medium text-gray-600">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-600 space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Artifact ID:</span>
              <code className="ml-2 bg-gray-200 px-1 py-0.5 rounded">{artifact.id}</code>
            </div>
            <div>
              <span className="font-medium">Content Hash:</span>
              <code className="ml-2 bg-gray-200 px-1 py-0.5 rounded">
                {artifact.contentHash.slice(0, 12)}...
              </code>
            </div>
            <div>
              <span className="font-medium">Workspace:</span> {artifact.workspace.name}
            </div>
            <div>
              <span className="font-medium">Lineage Depth:</span> {artifact.lineage.length}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
