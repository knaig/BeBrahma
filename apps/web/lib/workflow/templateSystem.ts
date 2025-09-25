import { z } from 'zod';

// Template schema definitions
export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['saas', 'product', 'marketing', 'compliance', 'integration']),
  tags: z.array(z.string()),
  workflowSteps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    tasks: z.array(z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      estimatedHours: z.number(),
      dependencies: z.array(z.string()).optional(),
    })),
  })),
  metrics: z.array(z.object({
    name: z.string(),
    description: z.string(),
    unit: z.string(),
    target: z.number().optional(),
    current: z.number().optional(),
  })),
  integrations: z.array(z.object({
    name: z.string(),
    type: z.enum(['api', 'webhook', 'oauth', 'sdk']),
    description: z.string(),
    config: z.record(z.any()),
  })).optional(),
  estimatedDuration: z.number(), // in days
  complexity: z.enum(['SIMPLE', 'MEDIUM', 'COMPLEX']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Template = z.infer<typeof TemplateSchema>;

// SaaS-focused templates
export const SAAS_TEMPLATES: Template[] = [
  {
    id: 'user-onboarding',
    name: 'User Onboarding Flow',
    description: 'Complete user onboarding workflow with activation, education, and retention strategies',
    category: 'saas',
    tags: ['onboarding', 'activation', 'retention', 'user-experience'],
    workflowSteps: [
      {
        id: 'welcome',
        name: 'Welcome & Account Setup',
        description: 'Initial user welcome and account configuration',
        tasks: [
          {
            title: 'Send welcome email',
            description: 'Personalized welcome email with next steps',
            priority: 'HIGH',
            estimatedHours: 2,
          },
          {
            title: 'Account verification',
            description: 'Email verification and phone number setup',
            priority: 'HIGH',
            estimatedHours: 1,
          },
          {
            title: 'Profile completion',
            description: 'Guide users to complete their profile',
            priority: 'MEDIUM',
            estimatedHours: 3,
          },
        ],
      },
      {
        id: 'activation',
        name: 'Product Activation',
        description: 'Help users achieve their first value moment',
        tasks: [
          {
            title: 'First feature demo',
            description: 'Interactive walkthrough of key features',
            priority: 'CRITICAL',
            estimatedHours: 4,
          },
          {
            title: 'Data import setup',
            description: 'Assist with initial data import',
            priority: 'HIGH',
            estimatedHours: 6,
          },
          {
            title: 'Integration setup',
            description: 'Configure essential integrations',
            priority: 'HIGH',
            estimatedHours: 4,
          },
        ],
      },
      {
        id: 'education',
        name: 'User Education',
        description: 'Comprehensive training and support',
        tasks: [
          {
            title: 'Video tutorials',
            description: 'Create step-by-step video guides',
            priority: 'MEDIUM',
            estimatedHours: 8,
          },
          {
            title: 'Knowledge base',
            description: 'Build comprehensive help documentation',
            priority: 'MEDIUM',
            estimatedHours: 12,
          },
          {
            title: 'Live training sessions',
            description: 'Schedule group training sessions',
            priority: 'LOW',
            estimatedHours: 6,
          },
        ],
      },
    ],
    metrics: [
      {
        name: 'Time to First Value',
        description: 'Time from signup to first meaningful action',
        unit: 'minutes',
        target: 15,
      },
      {
        name: 'Activation Rate',
        description: 'Percentage of users who complete onboarding',
        unit: 'percentage',
        target: 85,
      },
      {
        name: 'Support Ticket Volume',
        description: 'Number of support requests during onboarding',
        unit: 'tickets',
        target: 5,
      },
    ],
    integrations: [
      {
        name: 'Intercom',
        type: 'api',
        description: 'Customer messaging and support',
        config: { apiKey: '', webhookUrl: '' },
      },
      {
        name: 'Segment',
        type: 'api',
        description: 'User behavior tracking',
        config: { writeKey: '', projectId: '' },
      },
    ],
    estimatedDuration: 21,
    complexity: 'MEDIUM',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'feature-launch',
    name: 'Feature Launch Campaign',
    description: 'End-to-end feature launch workflow with marketing and user adoption',
    category: 'saas',
    tags: ['launch', 'marketing', 'adoption', 'feature-flag'],
    workflowSteps: [
      {
        id: 'preparation',
        name: 'Pre-Launch Preparation',
        description: 'Feature finalization and internal preparation',
        tasks: [
          {
            title: 'Feature testing',
            description: 'Comprehensive testing across environments',
            priority: 'CRITICAL',
            estimatedHours: 16,
          },
          {
            title: 'Documentation update',
            description: 'Update user guides and API docs',
            priority: 'HIGH',
            estimatedHours: 8,
          },
          {
            title: 'Support team training',
            description: 'Train support team on new features',
            priority: 'HIGH',
            estimatedHours: 4,
          },
        ],
      },
      {
        id: 'soft-launch',
        name: 'Soft Launch',
        description: 'Limited release to beta users',
        tasks: [
          {
            title: 'Beta user selection',
            description: 'Identify and invite beta users',
            priority: 'HIGH',
            estimatedHours: 4,
          },
          {
            title: 'Feature flag setup',
            description: 'Configure feature flags for rollout',
            priority: 'CRITICAL',
            estimatedHours: 6,
          },
          {
            title: 'Feedback collection',
            description: 'Set up feedback collection mechanisms',
            priority: 'MEDIUM',
            estimatedHours: 3,
          },
        ],
      },
      {
        id: 'marketing',
        name: 'Marketing Campaign',
        description: 'Multi-channel marketing campaign',
        tasks: [
          {
            title: 'Email campaign',
            description: 'Create and send launch emails',
            priority: 'HIGH',
            estimatedHours: 8,
          },
          {
            title: 'Social media',
            description: 'Social media announcements and content',
            priority: 'MEDIUM',
            estimatedHours: 6,
          },
          {
            title: 'Press release',
            description: 'Write and distribute press release',
            priority: 'MEDIUM',
            estimatedHours: 4,
          },
        ],
      },
    ],
    metrics: [
      {
        name: 'Feature Adoption Rate',
        description: 'Percentage of users who try the new feature',
        unit: 'percentage',
        target: 60,
      },
      {
        name: 'User Engagement',
        description: 'Time spent using the new feature',
        unit: 'minutes',
        target: 10,
      },
      {
        name: 'Support Volume',
        description: 'Support requests related to new feature',
        unit: 'tickets',
        target: 20,
      },
    ],
    integrations: [
      {
        name: 'LaunchDarkly',
        type: 'api',
        description: 'Feature flag management',
        config: { apiKey: '', projectKey: '' },
      },
      {
        name: 'Mixpanel',
        type: 'api',
        description: 'User behavior analytics',
        config: { projectToken: '', apiSecret: '' },
      },
    ],
    estimatedDuration: 30,
    complexity: 'COMPLEX',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'churn-reduction',
    name: 'Churn Reduction Strategy',
    description: 'Comprehensive churn prevention and recovery workflow',
    category: 'saas',
    tags: ['churn', 'retention', 'customer-success', 'analytics'],
    workflowSteps: [
      {
        id: 'identification',
        name: 'Churn Risk Identification',
        description: 'Identify users at risk of churning',
        tasks: [
          {
            title: 'Usage pattern analysis',
            description: 'Analyze user behavior patterns',
            priority: 'CRITICAL',
            estimatedHours: 12,
          },
          {
            title: 'Engagement scoring',
            description: 'Create engagement scoring model',
            priority: 'HIGH',
            estimatedHours: 16,
          },
          {
            title: 'Risk segmentation',
            description: 'Segment users by churn risk',
            priority: 'MEDIUM',
            estimatedHours: 8,
          },
        ],
      },
      {
        id: 'intervention',
        name: 'Intervention Campaigns',
        description: 'Targeted campaigns to prevent churn',
        tasks: [
          {
            title: 'Personalized outreach',
            description: 'Create personalized retention campaigns',
            priority: 'HIGH',
            estimatedHours: 10,
          },
          {
            title: 'Success plan creation',
            description: 'Develop success plans for at-risk users',
            priority: 'HIGH',
            estimatedHours: 12,
          },
          {
            title: 'Feature training',
            description: 'Provide additional training and support',
            priority: 'MEDIUM',
            estimatedHours: 8,
          },
        ],
      },
      {
        id: 'recovery',
        name: 'Churn Recovery',
        description: 'Recovery strategies for users who churned',
        tasks: [
          {
            title: 'Exit interview',
            description: 'Conduct exit interviews with churned users',
            priority: 'MEDIUM',
            estimatedHours: 6,
          },
          {
            title: 'Win-back campaigns',
            description: 'Create win-back campaigns',
            priority: 'MEDIUM',
            estimatedHours: 8,
          },
          {
            title: 'Feedback analysis',
            description: 'Analyze feedback to improve product',
            priority: 'HIGH',
            estimatedHours: 10,
          },
        ],
      },
    ],
    metrics: [
      {
        name: 'Churn Rate',
        description: 'Monthly churn rate',
        unit: 'percentage',
        target: 5,
      },
      {
        name: 'Recovery Rate',
        description: 'Percentage of churned users recovered',
        unit: 'percentage',
        target: 15,
      },
      {
        name: 'Customer Lifetime Value',
        description: 'Average customer lifetime value',
        unit: 'dollars',
        target: 5000,
      },
    ],
    integrations: [
      {
        name: 'Pendo',
        type: 'api',
        description: 'Product analytics and user guidance',
        config: { appId: '', apiKey: '' },
      },
      {
        name: 'Gainsight',
        type: 'api',
        description: 'Customer success platform',
        config: { apiKey: '', tenantId: '' },
      },
    ],
    estimatedDuration: 45,
    complexity: 'COMPLEX',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'plg-strategy',
    name: 'Product-Led Growth Strategy',
    description: 'PLG implementation with viral loops and self-service',
    category: 'saas',
    tags: ['plg', 'viral', 'self-service', 'growth'],
    workflowSteps: [
      {
        id: 'freemium',
        name: 'Freemium Model Design',
        description: 'Design freemium tier and upgrade paths',
        tasks: [
          {
            title: 'Feature tiering',
            description: 'Define feature limits for each tier',
            priority: 'CRITICAL',
            estimatedHours: 20,
          },
          {
            title: 'Upgrade triggers',
            description: 'Identify optimal upgrade triggers',
            priority: 'HIGH',
            estimatedHours: 12,
          },
          {
            title: 'Pricing strategy',
            description: 'Develop competitive pricing strategy',
            priority: 'HIGH',
            estimatedHours: 16,
          },
        ],
      },
      {
        id: 'viral-loops',
        name: 'Viral Loop Implementation',
        description: 'Build viral features and referral systems',
        tasks: [
          {
            title: 'Referral program',
            description: 'Design referral reward system',
            priority: 'HIGH',
            estimatedHours: 14,
          },
          {
            title: 'Social sharing',
            description: 'Implement social sharing features',
            priority: 'MEDIUM',
            estimatedHours: 10,
          },
          {
            title: 'Collaboration features',
            description: 'Add team collaboration capabilities',
            priority: 'HIGH',
            estimatedHours: 18,
          },
        ],
      },
      {
        id: 'self-service',
        name: 'Self-Service Optimization',
        description: 'Optimize self-service experience',
        tasks: [
          {
            title: 'Onboarding automation',
            description: 'Automate onboarding process',
            priority: 'HIGH',
            estimatedHours: 12,
          },
          {
            title: 'Help system',
            description: 'Build comprehensive help system',
            priority: 'MEDIUM',
            estimatedHours: 16,
          },
          {
            title: 'Community building',
            description: 'Create user community platform',
            priority: 'LOW',
            estimatedHours: 20,
          },
        ],
      },
    ],
    metrics: [
      {
        name: 'Viral Coefficient',
        description: 'Number of new users per existing user',
        unit: 'ratio',
        target: 1.2,
      },
      {
        name: 'Free to Paid Conversion',
        description: 'Conversion rate from free to paid',
        unit: 'percentage',
        target: 8,
      },
      {
        name: 'Net Promoter Score',
        description: 'User satisfaction and recommendation score',
        unit: 'score',
        target: 50,
      },
    ],
    integrations: [
      {
        name: 'Amplitude',
        type: 'api',
        description: 'Product analytics and user behavior',
        config: { apiKey: '', projectId: '' },
      },
      {
        name: 'Intercom',
        type: 'api',
        description: 'Customer messaging and support',
        config: { apiKey: '', webhookUrl: '' },
      },
    ],
    estimatedDuration: 60,
    complexity: 'COMPLEX',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Integration templates
export const INTEGRATION_TEMPLATES: Template[] = [
  {
    id: 'stripe-integration',
    name: 'Stripe Payment Integration',
    description: 'Complete Stripe payment integration with webhooks and subscription management',
    category: 'integration',
    tags: ['payments', 'stripe', 'subscriptions', 'webhooks'],
    workflowSteps: [
      {
        id: 'setup',
        name: 'Stripe Account Setup',
        description: 'Configure Stripe account and API keys',
        tasks: [
          {
            title: 'Account configuration',
            description: 'Set up Stripe account and business details',
            priority: 'CRITICAL',
            estimatedHours: 2,
          },
          {
            title: 'API key management',
            description: 'Generate and secure API keys',
            priority: 'CRITICAL',
            estimatedHours: 1,
          },
          {
            title: 'Webhook configuration',
            description: 'Configure webhook endpoints',
            priority: 'HIGH',
            estimatedHours: 3,
          },
        ],
      },
      {
        id: 'implementation',
        name: 'Payment Implementation',
        description: 'Implement payment flows and subscription logic',
        tasks: [
          {
            title: 'Payment form',
            description: 'Create secure payment form',
            priority: 'CRITICAL',
            estimatedHours: 16,
          },
          {
            title: 'Subscription logic',
            description: 'Implement subscription management',
            priority: 'HIGH',
            estimatedHours: 20,
          },
          {
            title: 'Webhook handling',
            description: 'Handle Stripe webhook events',
            priority: 'HIGH',
            estimatedHours: 12,
          },
        ],
      },
    ],
    metrics: [
      {
        name: 'Payment Success Rate',
        description: 'Percentage of successful payments',
        unit: 'percentage',
        target: 98,
      },
      {
        name: 'Webhook Delivery Rate',
        description: 'Successful webhook deliveries',
        unit: 'percentage',
        target: 99.9,
      },
    ],
    integrations: [
      {
        name: 'Stripe',
        type: 'api',
        description: 'Payment processing platform',
        config: { publishableKey: '', secretKey: '', webhookSecret: '' },
      },
    ],
    estimatedDuration: 14,
    complexity: 'MEDIUM',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'intercom-integration',
    name: 'Intercom Customer Messaging',
    description: 'Intercom integration for customer support and messaging',
    category: 'integration',
    tags: ['support', 'messaging', 'intercom', 'customer-service'],
    workflowSteps: [
      {
        id: 'setup',
        name: 'Intercom Setup',
        description: 'Configure Intercom workspace and API',
        tasks: [
          {
            title: 'Workspace configuration',
            description: 'Set up Intercom workspace',
            priority: 'HIGH',
            estimatedHours: 3,
          },
          {
            title: 'API configuration',
            description: 'Configure API keys and webhooks',
            priority: 'HIGH',
            estimatedHours: 2,
          },
        ],
      },
      {
        id: 'implementation',
        name: 'Messaging Implementation',
        description: 'Implement messaging and support features',
        tasks: [
          {
            title: 'Chat widget',
            description: 'Add chat widget to application',
            priority: 'HIGH',
            estimatedHours: 8,
          },
          {
            title: 'User identification',
            description: 'Identify users in Intercom',
            priority: 'MEDIUM',
            estimatedHours: 6,
          },
          {
            title: 'Automated messages',
            description: 'Set up automated messaging flows',
            priority: 'MEDIUM',
            estimatedHours: 10,
          },
        ],
      },
    ],
    metrics: [
      {
        name: 'Response Time',
        description: 'Average response time to customer messages',
        unit: 'minutes',
        target: 15,
      },
      {
        name: 'Customer Satisfaction',
        description: 'Customer satisfaction score',
        unit: 'score',
        target: 4.5,
      },
    ],
    integrations: [
      {
        name: 'Intercom',
        type: 'api',
        description: 'Customer messaging platform',
        config: { accessToken: '', appId: '' },
      },
    ],
    estimatedDuration: 10,
    complexity: 'SIMPLE',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Compliance templates
export const COMPLIANCE_TEMPLATES: Template[] = [
  {
    id: 'gdpr-compliance',
    name: 'GDPR Compliance Framework',
    description: 'Complete GDPR compliance implementation with data protection and user rights',
    category: 'compliance',
    tags: ['gdpr', 'privacy', 'data-protection', 'compliance'],
    workflowSteps: [
      {
        id: 'assessment',
        name: 'Data Assessment',
        description: 'Assess current data processing activities',
        tasks: [
          {
            title: 'Data inventory',
            description: 'Create comprehensive data inventory',
            priority: 'CRITICAL',
            estimatedHours: 20,
          },
          {
            title: 'Processing assessment',
            description: 'Assess data processing activities',
            priority: 'HIGH',
            estimatedHours: 16,
          },
          {
            title: 'Risk assessment',
            description: 'Identify privacy risks and mitigation',
            priority: 'HIGH',
            estimatedHours: 12,
          },
        ],
      },
      {
        id: 'implementation',
        name: 'Compliance Implementation',
        description: 'Implement GDPR compliance measures',
        tasks: [
          {
            title: 'Privacy policy',
            description: 'Update privacy policy for GDPR',
            priority: 'CRITICAL',
            estimatedHours: 8,
          },
          {
            title: 'Consent management',
            description: 'Implement consent management system',
            priority: 'CRITICAL',
            estimatedHours: 16,
          },
          {
            title: 'Data subject rights',
            description: 'Implement data subject rights',
            priority: 'HIGH',
            estimatedHours: 20,
          },
        ],
      },
    ],
    metrics: [
      {
        name: 'Consent Rate',
        description: 'Percentage of users with valid consent',
        unit: 'percentage',
        target: 95,
      },
      {
        name: 'Response Time',
        description: 'Time to respond to data subject requests',
        unit: 'days',
        target: 30,
      },
    ],
    estimatedDuration: 45,
    complexity: 'COMPLEX',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'soc2-compliance',
    name: 'SOC 2 Type II Compliance',
    description: 'SOC 2 Type II compliance framework with security controls',
    category: 'compliance',
    tags: ['soc2', 'security', 'compliance', 'audit'],
    workflowSteps: [
      {
        id: 'readiness',
        name: 'Readiness Assessment',
        description: 'Assess current security posture',
        tasks: [
          {
            title: 'Security assessment',
            description: 'Evaluate current security controls',
            priority: 'CRITICAL',
            estimatedHours: 24,
          },
          {
            title: 'Gap analysis',
            description: 'Identify compliance gaps',
            priority: 'HIGH',
            estimatedHours: 16,
          },
        ],
      },
      {
        id: 'implementation',
        name: 'Control Implementation',
        description: 'Implement required security controls',
        tasks: [
          {
            title: 'Access controls',
            description: 'Implement access control systems',
            priority: 'CRITICAL',
            estimatedHours: 20,
          },
          {
            title: 'Monitoring systems',
            description: 'Deploy security monitoring',
            priority: 'HIGH',
            estimatedHours: 16,
          },
          {
            title: 'Incident response',
            description: 'Develop incident response plan',
            priority: 'HIGH',
            estimatedHours: 12,
          },
        ],
      },
    ],
    metrics: [
      {
        name: 'Security Incidents',
        description: 'Number of security incidents',
        unit: 'incidents',
        target: 0,
      },
      {
        name: 'Access Reviews',
        description: 'Frequency of access reviews',
        unit: 'per quarter',
        target: 1,
      },
    ],
    estimatedDuration: 90,
    complexity: 'COMPLEX',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Template management functions
export class TemplateManager {
  private templates: Template[] = [
    ...SAAS_TEMPLATES,
    ...INTEGRATION_TEMPLATES,
    ...COMPLIANCE_TEMPLATES,
  ];

  getAllTemplates(): Template[] {
    return this.templates;
  }

  getTemplatesByCategory(category: Template['category']): Template[] {
    return this.templates.filter(template => template.category === category);
  }

  getTemplatesByTag(tag: string): Template[] {
    return this.templates.filter(template => 
      template.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
    );
  }

  getTemplateById(id: string): Template | undefined {
    return this.templates.find(template => template.id === id);
  }

  searchTemplates(query: string): Template[] {
    const lowerQuery = query.toLowerCase();
    return this.templates.filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  getTemplatesByComplexity(complexity: Template['complexity']): Template[] {
    return this.templates.filter(template => template.complexity === complexity);
  }

  getTemplatesByDuration(maxDuration: number): Template[] {
    return this.templates.filter(template => template.estimatedDuration <= maxDuration);
  }

  // Template metrics and analytics
  getTemplateMetrics(templateId: string) {
    const template = this.getTemplateById(templateId);
    if (!template) return null;

    return {
      totalTasks: template.workflowSteps.reduce((sum, step) => sum + step.tasks.length, 0),
      totalEstimatedHours: template.workflowSteps.reduce((sum, step) => 
        sum + step.tasks.reduce((taskSum, task) => taskSum + task.estimatedHours, 0), 0
      ),
      criticalTasks: template.workflowSteps.reduce((sum, step) => 
        sum + step.tasks.filter(task => task.priority === 'CRITICAL').length, 0
      ),
      highPriorityTasks: template.workflowSteps.reduce((sum, step) => 
        sum + step.tasks.filter(task => task.priority === 'HIGH').length, 0
      ),
      metricsCount: template.metrics.length,
      integrationsCount: template.integrations?.length || 0,
    };
  }

  // Template comparison
  compareTemplates(templateIds: string[]) {
    const templates = templateIds.map(id => this.getTemplateById(id)).filter(Boolean) as Template[];
    
    return {
      averageDuration: templates.reduce((sum, t) => sum + t.estimatedDuration, 0) / templates.length,
      averageComplexity: this.getAverageComplexity(templates),
      commonTags: this.getCommonTags(templates),
      totalMetrics: templates.reduce((sum, t) => sum + t.metrics.length, 0),
    };
  }

  private getAverageComplexity(templates: Template[]): number {
    const complexityMap = { 'SIMPLE': 1, 'MEDIUM': 2, 'COMPLEX': 3 };
    const total = templates.reduce((sum, t) => sum + complexityMap[t.complexity], 0);
    return total / templates.length;
  }

  private getCommonTags(templates: Template[]): string[] {
    const tagCounts = new Map<string, number>();
    templates.forEach(template => {
      template.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    return Array.from(tagCounts.entries())
      .filter(([_, count]) => count === templates.length)
      .map(([tag, _]) => tag);
  }
}

export const templateManager = new TemplateManager();
