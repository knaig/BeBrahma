'use client';

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const [apiData, setApiData] = useState<any>(null);

  useEffect(() => {
    const checkApi = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/health`);
        if (response.ok) {
          const data = await response.json();
          setApiData(data);
          setApiStatus('✅ Connected to AWS Backend');
        } else {
          setApiStatus('❌ API Error: ' + response.status);
        }
      } catch (error) {
        setApiStatus('❌ Cannot connect to API: ' + (error as Error).message);
      }
    };

    checkApi();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 transition-colors">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            BeBrahma - AI-Powered Virtual Co-Founder
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Your AI-powered virtual co-founder for business research, validation, and strategy.
          </p>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-8 transition-colors">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">System Status</h2>
            <div className="text-lg mb-4 text-gray-700 dark:text-gray-200">
              <span className="font-medium">Frontend:</span> ✅ Running Locally
            </div>
            <div className="text-lg mb-4 text-gray-700 dark:text-gray-200">
              <span className="font-medium">Backend:</span> {apiStatus}
            </div>

            {apiData && (
              <div className="mt-6 text-left">
                <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Backend Health Details:</h3>
                <div className="bg-gray-100 dark:bg-slate-700 p-4 rounded-lg">
                  <pre className="text-sm overflow-auto text-gray-800 dark:text-gray-200">
                    {JSON.stringify(apiData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 transition-colors">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">🚀 Simple Chat</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Start a conversation with your AI co-founder</p>
              <a
                href="/simple-chat"
                className="inline-block bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Try Simple Chat
              </a>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 transition-colors">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">📊 Dashboard</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Manage your projects and workflows</p>
              <a
                href="/dashboard"
                className="inline-block bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
              >
                Go to Dashboard
              </a>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 transition-colors">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">⚙️ Settings</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Configure your preferences and API keys</p>
              <a
                href="/settings"
                className="inline-block bg-purple-600 dark:bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
              >
                Open Settings
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
