'use client';

import React, { useState } from 'react';
import { CheckCircle, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface IntegrationWizardProps {
  integrationId: string;
  integrationName: string;
  onComplete: () => void;
  onCancel: () => void;
}

type WizardStep = 'connect' | 'test' | 'configure' | 'complete';

export function IntegrationWizard({
  integrationId,
  integrationName,
  onComplete,
  onCancel,
}: IntegrationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('connect');
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setConnecting(true);
    setError(null);

    try {
      // TODO: Replace with actual OAuth flow
      // For now, simulate OAuth redirect
      const oauthUrl = getOAuthUrl(integrationId);

      // Open OAuth in popup
      const popup = window.open(
        oauthUrl,
        'oauth',
        'width=600,height=700,left=200,top=100'
      );

      // Wait for OAuth callback (in production, this would be a backend endpoint)
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          try {
            if (popup?.closed) {
              clearInterval(interval);
              resolve(true);
            }
          } catch (e) {
            // Cross-origin error, expected
          }
        }, 500);
      });

      // Simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setCurrentStep('test');
    } catch (err) {
      setError('Failed to connect. Please try again.');
    } finally {
      setConnecting(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError(null);

    try {
      // TODO: Call actual test endpoint
      // Simulate fetching sample data
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockResults = getMockTestResults(integrationId);
      setTestResults(mockResults);

      setCurrentStep('configure');
    } catch (err) {
      setError('Test failed. Check your permissions.');
    } finally {
      setTesting(false);
    }
  }

  async function handleConfigure() {
    // Skip to complete for now
    setCurrentStep('complete');
  }

  function handleFinish() {
    onComplete();
  }

  function getOAuthUrl(integrationId: string): string {
    // TODO: Replace with actual OAuth URLs
    const urls: Record<string, string> = {
      google: 'https://accounts.google.com/o/oauth2/v2/auth?...',
      hubspot: 'https://app.hubspot.com/oauth/authorize?...',
      stripe: 'https://connect.stripe.com/oauth/authorize?...',
      github: 'https://github.com/login/oauth/authorize?...',
    };
    return urls[integrationId] || '#';
  }

  function getMockTestResults(integrationId: string): any {
    const results: Record<string, any> = {
      google: {
        success: true,
        message: 'Successfully connected to Google Workspace',
        data: {
          emailsFound: 147,
          scheduledCalls: 8,
          lastSync: new Date().toISOString(),
        },
      },
      hubspot: {
        success: true,
        message: 'Successfully connected to HubSpot',
        data: {
          dealsFound: 23,
          contactsFound: 156,
          lastSync: new Date().toISOString(),
        },
      },
      stripe: {
        success: true,
        message: 'Successfully connected to Stripe',
        data: {
          paymentsFound: 12,
          revenue: '$3,450',
          lastSync: new Date().toISOString(),
        },
      },
      github: {
        success: true,
        message: 'Successfully connected to GitHub',
        data: {
          reposFound: 5,
          selectedRepo: 'owner/main-repo',
        },
      },
    };
    return results[integrationId] || { success: false, message: 'Unknown integration' };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Connect {integrationName}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Follow these steps to integrate with your workspace
          </p>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {[
              { id: 'connect', label: 'Connect' },
              { id: 'test', label: 'Test' },
              { id: 'configure', label: 'Configure' },
              { id: 'complete', label: 'Complete' },
            ].map((step, index, array) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      currentStep === step.id
                        ? 'bg-blue-500 text-white'
                        : ['test', 'configure', 'complete'].includes(currentStep) &&
                          index < array.findIndex((s) => s.id === currentStep)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {['test', 'configure', 'complete'].includes(currentStep) &&
                    index < array.findIndex((s) => s.id === currentStep) ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {step.label}
                  </span>
                </div>
                {index < array.length - 1 && (
                  <div className="flex-1 h-1 mx-2 bg-gray-200 dark:bg-gray-700 rounded" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Connect */}
          {currentStep === 'connect' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Step 1: Authorize Access
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Click the button below to securely connect your {integrationName} account.
                  You'll be redirected to authorize BeBrahma to access your data.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                  What we'll access:
                </h4>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
                  {getPermissions(integrationId).map((permission, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{permission}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    Connect {integrationName}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Test */}
          {currentStep === 'test' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Step 2: Test Connection
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Let's verify the connection works by fetching some sample data.
                </p>
              </div>

              {!testResults ? (
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Testing connection...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Run Test
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h4 className="text-sm font-medium text-green-900 dark:text-green-300">
                        {testResults.message}
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(testResults.data).map(([key, value]) => (
                        <div key={key} className="bg-white dark:bg-gray-800 rounded p-3">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {value?.toString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleConfigure}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Continue to Configuration
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Configure */}
          {currentStep === 'configure' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Step 3: Configure Rules
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Set up filters to capture the right evidence automatically.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Which emails count as customer emails?
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., @customer.com, demo, trial"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Comma-separated domains or keywords
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Auto-capture as evidence:
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Email replies (Intent rung)
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Scheduled meetings (Intent rung)
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Calendar RSVPs (Attention rung)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep('complete')}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Configuration
              </button>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 'complete' && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {integrationName} Connected!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Evidence will be automatically captured from your {integrationName} account.
                </p>
              </div>

              <button
                onClick={handleFinish}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function getPermissions(integrationId: string): string[] {
  const permissions: Record<string, string[]> = {
    google: [
      'Read emails from your Gmail inbox (to detect customer replies)',
      'Read calendar events (to capture scheduled calls)',
      'View basic profile information',
    ],
    hubspot: [
      'Read deals and pipeline data',
      'Read contact information',
      'View activity timeline',
    ],
    stripe: [
      'Read payment and invoice data',
      'View subscription status',
      'Access checkout sessions',
    ],
    github: [
      'Create branches in selected repositories',
      'Create pull requests',
      'Read repository metadata',
    ],
  };
  return permissions[integrationId] || [];
}
