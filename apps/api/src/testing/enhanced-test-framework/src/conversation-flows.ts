import { ConversationFlow } from './types';
import { USER_PERSONAS } from './user-personas';

export const CONVERSATION_FLOWS: ConversationFlow[] = [
  // Startup Founder Sarah - Business Strategy Planning
  {
    id: 'startup-strategy-planning',
    name: 'Startup Strategy Planning',
    description: 'Multi-turn conversation helping a startup founder plan their business strategy',
    userPersona: USER_PERSONAS.find(p => p.id === 'startup-founder-sarah')!,
    initialPrompt: 'I have an idea for a SaaS platform that helps small businesses manage their inventory. I\'m not sure if this is a good business idea or how to get started. Can you help me think through this?',
    followUpPrompts: [
      'What should I focus on first - building the product or validating the market?',
      'How much money do you think I\'ll need to get started?',
      'What are the biggest risks I should be aware of?',
      'How do I know if this idea is actually viable?'
    ],
    expectedContexts: [
      'SaaS platform for inventory management',
      'Small business target market',
      'Market validation approach',
      'Funding requirements',
      'Risk assessment',
      'Viability criteria'
    ],
    expectedRelevance: [
      'Business strategy planning',
      'Market validation',
      'Financial planning',
      'Risk management',
      'Startup guidance'
    ],
    businessDomain: 'SaaS Business Planning',
    complexity: 'high',
    conversationType: 'strategy',
    successCriteria: [
      'Provides clear next steps',
      'Addresses funding concerns',
      'Identifies key risks',
      'Offers validation strategies'
    ],
    failureScenarios: [
      'Generic advice not specific to SaaS',
      'No actionable next steps',
      'Ignores startup-specific challenges',
      'No risk assessment provided'
    ]
  },

  // Product Manager Mike - Competitive Analysis
  {
    id: 'product-competitive-analysis',
    name: 'Product Competitive Analysis',
    description: 'Deep dive into competitive landscape for a FinTech product manager',
    userPersona: USER_PERSONAS.find(p => p.id === 'product-manager-mike')!,
    initialPrompt: 'I need to understand the competitive landscape for our new mobile banking app. We\'re targeting millennials who want better financial management tools. Who are our main competitors and what should I focus on?',
    followUpPrompts: [
      'What features do our competitors have that we don\'t?',
      'How do we differentiate ourselves in this crowded market?',
      'What pricing strategies are our competitors using?',
      'Which competitors should I be most worried about?'
    ],
    expectedContexts: [
      'Mobile banking app',
      'Millennial target market',
      'Financial management tools',
      'Competitive landscape',
      'Feature differentiation',
      'Pricing strategies'
    ],
    expectedRelevance: [
      'Competitive intelligence',
      'Product strategy',
      'Market positioning',
      'Feature prioritization',
      'Pricing strategy'
    ],
    businessDomain: 'FinTech Product Strategy',
    complexity: 'high',
    conversationType: 'analysis',
    successCriteria: [
      'Identifies key competitors',
      'Analyzes competitive advantages',
      'Provides differentiation strategies',
      'Offers actionable insights'
    ],
    failureScenarios: [
      'Generic competitive analysis',
      'No specific FinTech insights',
      'Missing feature comparison',
      'No differentiation strategy'
    ]
  },

  // Consultant Dr. James - Industry Research
  {
    id: 'consultant-industry-research',
    name: 'Industry Research for Consulting',
    description: 'Rapid industry analysis for a management consultant preparing client work',
    userPersona: USER_PERSONAS.find(p => p.id === 'consultant-dr-james')!,
    initialPrompt: 'I need to quickly understand the current state of the electric vehicle charging infrastructure market in Europe. What are the key trends, challenges, and opportunities I should focus on for my client presentation?',
    followUpPrompts: [
      'What are the main regulatory challenges in different European countries?',
      'Which companies are leading the market and why?',
      'What\'s the investment landscape like for this sector?',
      'What are the biggest barriers to widespread adoption?'
    ],
    expectedContexts: [
      'EV charging infrastructure',
      'European market',
      'Regulatory environment',
      'Market leaders',
      'Investment landscape',
      'Adoption barriers'
    ],
    expectedRelevance: [
      'Industry analysis',
      'Market trends',
      'Regulatory insights',
      'Competitive landscape',
      'Investment opportunities'
    ],
    businessDomain: 'EV Infrastructure Consulting',
    complexity: 'high',
    conversationType: 'research',
    successCriteria: [
      'Provides current market insights',
      'Identifies key trends',
      'Addresses regulatory challenges',
      'Offers strategic recommendations'
    ],
    failureScenarios: [
      'Outdated information',
      'Generic industry insights',
      'No regulatory details',
      'Missing strategic context'
    ]
  },

  // Marketing Director Lisa - Customer Insights
  {
    id: 'marketing-customer-insights',
    name: 'Marketing Customer Insights',
    description: 'Customer behavior analysis for an e-commerce marketing director',
    userPersona: USER_PERSONAS.find(p => p.id === 'marketing-director-lisa')!,
    initialPrompt: 'Our e-commerce conversion rate has dropped 15% in the last quarter. I need to understand what might be causing this and how to fix it. Can you help me analyze the potential causes?',
    followUpPrompts: [
      'What customer segments are most affected by this drop?',
      'How do our conversion rates compare to industry benchmarks?',
      'What website changes might be impacting user experience?',
      'What marketing strategies should I prioritize to improve conversions?'
    ],
    expectedContexts: [
      'E-commerce conversion rate decline',
      'Customer segmentation',
      'Industry benchmarks',
      'Website user experience',
      'Marketing strategy optimization'
    ],
    expectedRelevance: [
      'Conversion optimization',
      'Customer analysis',
      'Performance benchmarking',
      'UX improvement',
      'Marketing strategy'
    ],
    businessDomain: 'E-commerce Marketing',
    complexity: 'medium',
    conversationType: 'analysis',
    successCriteria: [
      'Identifies potential causes',
      'Provides data-driven insights',
      'Offers actionable solutions',
      'Addresses customer segments'
    ],
    failureScenarios: [
      'Generic marketing advice',
      'No specific e-commerce insights',
      'Missing data analysis',
      'No actionable recommendations'
    ]
  },

  // Investor Alex - Due Diligence
  {
    id: 'investor-due-diligence',
    name: 'Investment Due Diligence',
    description: 'Market assessment for a venture capital partner evaluating an investment',
    userPersona: USER_PERSONAS.find(p => p.id === 'investor-alex')!,
    initialPrompt: 'I\'m evaluating a Series A investment in a B2B SaaS company that provides AI-powered customer service automation. The company claims a $50B TAM. How do I validate this market size and what should I look for in their business model?',
    followUpPrompts: [
      'What are the key assumptions behind this TAM calculation?',
      'How do I assess the competitive moat in this space?',
      'What customer acquisition metrics should I focus on?',
      'What are the biggest risks in this investment thesis?'
    ],
    expectedContexts: [
      'B2B SaaS investment',
      'AI customer service automation',
      'TAM validation',
      'Business model assessment',
      'Competitive moat analysis',
      'Risk assessment'
    ],
    expectedRelevance: [
      'Investment analysis',
      'Market sizing',
      'Due diligence',
      'Risk assessment',
      'Business model validation'
    ],
    businessDomain: 'Investment Due Diligence',
    complexity: 'high',
    conversationType: 'analysis',
    successCriteria: [
      'Provides TAM validation approach',
      'Identifies key business model factors',
      'Assesses competitive landscape',
      'Highlights investment risks'
    ],
    failureScenarios: [
      'Generic investment advice',
      'No TAM validation methods',
      'Missing risk assessment',
      'No business model insights'
    ]
  },

  // Small Business Owner Maria - Operational Planning
  {
    id: 'small-business-operations',
    name: 'Small Business Operations',
    description: 'Operational guidance for a retail small business owner',
    userPersona: USER_PERSONAS.find(p => p.id === 'small-business-owner-maria')!,
    initialPrompt: 'I own a small boutique clothing store and want to expand to online sales. I\'m overwhelmed by all the options - Shopify, WooCommerce, social media selling. What\'s the best approach for someone like me who doesn\'t have much technical experience?',
    followUpPrompts: [
      'How much will this cost me to get started?',
      'What\'s the easiest way to manage inventory across both stores?',
      'How do I handle shipping and returns?',
      'What marketing should I focus on to drive online sales?'
    ],
    expectedContexts: [
      'Boutique clothing store',
      'Online expansion',
      'E-commerce platforms',
      'Inventory management',
      'Shipping and returns',
      'Online marketing'
    ],
    expectedRelevance: [
      'E-commerce setup',
      'Small business operations',
      'Inventory management',
      'Customer service',
      'Digital marketing'
    ],
    businessDomain: 'Retail Operations',
    complexity: 'medium',
    conversationType: 'planning',
    successCriteria: [
      'Recommends appropriate platform',
      'Addresses cost concerns',
      'Provides operational guidance',
      'Offers marketing strategies'
    ],
    failureScenarios: [
      'Too technical explanations',
      'No cost considerations',
      'Generic e-commerce advice',
      'No small business focus'
    ]
  }
];

