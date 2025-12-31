'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { founderOSAPI } from '@/lib/founderOS/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Save, X, Eye, FileText, Tag as TagIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type ArtifactFormData = {
  title: string;
  type: string;
  status: string;
  content: string;
  tags: string[];
  source?: string;
};

type ArtifactEditorProps = {
  artifactId?: string;
  workspaceSlug: string;
  onSave?: (artifactId: string) => void;
  onCancel?: () => void;
};

const ARTIFACT_TYPES = [
  { value: 'PLAYBOOK', label: 'Playbook' },
  { value: 'PILOT_PACK', label: 'Pilot Pack' },
  { value: 'PRD', label: 'PRD' },
  { value: 'PITCH', label: 'Pitch' },
  { value: 'ONE_PAGER', label: 'One Pager' },
  { value: 'WORKFLOW', label: 'Workflow' },
  { value: 'DECISION', label: 'Decision' },
  { value: 'MEETING_NOTES', label: 'Meeting Notes' },
  { value: 'RESEARCH', label: 'Research' },
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PUBLISHED', label: 'Published' },
];

export default function ArtifactEditor({
  artifactId,
  workspaceSlug,
  onSave,
  onCancel,
}: ArtifactEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const [formData, setFormData] = useState<ArtifactFormData>({
    title: '',
    type: 'PRD',
    status: 'DRAFT',
    content: '',
    tags: [],
    source: '',
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (artifactId) {
      loadArtifact();
    }
  }, [artifactId]);

  const loadArtifact = async () => {
    if (!artifactId) return;

    try {
      setLoading(true);
      const response = await founderOSAPI.artifact.get(artifactId);

      if (response.success) {
        const artifact = response.data;
        setFormData({
          title: artifact.title,
          type: artifact.type,
          status: artifact.status,
          content: artifact.content,
          tags: artifact.tags,
          source: artifact.source || '',
        });
      } else {
        setError(response.error || 'Failed to load artifact');
      }
    } catch (err) {
      setError('Failed to load artifact');
      console.error('Load artifact error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.content.trim()) {
      setError('Content is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        workspaceSlug,
        title: formData.title,
        type: formData.type,
        status: formData.status,
        content: formData.content,
        tags: formData.tags,
        source: formData.source || undefined,
      };

      let response;
      if (artifactId) {
        response = await founderOSAPI.artifact.update(artifactId, payload);
      } else {
        response = await founderOSAPI.artifact.create(payload);
      }

      if (response.success) {
        if (onSave) {
          onSave(response.data.id);
        } else {
          router.push(`/founder-os/artifacts/${response.data.id}`);
        }
      } else {
        setError(response.error || 'Failed to save artifact');
      }
    } catch (err) {
      setError('Failed to save artifact');
      console.error('Save artifact error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {artifactId ? 'Edit Artifact' : 'Create Artifact'}
              </CardTitle>
              <CardDescription>
                {artifactId ? 'Update the artifact details' : 'Add a new artifact to your workspace'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
              {onCancel && (
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button type="submit" size="sm" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : artifactId ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {!previewMode ? (
            <>
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter artifact title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Type and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ARTIFACT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Source */}
              <div className="space-y-2">
                <Label htmlFor="source">Source (optional)</Label>
                <Input
                  id="source"
                  placeholder="e.g., conversation-abc123, meeting-2024-01-15"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  Track where this artifact came from (conversation ID, meeting, etc.)
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    placeholder="Add tag and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    <TagIcon className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content (Markdown) *</Label>
                <Textarea
                  id="content"
                  placeholder="Write your artifact content in Markdown format..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={20}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500">
                  Supports Markdown formatting. Use headings, lists, bold, italic, etc.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Preview Mode */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{formData.title || 'Untitled'}</h1>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{formData.type.replace(/_/g, ' ')}</Badge>
                    <Badge variant="outline">{formData.status}</Badge>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <hr />

                <div className="prose prose-sm max-w-none">
                  {formData.content ? (
                    <ReactMarkdown>{formData.content}</ReactMarkdown>
                  ) : (
                    <p className="text-gray-400 italic">No content yet...</p>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
