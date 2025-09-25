'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  UserGroupIcon,
  CogIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

const TemplatesPage = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'saas', label: 'SaaS & Business' },
    { value: 'product', label: 'Product Development' },
    { value: 'marketing', label: 'Marketing & Growth' },
    { value: 'compliance', label: 'Compliance & Security' },
    { value: 'integration', label: 'Integrations' },
  ];

  const saasTemplates = [
    {
      name: 'User Onboarding Flow',
      description: 'Complete user onboarding workflow with activation metrics and churn prevention',
      category: 'saas',
      tags: ['onboarding', 'activation', 'retention', 'user-experience'],
      metrics: ['activation_rate', 'time_to_value', 'churn_rate'],
      icon: UserGroupIcon,
    },
    {
      name: 'Feature Launch Strategy',
      description: 'End-to-end feature launch process with go-to-market planning',
      category: 'saas',
      tags: ['feature-launch', 'gtm', 'product-marketing', 'rollout'],
      metrics: ['adoption_rate', 'feature_usage', 'user_feedback'],
      icon: RocketLaunchIcon,
    },
    {
      name: 'Churn Reduction Campaign',
      description: 'Systematic approach to identify and prevent customer churn',
      category: 'saas',
      tags: ['churn-prevention', 'customer-success', 'retention', 'loyalty'],
      metrics: ['churn_rate', 'lifetime_value', 'renewal_rate'],
      icon: ChartBarIcon,
    },
    {
      name: 'Product-Led Growth Framework',
      description: 'PLG strategy with viral loops and self-service optimization',
      category: 'saas',
      tags: ['plg', 'viral-growth', 'self-service', 'conversion'],
      metrics: ['viral_coefficient', 'conversion_rate', 'expansion_revenue'],
      icon: RocketLaunchIcon,
    },
  ];

  const integrationTemplates = [
    {
      name: 'Stripe Payment Integration',
      description: 'Complete payment system integration with subscription management',
      category: 'integration',
      tags: ['payments', 'stripe', 'subscriptions', 'billing'],
      metrics: ['payment_success_rate', 'revenue_per_user', 'subscription_growth'],
      icon: CreditCardIcon,
    },
    {
      name: 'Intercom Customer Support',
      description: 'Customer support workflow with automated responses and escalation',
      category: 'integration',
      tags: ['support', 'intercom', 'automation', 'customer-service'],
      metrics: ['response_time', 'resolution_rate', 'customer_satisfaction'],
      icon: ChatBubbleLeftRightIcon,
    },
    {
      name: 'Segment Analytics Setup',
      description: 'Data pipeline configuration for comprehensive user analytics',
      category: 'integration',
      tags: ['analytics', 'segment', 'data-pipeline', 'tracking'],
      metrics: ['data_quality', 'event_tracking', 'insight_generation'],
      icon: ChartBarIcon,
    },
  ];

  const complianceTemplates = [
    {
      name: 'GDPR Compliance Framework',
      description: 'Complete GDPR compliance workflow with data protection measures',
      category: 'compliance',
      tags: ['gdpr', 'privacy', 'data-protection', 'compliance'],
      metrics: ['compliance_score', 'data_breach_incidents', 'audit_success'],
      icon: ShieldCheckIcon,
    },
    {
      name: 'SOC2 Type II Preparation',
      description: 'SOC2 compliance preparation with security controls and documentation',
      category: 'compliance',
      tags: ['soc2', 'security', 'audit', 'compliance'],
      metrics: ['security_score', 'control_effectiveness', 'audit_readiness'],
      icon: ShieldCheckIcon,
    },
  ];

  const allTemplates = [
    ...saasTemplates,
    ...integrationTemplates,
    ...complianceTemplates,
  ];

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // In a real app, this would fetch from an API
      // For now, we'll use the static templates
      setTemplates(allTemplates.map((template, index) => ({
        id: `template-${index + 1}`,
        ...template,
        isPublic: true,
        usageCount: Math.floor(Math.random() * 100) + 10,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      })));
    } catch (err) {
      setError('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      saas: 'bg-blue-100 text-blue-800',
      product: 'bg-green-100 text-green-800',
      marketing: 'bg-purple-100 text-purple-800',
      compliance: 'bg-red-100 text-red-800',
      integration: 'bg-orange-100 text-orange-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg mb-4">Error: {error}</div>
        <button
          onClick={fetchTemplates}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workflow Templates</h1>
            <p className="mt-2 text-gray-600">
              Pre-built workflow templates to accelerate your project setup
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Template
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <CogIcon className="w-5 h-5 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filters.'
              : 'Get started by creating a new template.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <template.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                      {categories.find(c => c.value === template.category)?.label}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {template.description}
              </p>

              {/* Metrics */}
              {template.metrics && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Key Metrics</h4>
                  <div className="flex flex-wrap gap-1">
                    {template.metrics.map((metric) => (
                      <span
                        key={metric}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {metric.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                    >
                      {tag.replace(/-/g, ' ')}
                    </span>
                  ))}
                  {template.tags.length > 4 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{template.tags.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{template.usageCount} uses</span>
                <button className="text-blue-600 hover:text-blue-800 font-medium">
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Template</h3>
            <p className="text-gray-600 mb-4">
              Template creation functionality would be implemented here with a form for:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1">
              <li>Template name and description</li>
              <li>Category and tags</li>
              <li>Workflow steps and structure</li>
              <li>Required fields and validation</li>
              <li>Metrics and KPIs to track</li>
              <li>Integration requirements</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
