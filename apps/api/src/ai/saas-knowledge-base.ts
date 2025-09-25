// SaaS Knowledge Base - Comprehensive domain expertise for SaaS founders

export interface SaaSMetrics {
  mrr: number;
  arr: number;
  cac: number;
  ltv: number;
  churnRate: number;
  nrr: number;
  grr: number;
  magicNumber: number;
  cacPaybackPeriod: number;
  ttv: number;
}

export interface SaaSBusinessModel {
  type: 'freemium' | 'premium' | 'hybrid';
  pricingModel: 'per-seat' | 'usage-based' | 'tiered' | 'hybrid';
  _targetMarket: 'smb' | 'mid-market' | 'enterprise' | 'mixed';
  growthStrategy: 'plg' | 'sales-led' | 'hybrid';
}

export interface SaaSMarketInsights {
  category: string;
  marketSize: number;
  growthRate: number;
  competitiveLandscape: string;
  keyTrends: string[];
  fundingEnvironment: string;
}

export class SaaSKnowledgeBase {
  // SaaS Industry Benchmarks
  static readonly BENCHMARKS = {
    churnRates: {
      smb: { good: 0.05, average: 0.08, poor: 0.12 },
      midMarket: { good: 0.03, average: 0.06, poor: 0.09 },
      enterprise: { good: 0.02, average: 0.04, poor: 0.07 }
    },
    magicNumbers: {
      good: 1.0,
      average: 0.8,
      poor: 0.5
    },
    cacPaybackPeriod: {
      smb: { good: 6, average: 12, poor: 18 },
      midMarket: { good: 12, average: 18, poor: 24 },
      enterprise: { good: 18, average: 24, poor: 36 }
    },
    nrr: {
      good: 1.2,
      average: 1.1,
      poor: 1.0
    }
  };

  // SaaS Business Model Patterns
  static readonly BUSINESS_MODELS = {
    freemium: {
      description: 'Free tier with premium features',
      bestFor: ['B2C SaaS', 'Developer tools', 'Productivity apps'],
      conversionRates: { good: 0.05, average: 0.03, poor: 0.01 },
      keyMetrics: ['Free user growth', 'Conversion rate', 'Premium ARPU']
    },
    premium: {
      description: 'Paid-only with no free tier',
      bestFor: ['Enterprise SaaS', 'B2B tools', 'Specialized software'],
      conversionRates: { good: 0.15, average: 0.10, poor: 0.05 },
      keyMetrics: ['Trial conversion', 'Sales cycle', 'Deal size']
    },
    hybrid: {
      description: 'Combination of free and paid tiers',
      bestFor: ['Mid-market SaaS', 'Complex products', 'Team collaboration'],
      conversionRates: { good: 0.08, average: 0.05, poor: 0.02 },
      keyMetrics: ['Free to paid conversion', 'Expansion revenue', 'Retention']
    }
  };

  // SaaS Pricing Models
  static readonly PRICING_MODELS = {
    perSeat: {
      description: 'Pricing based on number of users',
      bestFor: ['Team collaboration', 'CRM', 'Project management'],
      pros: ['Predictable revenue', 'Easy to understand', 'Scales with growth'],
      cons: ['May limit adoption', 'Complex for large teams', 'Hard to justify for small teams']
    },
    usageBased: {
      description: 'Pricing based on actual usage',
      bestFor: ['Infrastructure', 'Analytics', 'API services'],
      pros: ['Fair pricing', 'Encourages usage', 'Scales naturally'],
      cons: ['Unpredictable revenue', 'Complex billing', 'Hard to forecast']
    },
    tiered: {
      description: 'Fixed pricing tiers with feature limits',
      bestFor: ['Most SaaS products', 'Clear feature differentiation'],
      pros: ['Simple to understand', 'Predictable revenue', 'Easy to upgrade'],
      cons: ['May leave money on table', 'Feature bloat', 'Complex tier management']
    }
  };

