import Link from 'next/link';
import { SignUpButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">✨</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">BeBrahma</h1>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/sign-in">
              <button className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Sign In
              </button>
            </Link>
            <SignUpButton mode="modal">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Get Started
              </button>
            </SignUpButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Your AI-Powered{' '}
            <span className="text-indigo-600 dark:text-indigo-400">Virtual Co-Founder</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Get expert business research, validation, and strategy from AI agents that think like successful entrepreneurs.
          </p>
          <div className="flex justify-center space-x-4">
            <SignUpButton mode="modal">
              <button className="px-8 py-4 bg-indigo-600 text-white rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors">
                Start Building
              </button>
            </SignUpButton>
            <Link href="/demo">
              <button className="px-8 py-4 bg-white dark:bg-slate-800 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-lg text-lg font-semibold hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors">
                Try Demo
              </button>
            </Link>
            <Link href="/learn-more">
              <button className="px-8 py-4 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg text-lg font-semibold hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Learn More
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 bg-gray-50 dark:bg-slate-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Why Choose BeBrahma?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Market Research</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get comprehensive market analysis, competitor insights, and trend predictions.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Idea Validation</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Test your business ideas with AI-powered validation and customer research.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Strategic Planning</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Develop go-to-market strategies and business models with expert guidance.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