export const FLOW_CATEGORIES = {
  byComplexity: {
    low: CONVERSATION_FLOWS.filter(f => f.complexity === 'low'),
    medium: CONVERSATION_FLOWS.filter(f => f.complexity === 'medium'),
    high: CONVERSATION_FLOWS.filter(f => f.complexity === 'high')
  },
  byBusinessDomain: {
    'SaaS Business Planning': CONVERSATION_FLOWS.filter(f => f.businessDomain === 'SaaS Business Planning'),
    'FinTech Product Strategy': CONVERSATION_FLOWS.filter(f => f.businessDomain === 'FinTech Product Strategy'),
    'EV Infrastructure Consulting': CONVERSATION_FLOWS.filter(f => f.businessDomain === 'EV Infrastructure Consulting'),
    'E-commerce Marketing': CONVERSATION_FLOWS.filter(f => f.businessDomain === 'E-commerce Marketing'),
    'Investment Due Diligence': CONVERSATION_FLOWS.filter(f => f.businessDomain === 'Investment Due Diligence'),
    'Retail Operations': CONVERSATION_FLOWS.filter(f => f.businessDomain === 'Retail Operations')
  },
  byConversationType: {
    strategy: CONVERSATION_FLOWS.filter(f => f.conversationType === 'strategy'),
    research: CONVERSATION_FLOWS.filter(f => f.conversationType === 'research'),
    analysis: CONVERSATION_FLOWS.filter(f => f.conversationType === 'analysis'),
    planning: CONVERSATION_FLOWS.filter(f => f.conversationType === 'planning'),
    troubleshooting: CONVERSATION_FLOWS.filter(f => f.conversationType === 'troubleshooting')
  }
};

export function getFlowById(id: string): ConversationFlow | undefined {
  return CONVERSATION_FLOWS.find(f => f.id === id);
}

export function getFlowsByPersona(personaId: string): ConversationFlow[] {
  return CONVERSATION_FLOWS.filter(f => f.userPersona.id === personaId);
}

export function getFlowsByBusinessDomain(domain: string): ConversationFlow[] {
  return CONVERSATION_FLOWS.filter(f => 
    f.businessDomain.toLowerCase().includes(domain.toLowerCase())
  );
}

export function getFlowsByComplexity(complexity: 'low' | 'medium' | 'high'): ConversationFlow[] {
  return CONVERSATION_FLOWS.filter(f => f.complexity === complexity);
}