  // SaaS Growth Strategies
  static readonly GROWTH_STRATEGIES = {
    productLed: {
      description: 'Growth driven by product usage and viral features',
      bestFor: ['Developer tools', 'Productivity apps', 'Collaboration tools'],
      keyTactics: ['Free trial', 'Viral loops', 'In-product growth', 'Self-service onboarding'],
      metrics: ['Time to value', 'Activation rate', 'Viral coefficient', 'Feature adoption']
    },
    salesLed: {
      description: 'Growth driven by sales team and outbound activities',
      bestFor: ['Enterprise SaaS', 'Complex B2B products', 'High-value solutions'],
      keyTactics: ['Outbound sales', 'Account-based marketing', 'Sales enablement', 'Customer success'],
      metrics: ['Sales cycle length', 'Deal size', 'Win rate', 'Sales efficiency']
    },
    hybrid: {
      description: 'Combination of product-led and sales-led approaches',
      bestFor: ['Mid-market SaaS', 'Complex products with PLG potential'],
      keyTactics: ['Self-service for SMB', 'Sales for enterprise', 'Product-qualified leads'],
      metrics: ['PQL conversion', 'Sales-assisted conversion', 'Customer segment mix']
    }
  };

  // SaaS Compliance Requirements
  static readonly COMPLIANCE = {
    gdpr: {
      description: 'General Data Protection Regulation (EU)',
      requirements: ['Data consent', 'Right to be forgotten', 'Data portability', 'Privacy by design'],
      impact: 'Required for EU customers, good practice globally'
    },
    soc2: {
      description: 'System and Organization Controls 2',
      requirements: ['Security', 'Availability', 'Processing integrity', 'Confidentiality', 'Privacy'],
      impact: 'Required for enterprise customers, builds trust'
    },
    hipaa: {
      description: 'Health Insurance Portability and Accountability Act',
      requirements: ['Patient data protection', 'Access controls', 'Audit trails', 'Encryption'],
      impact: 'Required for healthcare SaaS, strict compliance needed'
    }
  };

  // SaaS Technology Stack Recommendations
  static readonly TECH_STACKS = {
    frontend: {
      modern: ['React', 'Vue.js', 'Angular'],
      recommended: 'React with TypeScript for most SaaS products',
      considerations: ['Component reusability', 'State management', 'Performance optimization']
    },
    backend: {
      modern: ['Node.js', 'Python (FastAPI/Django)', 'Go', 'Rust'],
      recommended: 'Node.js for JavaScript teams, Python for ML/AI features',
      considerations: ['Scalability', 'Developer productivity', 'Ecosystem maturity']
    },
    database: {
      relational: ['PostgreSQL', 'MySQL'],
      nosql: ['MongoDB', 'DynamoDB'],
      recommended: 'PostgreSQL for most SaaS (ACID compliance, JSON support)',
      considerations: ['Data consistency', 'Scalability', 'Query complexity']
    },
    infrastructure: {
      cloud: ['AWS', 'Azure', 'GCP'],
      recommended: 'AWS for enterprise, GCP for ML/AI, Azure for Microsoft shops',
      considerations: ['Cost optimization', 'Region availability', 'Service integration']
    }
  };

  // SaaS Market Categories and Insights
  static readonly MARKET_CATEGORIES = {
    'hr-tech': {
      marketSize: 15000000000, // $15B
      growthRate: 0.12, // 12%
      keyPlayers: ['Workday', 'BambooHR', 'Gusto'],
      trends: ['AI-powered hiring', 'Remote work tools', 'Employee experience platforms'],
      funding: 'Active with focus on AI and automation'
    },
    'sales-tech': {
      marketSize: 80000000000, // $80B
      growthRate: 0.15, // 15%
      keyPlayers: ['Salesforce', 'HubSpot', 'Pipedrive'],
      trends: ['Revenue operations', 'AI sales assistants', 'Predictive analytics'],
      funding: 'Very active, high valuations'
    },
    'marketing-tech': {
      marketSize: 120000000000, // $120B
      growthRate: 0.13, // 13%
      keyPlayers: ['Adobe', 'Mailchimp', 'Canva'],
      trends: ['No-code marketing', 'Personalization', 'Marketing automation'],
      funding: 'Active, focus on AI and automation'
    },
    'dev-tools': {
      marketSize: 45000000000, // $45B
      growthRate: 0.18, // 18%
      keyPlayers: ['GitHub', 'Atlassian', 'GitLab'],
      trends: ['DevOps automation', 'AI coding assistants', 'Low-code platforms'],
      funding: 'Very active, high growth potential'
    },
    'fintech': {
      marketSize: 200000000000, // $200B
      growthRate: 0.20, // 20%
      keyPlayers: ['Stripe', 'Plaid', 'Brex'],
      trends: ['Embedded finance', 'AI risk assessment', 'Regulatory compliance'],
      funding: 'Highly active, regulatory considerations'
    }
  };

