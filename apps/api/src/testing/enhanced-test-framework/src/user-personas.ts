import { UserPersona } from './types';

export const USER_PERSONAS: UserPersona[] = [
  {
    id: 'startup-founder-sarah',
    name: 'Sarah Chen',
    role: 'Founder & CEO',
    expertise: 'beginner',
    industry: 'SaaS',
    companySize: 'startup',
    useCase: 'Business strategy planning and market entry',
    painPoints: [
      'Limited business experience',
      'Uncertain about market validation',
      'Need help with financial planning',
      'Competitive analysis gaps'
    ],
    goals: [
      'Validate business idea',
      'Create go-to-market strategy',
      'Understand funding requirements',
      'Build competitive advantage'
    ],
    technicalLevel: 'non-technical'
  },
  {
    id: 'product-manager-mike',
    name: 'Mike Rodriguez',
    role: 'Senior Product Manager',
    expertise: 'intermediate',
    industry: 'FinTech',
    companySize: 'sme',
    useCase: 'Product strategy and user research',
    painPoints: [
      'Need data-driven insights',
      'Competitive landscape analysis',
      'User behavior understanding',
      'Feature prioritization'
    ],
    goals: [
      'Optimize product roadmap',
      'Identify market opportunities',
      'Improve user experience',
      'Increase market share'
    ],
    technicalLevel: 'semi-technical'
  },
  {
    id: 'consultant-dr-james',
    name: 'Dr. James Wilson',
    role: 'Management Consultant',
    expertise: 'expert',
    industry: 'Consulting',
    companySize: 'enterprise',
    useCase: 'Client strategy and industry analysis',
    painPoints: [
      'Need rapid industry insights',
      'Client presentation preparation',
      'Data analysis and interpretation',
      'Strategic recommendation development'
    ],
    goals: [
      'Deliver high-quality client work',
      'Stay ahead of industry trends',
      'Provide actionable insights',
      'Build thought leadership'
    ],
    technicalLevel: 'technical'
  },
  {
    id: 'marketing-director-lisa',
    name: 'Lisa Thompson',
    role: 'Marketing Director',
    expertise: 'intermediate',
    industry: 'E-commerce',
    companySize: 'sme',
    useCase: 'Marketing strategy and customer insights',
    painPoints: [
      'Customer behavior analysis',
      'Competitive positioning',
      'Marketing ROI optimization',
      'Market trend identification'
    ],
    goals: [
      'Increase customer acquisition',
      'Improve marketing efficiency',
      'Understand customer segments',
      'Optimize campaign performance'
    ],
    technicalLevel: 'semi-technical'
  },
  {
    id: 'investor-alex',
    name: 'Alex Kumar',
    role: 'Venture Capital Partner',
    expertise: 'expert',
    industry: 'Investment',
    companySize: 'enterprise',
    useCase: 'Due diligence and market analysis',
    painPoints: [
      'Need rapid market assessment',
      'Competitive landscape analysis',
      'Business model validation',
      'Risk assessment'
    ],
    goals: [
      'Make informed investment decisions',
      'Identify promising opportunities',
      'Assess market potential',
      'Mitigate investment risks'
    ],
    technicalLevel: 'technical'
  },
  {
    id: 'small-business-owner-maria',
    name: 'Maria Gonzalez',
    role: 'Small Business Owner',
    expertise: 'beginner',
    industry: 'Retail',
    companySize: 'startup',
    useCase: 'Business growth and operational planning',
    painPoints: [
      'Limited business knowledge',
      'Need operational guidance',
      'Financial planning challenges',
      'Market expansion decisions'
    ],
    goals: [
      'Grow business revenue',
      'Improve operational efficiency',
      'Expand to new markets',
      'Build sustainable business model'
    ],
    technicalLevel: 'non-technical'
  }
];

export const PERSONA_CATEGORIES = {
  byExpertise: {
    beginner: USER_PERSONAS.filter(p => p.expertise === 'beginner'),
    intermediate: USER_PERSONAS.filter(p => p.expertise === 'intermediate'),
    expert: USER_PERSONAS.filter(p => p.expertise === 'expert')
  },
  byIndustry: {
    saas: USER_PERSONAS.filter(p => p.industry.toLowerCase().includes('saas')),
    fintech: USER_PERSONAS.filter(p => p.industry.toLowerCase().includes('fintech')),
    consulting: USER_PERSONAS.filter(p => p.industry.toLowerCase().includes('consulting')),
    ecommerce: USER_PERSONAS.filter(p => p.industry.toLowerCase().includes('e-commerce')),
    investment: USER_PERSONAS.filter(p => p.industry.toLowerCase().includes('investment')),
    retail: USER_PERSONAS.filter(p => p.industry.toLowerCase().includes('retail'))
  },
  byCompanySize: {
    startup: USER_PERSONAS.filter(p => p.companySize === 'startup'),
    sme: USER_PERSONAS.filter(p => p.companySize === 'sme'),
    enterprise: USER_PERSONAS.filter(p => p.companySize === 'enterprise')
  }
};

export function getPersonaById(id: string): UserPersona | undefined {
  return USER_PERSONAS.find(p => p.id === id);
}

export function getPersonasByUseCase(useCase: string): UserPersona[] {
  return USER_PERSONAS.filter(p => 
    p.useCase.toLowerCase().includes(useCase.toLowerCase()) ||
    p.goals.some(goal => goal.toLowerCase().includes(useCase.toLowerCase()))
  );
}

export function getPersonasByPainPoint(painPoint: string): UserPersona[] {
  return USER_PERSONAS.filter(p => 
    p.painPoints.some(point => point.toLowerCase().includes(painPoint.toLowerCase()))
  );
}
