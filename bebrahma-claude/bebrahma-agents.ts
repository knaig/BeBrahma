// apps/api/src/agents/agents/founder-pm.agent.ts

import { Injectable } from '@nestjs/common';
import { AgentRole, ProblemBrief } from '@bebrahma/types';
import { BaseAgent } from './base.agent';

@Injectable()
export class FounderPMAgent extends BaseAgent {
  getRole(): AgentRole {
    return {
      name: 'Founder-PM',
      persona: 'Experienced product manager and startup founder',
      systemPrompt: `You are an experienced Product Manager who has founded multiple successful startups.
      Your role is to help refine vague ideas into clear, actionable problem statements.
      You excel at identifying core user needs and framing them in a way that leads to successful products.`,
      goals: [
        'Clarify the core problem being solved',
        'Identify target users and their pain points',
        'Define success criteria and constraints',
        'Create a concise problem brief',
      ],
      constraints: [
        'Must produce a one-page problem brief',
        'Must be specific about target users',
        'Must identify measurable success criteria',
        'Must consider feasibility for a solo founder',
      ],
    };
  }

  async process(input: string): Promise<ProblemBrief> {
    const response = await this.collaborate(
      'Refine this problem statement into a clear brief',
      input,
    );

    return this.extractProblemBrief(response);
  }

  private extractProblemBrief(response: any): ProblemBrief {
    // Parse the agent's response into structured format
    return {
      title: response.title || 'Untitled Problem',
      statement: response.statement || input,
      context: response.context || '',
      constraints: response.constraints || [],
      successCriteria: response.successCriteria || [],
      assumptions: response.assumptions || [],
    };
  }
}

// apps/api/src/agents/agents/researcher.agent.ts

import { Injectable } from '@nestjs/common';
import { AgentRole, MarketSnapshot, Citation } from '@bebrahma/types';
import { BaseAgent } from './base.agent';
import { SearchToolAdapter } from '../../tools/adapters/search.adapter';

@Injectable()
export class ResearcherAgent extends BaseAgent {
  constructor(private readonly searchTool: SearchToolAdapter) {
    super();
  }

  getRole(): AgentRole {
    return {
      name: 'Researcher',
      persona: 'Meticulous market researcher and data analyst',
      systemPrompt: `You are a senior market researcher with expertise in gathering and validating market data.
      You MUST provide credible sources (URLs) for every claim you make.
      You excel at finding market size, competitors, trends, and regulatory information.
      
      CRITICAL: Every factual claim MUST include [CITE: url | title | snippet]`,
      goals: [
        'Gather accurate market size data with sources',
        'Identify 3-5 key competitors with evidence',
        'Find relevant market trends with citations',
        'Validate all claims with credible sources',
      ],
      constraints: [
        'MUST cite sources for ALL claims',
        'Only use credible sources (no blogs without data)',
        'Provide confidence scores for each finding',
        'Focus on recent data (last 2 years preferred)',
      ],
    };
  }

  async process(problemBrief: ProblemBrief): Promise<MarketSnapshot> {
    // Perform searches for market data
    const searches = await Promise.all([
      this.searchMarketSize(problemBrief),
      this.searchCompetitors(problemBrief),
      this.searchTrends(problemBrief),
    ]);

    const response = await this.collaborate(
      'Compile market research with citations',
      JSON.stringify({ problemBrief, searchResults: searches }),
    );

    return this.extractMarketSnapshot(response);
  }

  private async searchMarketSize(brief: ProblemBrief) {
    return this.searchTool.search(
      `${brief.targetMarket} market size revenue statistics`,
    );
  }

  private async searchCompetitors(brief: ProblemBrief) {
    return this.searchTool.search(
      `${brief.title} competitors solutions alternatives`,
    );
  }

  private async searchTrends(brief: ProblemBrief) {
    return this.searchTool.search(
      `${brief.targetMarket} trends growth projections 2024 2025`,
    );
  }

  private extractMarketSnapshot(response: any): MarketSnapshot {
    // Ensure all data has citations
    return {
      marketSize: response.marketSize,
      competitors: response.competitors,
      trends: response.trends,
      painPoints: response.painPoints,
      regulations: response.regulations,
    };
  }
}

// apps/api/src/agents/agents/evaluator.agent.ts

import { Injectable } from '@nestjs/common';
import { AgentRole } from '@bebrahma/types';
import { BaseAgent } from './base.agent';

@Injectable()
export class EvaluatorAgent extends BaseAgent {
  getRole(): AgentRole {
    return {
      name: 'Evaluator',
      persona: 'Venture capitalist and startup advisor',
      systemPrompt: `You are a seasoned venture capitalist with 15+ years evaluating startups.
      You provide honest, data-driven assessments of opportunities.
      You score opportunities on multiple dimensions and identify key risks.`,
      goals: [
        'Score problem severity (1-10)',
        'Assess willingness to pay',
        'Evaluate competition intensity',
        'Identify key risks and mitigations',
        'Provide go/no-go recommendation',
      ],
      constraints: [
        'Be brutally honest about weaknesses',
        'Base scores on provided research data',
        'Consider solo founder constraints',
        'Focus on quick validation potential',
      ],
    };
  }

