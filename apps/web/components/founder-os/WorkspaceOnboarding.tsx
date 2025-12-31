'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { founderOSAPI } from '@/lib/founderOS/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, X } from 'lucide-react';

interface WorkspaceOnboardingProps {
  onComplete?: (workspaceSlug: string) => void;
}

export default function WorkspaceOnboarding({ onComplete }: WorkspaceOnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState<string[]>(['']);
  const [constraints, setConstraints] = useState<string[]>(['']);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  };

  const addObjective = () => {
    setObjectives([...objectives, '']);
  };

  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const updateObjective = (index: number, value: string) => {
    const updated = [...objectives];
    updated[index] = value;
    setObjectives(updated);
  };

  const addConstraint = () => {
    setConstraints([...constraints, '']);
  };

  const removeConstraint = (index: number) => {
    setConstraints(constraints.filter((_, i) => i !== index));
  };

  const updateConstraint = (index: number, value: string) => {
    const updated = [...constraints];
    updated[index] = value;
    setConstraints(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const filteredObjectives = objectives.filter((o) => o.trim() !== '');
      const filteredConstraints = constraints.filter((c) => c.trim() !== '');

      const response = await founderOSAPI.workspace.create({
        name,
        slug,
        description: description || undefined,
        objectives: filteredObjectives,
        constraints: filteredConstraints,
      });

      if (response.success && response.data) {
        // Success! Redirect to Mission Control
        if (onComplete) {
          onComplete(response.data.slug);
        } else {
          router.push(`/founder-os/workspace/${response.data.slug}`);
        }
      } else {
        setError(response.error || 'Failed to create workspace');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full mx-1 ${
                s <= step ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-600 text-center">
          Step {step} of 3
        </p>
      </div>

      {/* Step 1: Welcome & Workspace Name */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to Founder OS</CardTitle>
            <CardDescription>
              Let's set up your cognitive workspace. This will be your command center
              for decisions, documents, and next actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="workspace-name">Workspace Name *</Label>
              <Input
                id="workspace-name"
                placeholder="My SaaS Startup"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="workspace-slug">URL Slug *</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">founder-os.com/</span>
                <Input
                  id="workspace-slug"
                  placeholder="my-saas-startup"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  pattern="[a-z0-9-]+"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div>
              <Label htmlFor="workspace-description">Description (Optional)</Label>
              <Textarea
                id="workspace-description"
                placeholder="B2B productivity tool for remote teams"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!name || !slug}
              className="w-full"
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Objectives */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>What are your top goals?</CardTitle>
            <CardDescription>
              Define 3-5 objectives for the next 90 days. These help the system
              prioritize what matters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {objectives.map((objective, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Goal ${index + 1}: e.g., "Achieve product-market fit by Q2"`}
                  value={objective}
                  onChange={(e) => updateObjective(index, e.target.value)}
                />
                {objectives.length > 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeObjective(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              variant="outline"
              onClick={addObjective}
              className="w-full"
              disabled={objectives.length >= 5}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Objective
            </Button>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Constraints */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Any constraints we should know about?</CardTitle>
            <CardDescription>
              Budget, timeline, team size, etc. This helps guide recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {constraints.map((constraint, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Constraint ${index + 1}: e.g., "Bootstrap - no external funding"`}
                  value={constraint}
                  onChange={(e) => updateConstraint(index, e.target.value)}
                />
                {constraints.length > 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeConstraint(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              variant="outline"
              onClick={addConstraint}
              className="w-full"
              disabled={constraints.length >= 5}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Constraint
            </Button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Workspace'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
