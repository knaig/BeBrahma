// apps/web/app/layout.tsx
'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { PostHogProvider } from 'posthog-js/react';
import { Toaster } from 'sonner';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <PostHogProvider
            apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY}
            options={{
              api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
            }}
          >
            {children}
            <Toaster position="bottom-right" richColors />
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

// apps/web/app/page.tsx
import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/LandingPage';

export default async function HomePage() {
  const { userId } = auth();
  
  if (userId) {
    redirect('/dashboard');
  }

  return <LandingPage />;
}

// apps/web/app/dashboard/page.tsx
'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ChatInterface } from '@/components/ChatInterface';
import { StageNavigation } from '@/components/StageNavigation';
import { ActionCards } from '@/components/ActionCards';
import { useSWR } from 'swr';
import { posthog } from 'posthog-js';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  
  // Track user session
  useEffect(() => {
    if (user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      });
    }
  }, [user]);

  // Fetch user's projects and usage
  const { data: userData } = useSWR(
    user ? `/api/users/${user.id}` : null,
    fetcher
  );

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardShell
      user={user}
      usage={userData?.usage}
      plan={userData?.plan}
    >
      <div className="flex h-full">
        {/* Your existing chat interface */}
        <div className="w-64 border-r">
          <StageNavigation />
        </div>
        <div className="flex-1">
          <ChatInterface />
        </div>
        <div className="w-96 border-l">
          <ActionCards />
        </div>
      </div>
    </DashboardShell>
  );
}

// apps/web/components/LandingPage.tsx
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Zap, Shield, Check } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-indigo-600" />
              <span className="text-2xl font-bold">BeBrahma</span>
            </div>
            <div className="flex items-center space-x-4">
              <SignInButton mode="modal">
                <Button variant="ghost">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button>Start Free <ArrowRight className="ml-2 w-4 h-4" /></Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Your AI Co-Founder
            <br />
            <span className="text-indigo-600">Launch in 48 Hours</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            From idea to first customer in record time. BeBrahma's AI agents research your market, 
            validate your idea, and generate everything you need to launch.
          </p>
          <div className="flex justify-center space-x-4">
            <SignUpButton mode="modal">
              <Button size="lg" className="text-lg px-8">
                Start Building <ArrowRight className="ml-2" />
              </Button>
            </SignUpButton>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="p-6 border rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Simple, Usage-Based Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    icon: <Zap className="w-6 h-6 text-indigo-600" />,
    title: 'Crew AI Agents',
    description: 'Multiple specialized AI agents collaborate to refine your idea and create actionable plans.',
  },
  {
    icon: <Shield className="w-6 h-6 text-indigo-600" />,
    title: 'Citation Required',
    description: 'Every market claim backed by real sources. No hallucinations, only verified data.',
  },
  {
    icon: <Sparkles className="w-6 h-6 text-indigo-600" />,
    title: 'Ready-to-Code Prompts',
    description: 'Generate comprehensive build specifications for Cursor, v0, or Lovable AI.',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '$0',
    description: 'Perfect for testing ideas',
    features: ['5 runs per month', '3 integrations', 'Community support'],
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For serious founders',
    features: ['30 runs per month', 'All integrations', 'Priority support', 'Team seats'],
    popular: true,
  },
  {
    name: 'Scale',
    price: 'Usage-based',
    description: 'For growing startups',
    features: ['Unlimited runs', 'Custom integrations', 'Dedicated support', 'SLA'],
  },
];

// apps/web/components/dashboard/DashboardShell.tsx
import { UserButton } from '@clerk/nextjs';
import { CreditCard, Activity, Settings, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

export function DashboardShell({ children, user, usage, plan }) {
  const usagePercent = (usage?.runsThisMonth / plan?.monthlyRuns) * 100 || 0;

  return (
    <div className="h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="border-b bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">BeBrahma</h1>
            <span className="text-sm text-gray-500">
              {plan?.name} Plan
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Usage Indicator */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {usage?.runsThisMonth || 0} / {plan?.monthlyRuns || 5} runs
              </span>
              <Progress value={usagePercent} className="w-24 h-2" />
            </div>

            {/* Quick Actions */}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings/billing">
                <CreditCard className="w-4 h-4 mr-2" />
                Billing
              </Link>
            </Button>
            
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings">
                <Settings className="w-4 h-4" />
              </Link>
            </Button>

            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

// Updated package.json with production dependencies
{
  "name": "@bebrahma/web",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    // Authentication & User Management
    "@clerk/nextjs": "^4.29.0",
    
    // UI Components (shadcn/ui based)
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    
    // Utilities
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0",
    
    // Forms & Validation
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.2",
    "zod": "^3.22.4",
    
    // Data Fetching
    "swr": "^2.2.4",
    "@tanstack/react-query": "^5.17.0",
    
    // Analytics & Monitoring
    "posthog-js": "^1.96.1",
    "@sentry/nextjs": "^7.91.0",
    "@vercel/analytics": "^1.1.1",
    
    // Payments
    "@stripe/stripe-js": "^2.2.0",
    "stripe": "^14.10.0",
    
    // Notifications
    "sonner": "^1.3.1",
    
    // Icons
    "lucide-react": "^0.303.0",
    
    // Core
    "next": "14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.3"
  }
}