  // SaaS Failure Patterns and Prevention
  static readonly FAILURE_PATTERNS = {
    'no-product-market-fit': {
      description: 'Building something no one wants to pay for',
      prevention: ['Customer interviews', 'MVP validation', 'Pricing research'],
      warningSigns: ['Low trial conversion', 'High churn', 'Customer complaints']
    },
    'pricing-mistakes': {
      description: 'Wrong pricing model or price point',
      prevention: ['Competitive analysis', 'Value-based pricing', 'Customer willingness to pay'],
      warningSigns: ['Low conversion rates', 'Customer price complaints', 'High sales cycle']
    },
    'scaling-too-fast': {
      description: 'Growing faster than infrastructure and processes can handle',
      prevention: ['Infrastructure planning', 'Process documentation', 'Team scaling'],
      warningSigns: ['Service outages', 'Customer support overwhelmed', 'Quality issues']
    },
    'ignoring-customer-success': {
      description: 'Focusing on acquisition over retention',
      prevention: ['Customer success team', 'Health scoring', 'Proactive support'],
      warningSigns: ['High churn', 'Low NRR', 'Customer complaints']
    }
  };

  // SaaS Funding Landscape
  static readonly FUNDING_LANDSCAPE = {
    seed: {
      range: [500000, 2000000],
      focus: ['Team', 'MVP', 'Initial customers'],
      metrics: ['Product-market fit indicators', 'Customer feedback', 'Team capability']
    },
    seriesA: {
      range: [5000000, 15000000],
      focus: ['Growth', 'Product development', 'Sales team'],
      metrics: ['MRR growth', 'Customer acquisition', 'Unit economics']
    },
    seriesB: {
      range: [15000000, 50000000],
      focus: ['Scaling', 'Market expansion', 'Process optimization'],
      metrics: ['ARR', 'Market penetration', 'Operational efficiency']
    },
    seriesC: {
      range: [50000000, 200000000],
      focus: ['International expansion', 'Acquisitions', 'IPO preparation'],
      metrics: ['Global growth', 'Market leadership', 'Financial performance']
    }
  };

  // SaaS Metrics Calculation Methods
  static calculateMetrics(data: any): SaaSMetrics {
    return {
      mrr: data.monthlyRevenue || 0,
      arr: (data.monthlyRevenue || 0) * 12,
      cac: data.customerAcquisitionCost || 0,
      ltv: data.lifetimeValue || 0,
      churnRate: data.churnRate || 0,
      nrr: data.netRevenueRetention || 0,
      grr: data.grossRevenueRetention || 0,
      magicNumber: this.calculateMagicNumber(data),
      cacPaybackPeriod: this.calculateCACPaybackPeriod(data),
      ttv: data.timeToValue || 0
    };
  }

  private static calculateMagicNumber(data: any): number {
    const arr = (data.monthlyRevenue || 0) * 12;
    const previousArr = (data.previousMonthlyRevenue || 0) * 12;
    const salesMarketingSpend = data.salesMarketingSpend || 0;
    
    if (salesMarketingSpend === 0) return 0;
    
    return (arr - previousArr) / salesMarketingSpend;
  }

  private static calculateCACPaybackPeriod(data: any): number {
    const cac = data.customerAcquisitionCost || 0;
    const monthlyRevenue = data.monthlyRevenue || 0;
    const customerCount = data.customerCount || 1;
    
    if (monthlyRevenue === 0) return 0;
    
    const arpu = monthlyRevenue / customerCount;
    return cac / arpu;
  }

