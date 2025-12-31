import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Flame,
  Search,
  FileText,
  GitBranch,
  TrendingUp,
  Zap,
  CheckCircle2
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Founder OS - BeBrahma',
  description: 'Your cognitive co-pilot for startup clarity',
};

export default function FounderOSLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Founder OS
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A cognitive co-pilot that converts scattered thinking into committed progress
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/founder-os/onboarding">
              <Button size="lg" className="font-semibold">
                Create Workspace
              </Button>
            </Link>
            <Link href="/founder-os/workspace">
              <Button size="lg" variant="outline">
                View Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Problem/Solution */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">The Problem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>✗ AI conversations disappear in chat history</p>
              <p>✗ Insights don't become actions</p>
              <p>✗ Documents scattered across 10+ tools</p>
              <p>✗ Constant context switching</p>
              <p>✗ Never sure what to do next</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">The Solution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>✓ Every insight saved as artifact</p>
              <p>✓ Automatic closure routing</p>
              <p>✓ Unified document vault</p>
              <p>✓ Mission Control dashboard</p>
              <p>✓ Always know what's next</p>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Core Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<FileText className="h-8 w-8 text-blue-600" />}
              title="Artifact Vault"
              description="Version-controlled documents with metadata, tags, and lineage tracking"
            />
            <FeatureCard
              icon={<Search className="h-8 w-8 text-purple-600" />}
              title="Global Search"
              description="Full-text search across all artifacts, decisions, and tasks"
            />
            <FeatureCard
              icon={<Flame className="h-8 w-8 text-red-600" />}
              title="Mission Control"
              description="Dashboard showing On Fire, In Progress, Next, and Blocked items"
            />
            <FeatureCard
              icon={<GitBranch className="h-8 w-8 text-green-600" />}
              title="Versioning & Lineage"
              description="Track how ideas evolved from v1 → v2 → v3 with full history"
            />
            <FeatureCard
              icon={<CheckCircle2 className="h-8 w-8 text-teal-600" />}
              title="Session Summary"
              description="See what you accomplished each day for closure"
            />
            <FeatureCard
              icon={<TrendingUp className="h-8 w-8 text-orange-600" />}
              title="Priority Scoring"
              description="Automatic prioritization based on urgency + importance"
            />
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="space-y-6">
            <Step
              number={1}
              title="Set up your workspace"
              description="Define your business context, objectives, and constraints once"
            />
            <Step
              number={2}
              title="Save insights as artifacts"
              description="Every conversation, decision, or document becomes a structured artifact"
            />
            <Step
              number={3}
              title="Search and find anything"
              description="Full-text search across all your knowledge, always findable"
            />
            <Step
              number={4}
              title="Check Mission Control"
              description="See what's on fire, in progress, next, and blocked at a glance"
            />
            <Step
              number={5}
              title="Review your progress"
              description="Daily session summaries show what you accomplished for closure"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="border-2 border-blue-600 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
              <CardDescription className="text-base">
                Create your first workspace in less than 3 minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/founder-os/onboarding">
                <Button size="lg" className="font-semibold">
                  <Zap className="h-5 w-5 mr-2" />
                  Launch Founder OS
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="mb-2">{icon}</div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">{description}</p>
      </CardContent>
    </Card>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-1">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}
