import Link from 'next/link';
import { ArrowLeft, Sparkles, Zap, Target, Users } from 'lucide-react';

export default function LearnMorePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
              <span className="text-gray-600">Back to Home</span>
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-8 h-8 text-indigo-600" />
            <span className="text-2xl font-bold">BeBrahma</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center text-gray-900 mb-12">
            How BeBrahma Works
          </h1>
          
          {/* Process Steps */}
          <div className="space-y-16">
            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-indigo-600">1</span>
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-3">AI-Powered Research</h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Our AI agents analyze market trends, competitor landscapes, and industry data to provide comprehensive insights for your business idea.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-indigo-600">2</span>
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-3">Validation & Testing</h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Validate your assumptions with data-driven analysis, customer feedback simulations, and market opportunity assessments.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-indigo-600">3</span>
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-3">Strategic Planning</h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Get comprehensive go-to-market strategies, pricing models, and business plans tailored to your specific market and industry.
                </p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Key Features
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-gray-100">
                <Zap className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Fast Insights</h3>
                <p className="text-gray-600">Get market insights in minutes, not weeks</p>
              </div>
              <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-gray-100">
                <Target className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Precise Targeting</h3>
                <p className="text-gray-600">AI-powered market segmentation and targeting</p>
              </div>
              <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-gray-100">
                <Users className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
                <p className="text-gray-600">Work together with AI agents and team members</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Ready to Build Your Next Big Idea?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Join thousands of entrepreneurs who are already using BeBrahma to validate and launch their businesses.
            </p>
            <Link href="/" className="inline-block px-8 py-4 bg-indigo-600 text-white rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors">
              Get Started Now
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