  // SaaS Recommendations Engine
  static getRecommendations(metrics: SaaSMetrics, _businessModel: SaaSBusinessModel): string[] {
    const recommendations: string[] = [];

    // Churn rate recommendations
    if (metrics.churnRate > this.BENCHMARKS.churnRates[this.getTargetMarket(_businessModel)].poor) {
      recommendations.push('🚨 High churn rate detected. Focus on customer success and product-market fit.');
    } else if (metrics.churnRate > this.BENCHMARKS.churnRates[this.getTargetMarket(_businessModel)].average) {
      recommendations.push('⚠️ Churn rate above average. Implement customer health scoring and proactive support.');
    }

    // Magic number recommendations
    if (metrics.magicNumber < this.BENCHMARKS.magicNumbers.poor) {
      recommendations.push('💰 Low sales efficiency. Optimize sales process and marketing channels.');
    } else if (metrics.magicNumber < this.BENCHMARKS.magicNumbers.average) {
      recommendations.push('📈 Sales efficiency below average. Focus on lead quality and conversion optimization.');
    }

    // CAC payback recommendations
    const targetPayback = this.BENCHMARKS.cacPaybackPeriod[this.getTargetMarket(_businessModel)];
    if (metrics.cacPaybackPeriod > targetPayback.poor) {
      recommendations.push('⏰ CAC payback period too long. Optimize pricing and reduce acquisition costs.');
    }

    // NRR recommendations
    if (metrics.nrr < this.BENCHMARKS.nrr.poor) {
      recommendations.push('📉 Low net revenue retention. Focus on expansion revenue and customer success.');
    }

    return recommendations;
  }

  private static getTargetMarket(_businessModel: SaaSBusinessModel): 'smb' | 'midMarket' | 'enterprise' {
    return _businessModel._targetMarket === 'smb' ? 'smb' : 
           _businessModel._targetMarket === 'enterprise' ? 'enterprise' : 'midMarket';
  }

  // SaaS Market Analysis
  static analyzeMarket(category: string): SaaSMarketInsights {
    const marketData = this.MARKET_CATEGORIES[category as keyof typeof this.MARKET_CATEGORIES] || this.MARKET_CATEGORIES['hr-tech'];
    
    return {
      category,
      marketSize: marketData.marketSize,
      growthRate: marketData.growthRate,
      competitiveLandscape: marketData.keyPlayers.join(', '),
      keyTrends: marketData.trends,
      fundingEnvironment: marketData.funding
    };
  }

  // SaaS Business Model Recommendations
  static getBusinessModelRecommendations(_category: string, _targetMarket: string): string[] {
    const recommendations: string[] = [];
    
    if (_targetMarket === 'smb') {
      recommendations.push('💡 Consider freemium model for SMB market penetration');
      recommendations.push('🎯 Focus on self-service onboarding and product-led growth');
      recommendations.push('💰 Tiered pricing with clear value progression');
    } else if (_targetMarket === 'enterprise') {
      recommendations.push('🏢 Premium model with enterprise sales process');
      recommendations.push('🤝 Dedicated customer success and account management');
      recommendations.push('🔒 Focus on security, compliance, and enterprise features');
    } else {
      recommendations.push('⚖️ Hybrid approach combining PLG and sales-led growth');
      recommendations.push('🎯 Product-qualified leads for mid-market sales');
      recommendations.push('📊 Balanced pricing with clear ROI demonstration');
    }

    return recommendations;
  }

  // SaaS Go-to-Market Strategy Generator
  static generateGTMStrategy(_category: string, _targetMarket: string, _businessModel: string): {
    channels: string[];
    tactics: string[];
    timeline: string[];
    budget: { low: number; medium: number; high: number };
  } {
    const strategies = {
      smb: {
        channels: ['Content Marketing', 'SEO', 'Social Media', 'Product Hunt', 'Referral Programs'],
        tactics: ['Free trial optimization', 'Viral features', 'Community building', 'Influencer partnerships'],
        timeline: ['Month 1-2: Content & SEO setup', 'Month 3-4: Community building', 'Month 5-6: Referral programs'],
        budget: { low: 5000, medium: 15000, high: 30000 }
      },
      midMarket: {
        channels: ['LinkedIn Ads', 'Content Marketing', 'Webinars', 'Industry Events', 'Sales Outreach'],
        tactics: ['Account-based marketing', 'Thought leadership', 'Case studies', 'Sales enablement'],
        timeline: ['Month 1-2: ABM setup', 'Month 3-4: Content creation', 'Month 5-6: Sales outreach'],
        budget: { low: 25000, medium: 50000, high: 100000 }
      },
      enterprise: {
        channels: ['Direct Sales', 'Industry Events', 'Partnerships', 'Executive Briefings', 'Trade Shows'],
        tactics: ['Solution selling', 'ROI demonstrations', 'Security reviews', 'Compliance documentation'],
        timeline: ['Month 1-3: Sales team setup', 'Month 4-6: Pipeline building', 'Month 7-9: Deal closing'],
        budget: { low: 100000, medium: 250000, high: 500000 }
      }
    };

    return strategies[_targetMarket as keyof typeof strategies] || strategies.midMarket;
  }

