import { TestCycle, CompetitiveAnalysis } from './types';
import { CONVERSATION_FLOWS } from './conversation-flows';
import axios from 'axios';
import chalk from 'chalk';
import path from 'path';

export class CompetitorComparison {
  private config: any;
  private perplexityApiKey: string;
  private perplexityEndpoint: string;

  constructor(config: any) {
    this.config = config;
    this.perplexityApiKey = config.competitorApiKeys?.perplexity || process.env.PERPLEXITY_API_KEY || '';
    this.perplexityEndpoint = 'https://api.perplexity.ai/chat/completions';
  }

  async compareWithPerplexity(cycle: TestCycle): Promise<CompetitiveAnalysis> {
    console.log(chalk.blue('🔍 Comparing with Perplexity...'));

    if (!this.perplexityApiKey) {
      console.log(chalk.yellow('⚠️  No Perplexity API key found. Skipping competitor comparison.'));
      return this.createEmptyAnalysis();
    }

    try {
      const comparisonResults = await this.runPerplexityTests(cycle);
      const analysis = this.analyzeComparison(cycle, comparisonResults);
      
      console.log(chalk.green('✅ Competitor comparison completed'));
      return analysis;
    } catch (error) {
      console.log(chalk.red(`❌ Competitor comparison failed: ${error}`));
      return this.createEmptyAnalysis();
    }
  }

  private async runPerplexityTests(cycle: TestCycle): Promise<any[]> {
    const results = [];
    
    // Test a subset of conversation flows for comparison
    const testFlows = cycle.testSuites
      .flatMap(suite => suite.conversationFlows)
      .slice(0, 3); // Limit to 3 flows for comparison

    for (const flow of testFlows) {
      console.log(chalk.gray(`  Testing: ${flow.name}`));
      
      try {
        const perplexityResponse = await this.testPerplexityFlow(flow);
        const scores = await this.evaluatePerplexityResponse(flow, perplexityResponse);
        
        results.push({
          flowId: flow.id,
          flowName: flow.name,
          response: perplexityResponse,
          scores,
          executionTime: Date.now() // Simplified timing
        });
      } catch (error) {
        console.log(chalk.red(`    Failed: ${error}`));
        results.push({
          flowId: flow.id,
          flowName: flow.name,
          error: error.message,
          scores: this.getDefaultScores(),
          executionTime: 0
        });
      }
    }

    return results;
  }

