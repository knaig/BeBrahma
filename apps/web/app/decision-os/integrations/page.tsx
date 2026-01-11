'use client';

import React, { useState } from 'react';
import { Mail, Calendar, Database, DollarSign, GitBranch, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { IntegrationProvider } from '@/lib/decision-os/types';
import { IntegrationWizard } from '@/components/decision-os/IntegrationWizard';

interface IntegrationCard {
  id: string;
  name: string;
  type: 'google_workspace' | 'crm' | 'payment' | 'repo';
  icon: React.ElementType;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  configRequired: string[];
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationCard[]>([
    {
      id: 'google',
      name: 'Google Workspace',
      type: 'google_workspace',
      icon: Mail,
      description: 'Gmail + Calendar for customer emails and scheduled calls',
      status: 'disconnected',
      configRequired: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    },
    {
      id: 'hubspot',
      name: 'HubSpot CRM',
      type: 'crm',
      icon: Database,
      description: 'Pipeline snapshot and deal movements',
      status: 'disconnected',
      configRequired: ['HUBSPOT_API_KEY'],
    },
    {
      id: 'stripe',
      name: 'Stripe',
      type: 'payment',
      icon: DollarSign,
      description: 'Checkout, subscription, and invoice events (commitment evidence)',
      status: 'disconnected',
      configRequired: ['STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET'],
    },
    {
      id: 'github',
      name: 'GitHub',
      type: 'repo',
      icon: GitBranch,
      description: 'Repo integration for experiments (create branches, PRs)',
      status: 'disconnected',
      configRequired: ['GITHUB_TOKEN'],
    },
  ]);

  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationCard | null>(null);

  async function handleConnect(integrationId: string) {
    const integration = integrations.find((i) => i.id === integrationId);
    if (integration) {
      setSelectedIntegration(integration);
      setWizardOpen(true);
    }
  }

  function handleWizardComplete() {
    if (selectedIntegration) {
      setIntegrations((prev) =>
        prev.map((integration) =>
          integration.id === selectedIntegration.id
            ? { ...integration, status: 'connected' as const }
            : integration
        )
      );
    }
    setWizardOpen(false);
    setSelectedIntegration(null);
  }

  function handleWizardCancel() {
    setWizardOpen(false);
    setSelectedIntegration(null);
  }

  async function handleDisconnect(integrationId: string) {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === integrationId
          ? { ...integration, status: 'disconnected' as const }
          : integration
      )
    );
  }

  function getStatusIcon(status: 'connected' | 'disconnected' | 'error') {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  }

  function getStatusText(status: 'connected' | 'disconnected' | 'error') {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      default:
        return 'Not connected';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Integrations
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Connect tools to automatically collect evidence
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Warning Banner */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-1">
                  OAuth Not Implemented
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-400">
                  These are provider stubs. To enable integrations, add required environment variables
                  and implement OAuth flows in the backend.
                </p>
              </div>
            </div>
          </div>

          {/* Integration Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <integration.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {integration.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(integration.status)}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {getStatusText(integration.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {integration.description}
                </p>

                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                    Required Environment Variables
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {integration.configRequired.map((envVar) => (
                      <code
                        key={envVar}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
                      >
                        {envVar}
                      </code>
                    ))}
                  </div>
                </div>

                {integration.status === 'connected' ? (
                  <button
                    onClick={() => handleDisconnect(integration.id)}
                    className="w-full px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(integration.id)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* GitHub Repo Selection (only show if connected) */}
          {integrations.find((i) => i.id === 'github')?.status === 'connected' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                GitHub Repository
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select the repository where experiment branches and PRs will be created.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Repository
                  </label>
                  <select
                    value={selectedRepo}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select repository...</option>
                    <option value="owner/repo1">owner/repo1</option>
                    <option value="owner/repo2">owner/repo2</option>
                  </select>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Branch Naming Convention
                  </h4>
                  <code className="text-xs text-gray-600 dark:text-gray-400">
                    exp/&lt;venture&gt;/&lt;directionId&gt;/&lt;experimentId&gt;-&lt;slug&gt;
                  </code>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Example: exp/v1/d1/e1-invoice-follow-ups
                  </p>
                </div>

                <button
                  disabled={!selectedRepo}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Repository
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Integration Wizard */}
      {wizardOpen && selectedIntegration && (
        <IntegrationWizard
          integrationId={selectedIntegration.id}
          integrationName={selectedIntegration.name}
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      )}
    </div>
  );
}