  // SaaS Pricing Strategy Generator
  static generatePricingStrategy(_category: string, _targetMarket: string, _businessModel: string): {
    tiers: Array<{ name: string; price: number; features: string[]; target: string }>;
    pricingModel: string;
    recommendations: string[];
  } {
    const basePricing = {
      smb: { starter: 29, growth: 99, scale: 299 },
      midMarket: { starter: 99, growth: 299, scale: 799 },
      enterprise: { starter: 299, growth: 799, scale: 1999 }
    };

    const pricing = basePricing[_targetMarket as keyof typeof basePricing] || basePricing.midMarket;

    const tiers = [
      {
        name: 'Starter',
        price: pricing.starter,
        features: ['Core features', 'Basic support', 'Up to 5 users', 'Standard integrations'],
        target: 'Small teams getting started'
      },
      {
        name: 'Growth',
        price: pricing.growth,
        features: ['Advanced features', 'Priority support', 'Up to 25 users', 'Advanced integrations', 'Analytics'],
        target: 'Growing teams with advanced needs'
      },
      {
        name: 'Scale',
        price: pricing.scale,
        features: ['Enterprise features', '24/7 support', 'Unlimited users', 'Custom integrations', 'Advanced analytics', 'Custom reporting'],
        target: 'Large teams and enterprises'
      }
    ];

    return {
      tiers,
      pricingModel: _businessModel === 'freemium' ? 'Freemium with premium tiers' : 'Premium-only with tiered pricing',
      recommendations: [
        'Start with 3 tiers for simplicity',
        'Ensure clear value progression between tiers',
        'Consider annual discounts (10-20%)',
        'Add usage-based pricing for high-volume customers'
      ]
    };
  }

  // SaaS Customer Success Framework
  static getCustomerSuccessFramework(_targetMarket: string): {
    phases: Array<{ name: string; duration: string; activities: string[]; metrics: string[] }>;
    teamStructure: string[];
    tools: string[];
  } {
    const frameworks = {
      smb: {
        phases: [
          {
            name: 'Onboarding',
            duration: '1-2 weeks',
            activities: ['Welcome email sequence', 'Product tour', 'First value achievement', 'Support documentation'],
            metrics: ['Time to first value', 'Feature adoption rate', 'Support ticket volume']
          },
          {
            name: 'Adoption',
            duration: '1-3 months',
            activities: ['Feature training', 'Best practices sharing', 'Success stories', 'Community engagement'],
            metrics: ['Feature usage', 'User engagement', 'Community participation']
          },
          {
            name: 'Expansion',
            duration: '3-6 months',
            activities: ['Upsell opportunities', 'Feature recommendations', 'Referral programs', 'Advanced training'],
            metrics: ['Expansion revenue', 'Referral rate', 'Advanced feature adoption']
          }
        ],
        teamStructure: ['Customer Success Manager (1:200 customers)', 'Support Specialist (1:100 customers)'],
        tools: ['Intercom', 'Zendesk', 'Mixpanel', 'Customer.io']
      },
      enterprise: {
        phases: [
          {
            name: 'Implementation',
            duration: '1-3 months',
            activities: ['Project planning', 'Custom setup', 'User training', 'Integration support'],
            metrics: ['Implementation timeline', 'User adoption', 'Integration success']
          },
          {
            name: 'Adoption',
            duration: '3-6 months',
            activities: ['Change management', 'Executive sponsorship', 'Department rollouts', 'Advanced training'],
            metrics: ['Department adoption', 'Executive engagement', 'Feature usage']
          },
          {
            name: 'Optimization',
            duration: '6-12 months',
            activities: ['Process optimization', 'Advanced features', 'Cross-sell opportunities', 'Success stories'],
            metrics: ['Process efficiency', 'Advanced feature adoption', 'Cross-sell revenue']
          }
        ],
        teamStructure: ['Customer Success Manager (1:10 customers)', 'Implementation Specialist', 'Technical Account Manager'],
        tools: ['Gainsight', 'Totango', 'Salesforce', 'Slack']
      }
    };

    return frameworks[_targetMarket as keyof typeof frameworks] || frameworks.smb;
  }