  private async testPerplexityFlow(flow: any): Promise<string> {
    const messages = [
      { role: 'user', content: flow.initialPrompt }
    ];

    // Add follow-up prompts to simulate multi-turn conversation
    for (const followUp of flow.followUpPrompts.slice(0, 2)) { // Limit to 2 follow-ups
      messages.push({ role: 'user', content: followUp });
    }

    const response = await axios.post(
      this.perplexityEndpoint,
      {
        model: 'llama-3.1-sonar-small-128k-online',
        messages,
        max_tokens: 1000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${this.perplexityApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;
  }

  private async evaluatePerplexityResponse(flow: any, response: string): Promise<any> {
    // Use a simplified evaluation approach for competitor responses
    // In a real implementation, you might use a different evaluation model
    
    const scores = {
      contextRetention: this.simpleContextEvaluation(flow, response),
      responseRelevance: this.simpleRelevanceEvaluation(flow, response),
      businessInsightQuality: this.simpleInsightEvaluation(flow, response),
      responseTime: 0, // Will be filled from execution timing
      costPerQuery: 0.01 // Estimated cost for Perplexity
    };

    return scores;
  }

  private simpleContextEvaluation(flow: any, response: string): number {
    // Simple keyword-based context evaluation
    const contextKeywords = flow.expectedContexts.map((ctx: string) => 
      ctx.toLowerCase().split(' ').filter((word: string) => word.length > 3)
    ).flat();

    const responseLower = response.toLowerCase();
    const matchedKeywords = contextKeywords.filter((keyword: string) => 
      responseLower.includes(keyword)
    );

    const coverage = matchedKeywords.length / contextKeywords.length;
    return Math.min(10, Math.max(1, Math.round(coverage * 10)));
  }

  private simpleRelevanceEvaluation(flow: any, response: string): number {
    // Simple relevance evaluation based on business domain
    const domainKeywords = flow.businessDomain.toLowerCase().split(' ');
    const responseLower = response.toLowerCase();
    
    const domainMatch = domainKeywords.filter((keyword: string) => 
      responseLower.includes(keyword)
    ).length;

    const relevance = domainMatch / domainKeywords.length;
    return Math.min(10, Math.max(1, Math.round(relevance * 10)));
  }

  private simpleInsightEvaluation(flow: any, response: string): number {
    // Simple insight evaluation based on response length and structure
    const words = response.split(' ').length;
    const sentences = response.split(/[.!?]+/).length;
    
    // Basic heuristics for business insight quality
    let score = 5; // Base score
    
    if (words > 100) score += 1; // Detailed response
    if (words > 200) score += 1; // Very detailed
    if (sentences > 5) score += 1; // Well-structured
    if (response.includes('because') || response.includes('however') || response.includes('therefore')) score += 1; // Analytical
    if (response.includes('recommend') || response.includes('suggest') || response.includes('consider')) score += 1; // Actionable
    
    return Math.min(10, Math.max(1, score));
  }

  private getDefaultScores(): any {
    return {
      contextRetention: 5,
      responseRelevance: 5,
      businessInsightQuality: 5,
      responseTime: 0,
      costPerQuery: 0.01
    };
  }

  private analyzeComparison(cycle: TestCycle, perplexityResults: any[]): CompetitiveAnalysis {
    const ourScores = cycle.results.scores;
    
    // Calculate average Perplexity scores
    const avgPerplexityScores = {
      contextRetention: this.average(perplexityResults.map(r => r.scores.contextRetention)),
      responseRelevance: this.average(perplexityResults.map(r => r.scores.responseRelevance)),
      businessInsightQuality: this.average(perplexityResults.map(r => r.scores.businessInsightQuality)),
      responseTime: this.average(perplexityResults.map(r => r.executionTime)),
      costPerQuery: 0.01 // Fixed cost for Perplexity
    };

    // Identify advantages and disadvantages
    const advantages = [];
    const disadvantages = [];
    const gaps = [];

    if (ourScores.contextRetention > avgPerplexityScores.contextRetention) {
      advantages.push('Better context retention capabilities');
    } else {
      disadvantages.push('Context retention needs improvement');
      gaps.push('Enhance context memory and conversation continuity');
    }

    if (ourScores.responseRelevance > avgPerplexityScores.responseRelevance) {
      advantages.push('More relevant business-focused responses');
    } else {
      disadvantages.push('Response relevance could be improved');
      gaps.push('Improve business domain expertise and relevance');
    }

    if (ourScores.businessInsightQuality > avgPerplexityScores.businessInsightQuality) {
      advantages.push('Higher quality business insights');
    } else {
      disadvantages.push('Business insight quality needs enhancement');
      gaps.push('Strengthen business analysis and strategic thinking');
    }

    // Generate competitive advantage statement
    let competitiveAdvantage = 'Competitive parity';
    if (advantages.length > disadvantages.length) {
      competitiveAdvantage = 'Moderate competitive advantage';
    }
    if (advantages.length > disadvantages.length * 2) {
      competitiveAdvantage = 'Strong competitive advantage';
    }

    return {
      competitor: 'perplexity',
      comparisonMetrics: avgPerplexityScores,
      advantages,
      disadvantages,
      gaps,
      recommendations: this.generateCompetitiveRecommendations(advantages, disadvantages, gaps),
      competitiveAdvantage
    };
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private generateCompetitiveRecommendations(advantages: string[], disadvantages: string[], gaps: string[]): string[] {
    const recommendations = [];

    if (advantages.length > 0) {
      recommendations.push(`Leverage ${advantages.length} competitive advantages in marketing`);
      recommendations.push('Focus on strengths in customer communications');
    }

    if (disadvantages.length > 0) {
      recommendations.push(`Address ${disadvantages.length} competitive weaknesses`);
      recommendations.push('Prioritize improvements based on customer impact');
    }

    if (gaps.length > 0) {
      recommendations.push(`Close ${gaps.length} competitive gaps`);
      recommendations.push('Invest in areas that provide sustainable advantage');
    }

    recommendations.push('Monitor competitor improvements and adapt strategies');
    recommendations.push('Build unique value propositions beyond basic AI capabilities');

    return recommendations;
  }

  private createEmptyAnalysis(): CompetitiveAnalysis {
    return {
      competitor: 'perplexity',
      comparisonMetrics: {
        contextRetention: 0,
        responseRelevance: 0,
        businessInsightQuality: 0,
        responseTime: 0,
        costPerQuery: 0
      },
      advantages: [],
      disadvantages: [],
      gaps: [],
      recommendations: ['Set up competitor API keys for future comparisons'],
      competitiveAdvantage: 'Unable to determine'
    };
  }

  async generateCompetitiveReport(cycle: TestCycle, outputPath: string): Promise<void> {
    const analysis = await this.compareWithPerplexity(cycle);
    
    const report = {
      timestamp: new Date().toISOString(),
      cycleId: cycle.id,
      competitor: analysis.competitor,
      summary: {
        ourScore: cycle.results.scores.overallScore,
        theirScore: analysis.comparisonMetrics.businessInsightQuality,
        competitiveAdvantage: analysis.competitiveAdvantage
      },
      detailedComparison: {
        contextRetention: {
          our: cycle.results.scores.contextRetention,
          their: analysis.comparisonMetrics.contextRetention,
          difference: cycle.results.scores.contextRetention - analysis.comparisonMetrics.contextRetention
        },
        responseRelevance: {
          our: cycle.results.scores.responseRelevance,
          their: analysis.comparisonMetrics.responseRelevance,
          difference: cycle.results.scores.responseRelevance - analysis.comparisonMetrics.responseRelevance
        },
        businessInsightQuality: {
          our: cycle.results.scores.businessInsightQuality,
          their: analysis.comparisonMetrics.businessInsightQuality,
          difference: cycle.results.scores.businessInsightQuality - analysis.comparisonMetrics.businessInsightQuality
        }
      },
      advantages: analysis.advantages,
      disadvantages: analysis.disadvantages,
      gaps: analysis.gaps,
      recommendations: analysis.recommendations
    };

    // Save competitive analysis report
    const fs = require('fs-extra');
    await fs.writeJson(path.join(outputPath, 'competitive-analysis.json'), report, { spaces: 2 });
    
    console.log(chalk.green(`✅ Competitive analysis report saved to: ${outputPath}/competitive-analysis.json`));
  }
}