  async process(problemBrief: any, marketSnapshot: any): Promise<any> {
    const response = await this.collaborate(
      'Evaluate this opportunity for a solo founder',
      JSON.stringify({ problemBrief, marketSnapshot }),
    );

    return this.extractEvaluation(response);
  }

  private extractEvaluation(response: any): any {
    return {
      scores: {
        problemSeverity: response.problemSeverity || 5,
        willingnessToPay: response.willingnessToPay || 5,
        competitionIntensity: response.competitionIntensity || 5,
        founderFit: response.founderFit || 5,
        timingScore: response.timingScore || 5,
      },
      risks: response.risks || [],
      opportunities: response.opportunities || [],
      recommendation: response.recommendation || 'PROCEED_WITH_CAUTION',
      reasoning: response.reasoning || '',
    };
  }
}

// apps/api/src/agents/agents/gtm-seed.agent.ts

import { Injectable } from '@nestjs/common';
import { AgentRole, GTMSeed } from '@bebrahma/types';
import { BaseAgent } from './base.agent';

@Injectable()
export class GTMSeedAgent extends BaseAgent {
  getRole(): AgentRole {
    return {
      name: 'GTM-Seed',
      persona: 'Growth hacker and go-to-market strategist',
      systemPrompt: `You are a scrappy growth hacker who has launched dozens of B2B SaaS products.
      You specialize in zero-budget growth tactics and rapid experimentation.
      You create practical GTM plans that a solo founder can execute.`,
      goals: [
        'Define 2-3 specific target personas',
        'Identify 3 low-cost acquisition channels',
        'Design 3 experiments under $100 each',
        'Create 30-day execution timeline',
      ],
      constraints: [
        'Total budget under $300',
        'Executable by one person',
        'Results within 30 days',
        'Focus on validation, not scale',
      ],
    };
  }

  async process(evaluation: any): Promise<GTMSeed> {
    const response = await this.collaborate(
      'Create a lean GTM strategy for quick validation',
      JSON.stringify(evaluation),
    );

    return this.extractGTMSeed(response);
  }

  private extractGTMSeed(response: any): GTMSeed {
    return {
      personas: response.personas || [],
      channels: response.channels || [],
      experiments: response.experiments || [],
      timeline: response.timeline || '30 days',
      budget: response.budget || { min: 0, max: 300, currency: 'USD' },
    };
  }
}

// apps/api/src/agents/agents/prompt-engineer.agent.ts

import { Injectable } from '@nestjs/common';
import { AgentRole, BuildPrompt } from '@bebrahma/types';
import { BaseAgent } from './base.agent';

@Injectable()
export class PromptEngineerAgent extends BaseAgent {
  getRole(): AgentRole {
    return {
      name: 'Prompt-Engineer',
      persona: 'Senior full-stack engineer and prompt engineering expert',
      systemPrompt: `You are a senior engineer who specializes in creating detailed technical specifications
      that can be directly used by AI coding assistants like Cursor and Lovable.
      You create comprehensive, unambiguous prompts that result in production-ready code.`,
      goals: [
        'Create complete technical specification',
        'Define clear data models and APIs',
        'Specify UI components and flows',
        'Include test scenarios and edge cases',
      ],
      constraints: [
        'Must be executable in Cursor/Lovable',
        'Use modern, popular tech stack',
        'Include security considerations',
        'Optimize for solo developer productivity',
      ],
    };
  }

  async process(gtmSeed: any, evaluation: any): Promise<BuildPrompt> {
    const response = await this.collaborate(
      'Create a comprehensive build prompt for Cursor/Lovable',
      JSON.stringify({ gtmSeed, evaluation }),
    );

    return this.extractBuildPrompt(response);
  }

  private extractBuildPrompt(response: any): BuildPrompt {
    return {
      title: response.title || 'MVP Build Specification',
      overview: response.overview || '',
      technicalRequirements: response.technicalRequirements || [],
      userStories: response.userStories || [],
      dataModel: response.dataModel || [],
      apiEndpoints: response.apiEndpoints || [],
      uiComponents: response.uiComponents || [],
      testPlan: response.testPlan || [],
      deploymentNotes: response.deploymentNotes || '',
    };
  }
}

// apps/api/src/agents/agents/base.agent.ts

export abstract class BaseAgent {
  abstract getRole(): AgentRole;
  
  protected async collaborate(task: string, input: any): Promise<any> {
    // This will be injected by the orchestrator
    // Placeholder for agent collaboration logic
    return {};
  }
}