  // SaaS Financial Health Calculator
  static calculateFinancialHealth(metrics: SaaSMetrics): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    strengths: string[];
    weaknesses: string[];
    nextSteps: string[];
  } {
    let score = 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // MRR Growth (25 points)
    if (metrics.mrr > 0) {
      score += 25;
      strengths.push('Strong MRR foundation');
    } else {
      weaknesses.push('No MRR established');
    }

    // Churn Rate (20 points)
    if (metrics.churnRate < 0.05) {
      score += 20;
      strengths.push('Excellent retention');
    } else if (metrics.churnRate < 0.10) {
      score += 15;
      strengths.push('Good retention');
    } else {
      weaknesses.push('High churn rate');
    }

    // Magic Number (20 points)
    if (metrics.magicNumber > 1.0) {
      score += 20;
      strengths.push('Efficient customer acquisition');
    } else if (metrics.magicNumber > 0.8) {
      score += 15;
      strengths.push('Good sales efficiency');
    } else {
      weaknesses.push('Low sales efficiency');
    }

    // NRR (20 points)
    if (metrics.nrr > 1.2) {
      score += 20;
      strengths.push('Strong expansion revenue');
    } else if (metrics.nrr > 1.1) {
      score += 15;
      strengths.push('Good revenue retention');
    } else {
      weaknesses.push('Low revenue retention');
    }

    // CAC Payback (15 points)
    if (metrics.cacPaybackPeriod < 12) {
      score += 15;
      strengths.push('Fast CAC recovery');
    } else if (metrics.cacPaybackPeriod < 18) {
      score += 10;
      strengths.push('Reasonable CAC recovery');
    } else {
      weaknesses.push('Slow CAC recovery');
    }

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    // Generate next steps
    const nextSteps: string[] = [];
    if (score < 80) {
      nextSteps.push('Focus on improving weakest metrics first');
      nextSteps.push('Implement customer success best practices');
      nextSteps.push('Review pricing and value proposition');
    }
    if (score >= 80) {
      nextSteps.push('Optimize for growth and expansion');
      nextSteps.push('Consider new market opportunities');
      nextSteps.push('Scale successful strategies');
    }

    return { score, grade, strengths, weaknesses, nextSteps };
  }

  // SaaS Competitive Analysis Framework
  static analyzeCompetition(category: string, _targetMarket: string): {
    competitiveAdvantages: string[];
    differentiationStrategies: string[];
    marketPositioning: string;
    pricingStrategy: string;
  } {
    const analysis = {
      'hr-tech': {
        competitiveAdvantages: ['AI-powered insights', 'User experience', 'Integration ecosystem', 'Compliance features'],
        differentiationStrategies: ['Focus on specific HR function', 'Industry specialization', 'Mobile-first approach', 'AI automation'],
        marketPositioning: 'Modern, AI-powered HR platform for forward-thinking companies',
        pricingStrategy: 'Value-based pricing with clear ROI demonstration'
      },
      'sales-tech': {
        competitiveAdvantages: ['Ease of use', 'Automation capabilities', 'Analytics depth', 'Mobile experience'],
        differentiationStrategies: ['Industry vertical focus', 'AI-powered insights', 'Integration simplicity', 'User adoption'],
        marketPositioning: 'Intelligent sales platform that grows with your business',
        pricingStrategy: 'Usage-based pricing with enterprise tiers'
      },
      'marketing-tech': {
        competitiveAdvantages: ['Creative capabilities', 'Automation workflows', 'Data insights', 'Ease of use'],
        differentiationStrategies: ['Niche market focus', 'AI-powered creativity', 'Integration ecosystem', 'User experience'],
        marketPositioning: 'Creative marketing platform for modern businesses',
        pricingStrategy: 'Freemium model with premium features'
      }
    };

    return analysis[category as keyof typeof analysis] || analysis['hr-tech'];
  }
}
