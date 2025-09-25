import { TestSuiteResult, EvaluationResult } from './conversation-evaluator';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Enhanced Reporter for CrewAI Conversation Testing
 * Generates traceable reports mapping results to requirements
 */

export interface RequirementMapping {
  id: string;
  category: string;
  description: string;
  testCases: string[];
  successCriteria: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TraceableReport {
  executiveSummary: {
    timestamp: string;
    overallScore: number;
    totalRequirements: number;
    passedRequirements: number;
    failedRequirements: number;
    criticalIssues: string[];
    recommendations: string[];
  };
  requirementTraceability: RequirementTraceabilityResult[];
  detailedResults: {
    testSuites: TestSuiteResult[];
    performanceMetrics: PerformanceMetrics;
    improvementAreas: ImprovementArea[];
  };
  appendices: {
    testCaseDetails: TestCaseDetail[];
    evaluationCriteria: EvaluationCriteriaDetail[];
    technicalSpecs: TechnicalSpecification[];
  };
}

export interface RequirementTraceabilityResult {
  requirement: RequirementMapping;
  testResults: TestResult[];
  overallScore: number;
  status: 'passed' | 'failed' | 'partial';
  gaps: string[];
  recommendations: string[];
}

export interface TestResult {
  testId: string;
  testName: string;
  metrics: {
    contextRetention: number;
    relevance: number;
    coherence: number;
    businessInsight: number;
    continuity: number;
  };
  averageScore: number;
  passed: boolean;
  feedback: string;
}

export interface PerformanceMetrics {
  overall: {
    contextRetention: number;
    relevance: number;
    coherence: number;
    businessInsight: number;
    continuity: number;
  };
  byDomain: Record<string, {
    averageScore: number;
    testCount: number;
    successRate: number;
  }>;
  trends: {
    strongAreas: string[];
    weakAreas: string[];
    improvementOpportunities: string[];
  };
}

export interface ImprovementArea {
  category: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  specificActions: string[];
  estimatedEffort: string;
  businessImpact: string;
}

export interface TestCaseDetail {
  id: string;
  name: string;
  description: string;
  businessDomain: string;
  complexity: string;
  expectedOutcomes: string[];
  actualResults: string;
  successCriteria: string;
}

export interface EvaluationCriteriaDetail {
  metric: string;
  description: string;
  scoringMethod: string;
  weight: number;
  threshold: number;
  examples: {
    excellent: string;
    good: string;
    needsImprovement: string;
  };
}

export interface TechnicalSpecification {
  component: string;
  version: string;
  configuration: Record<string, any>;
  dependencies: string[];
  performanceTargets: Record<string, string>;
}

export class EnhancedReporter {
  private requirements: RequirementMapping[];

  constructor() {
    this.requirements = this.defineRequirements();
  }

  /**
   * Define system requirements and their test mappings
   */
  private defineRequirements(): RequirementMapping[] {
    return [
      {
        id: 'REQ-001',
        category: 'Conversation Quality',
        description: 'AI must maintain context across multi-turn conversations',
        testCases: ['continuity_1', 'continuity_2', 'strategy_1'],
        successCriteria: 'Context retention score ≥ 7.0 across all conversation turns',
        priority: 'high'
      },
      {
        id: 'REQ-002',
        category: 'Business Intelligence',
        description: 'AI must provide actionable business insights and strategic advice',
        testCases: ['strategy_1', 'strategy_2', 'financial_1'],
        successCriteria: 'Business insight score ≥ 7.5 for strategic planning scenarios',
        priority: 'high'
      },
      {
        id: 'REQ-003',
        category: 'Response Relevance',
        description: 'AI responses must be directly relevant to user questions and business context',
        testCases: ['research_1', 'competitive_1', 'strategy_2'],
        successCriteria: 'Relevance score ≥ 8.0 across all business domains',
        priority: 'high'
      },
      {
        id: 'REQ-004',
        category: 'Conversation Flow',
        description: 'AI must maintain natural conversation progression and continuity',
        testCases: ['continuity_1', 'continuity_2', 'strategy_1'],
        successCriteria: 'Continuity score ≥ 7.5 for multi-turn discussions',
        priority: 'medium'
      },
      {
        id: 'REQ-005',
        category: 'Response Structure',
        description: 'AI responses must be logically coherent and well-structured',
        testCases: ['financial_1', 'research_1', 'competitive_1'],
        successCriteria: 'Coherence score ≥ 7.0 across all response types',
        priority: 'medium'
      },
      {
        id: 'REQ-006',
        category: 'Domain Expertise',
        description: 'AI must demonstrate deep knowledge across business domains',
        testCases: ['strategy_1', 'financial_1', 'research_1', 'competitive_1'],
        successCriteria: 'Average score ≥ 7.5 across all business domains',
        priority: 'high'
      },
      {
        id: 'REQ-007',
        category: 'Context Memory',
        description: 'AI must remember and build upon previous conversation elements',
        testCases: ['continuity_1', 'continuity_2', 'strategy_1'],
        successCriteria: 'Context retention score ≥ 8.0 for follow-up questions',
        priority: 'high'
      },
      {
        id: 'REQ-008',
        category: 'Strategic Thinking',
        description: 'AI must demonstrate strategic business thinking and planning capabilities',
        testCases: ['strategy_1', 'strategy_2', 'financial_1'],
        successCriteria: 'Business insight score ≥ 8.0 for strategic scenarios',
        priority: 'high'
      }
    ];
  }

  /**
   * Generate comprehensive traceable report
   */
  generateTraceableReport(results: TestSuiteResult[]): TraceableReport {
    const traceabilityResults = this.generateRequirementTraceability(results);
    const performanceMetrics = this.calculatePerformanceMetrics(results);
    const improvementAreas = this.identifyImprovementAreas(performanceMetrics);
    
    const overallScore = this.calculateOverallScore(performanceMetrics.overall);
    const passedRequirements = traceabilityResults.filter(r => r.status === 'passed').length;
    const failedRequirements = traceabilityResults.filter(r => r.status === 'failed').length;
    
    const criticalIssues = this.identifyCriticalIssues(traceabilityResults);
    const recommendations = this.generateRecommendations(traceabilityResults, improvementAreas);

    return {
      executiveSummary: {
        timestamp: new Date().toISOString(),
        overallScore,
        totalRequirements: this.requirements.length,
        passedRequirements,
        failedRequirements,
        criticalIssues,
        recommendations
      },
      requirementTraceability: traceabilityResults,
      detailedResults: {
        testSuites: results,
        performanceMetrics,
        improvementAreas
      },
      appendices: {
        testCaseDetails: this.generateTestCaseDetails(results),
        evaluationCriteria: this.generateEvaluationCriteria(),
        technicalSpecs: this.generateTechnicalSpecs()
      }
    };
  }

  /**
   * Generate requirement traceability matrix
   */
  private generateRequirementTraceability(results: TestSuiteResult[]): RequirementTraceabilityResult[] {
    return this.requirements.map(req => {
      const relevantTests = this.findRelevantTests(req.testCases, results);
      const overallScore = this.calculateRequirementScore(relevantTests);
      const status = this.determineRequirementStatus(req, overallScore);
      const gaps = this.identifyRequirementGaps(req, relevantTests);
      const recommendations = this.generateRequirementRecommendations(req, gaps);

      return {
        requirement: req,
        testResults: relevantTests,
        overallScore,
        status,
        gaps,
        recommendations
      };
    });
  }

  /**
   * Find test results relevant to a requirement
   */
  private findRelevantTests(testCaseIds: string[], results: TestSuiteResult[]): TestResult[] {
    const relevantTests: TestResult[] = [];
    
    results.forEach(suite => {
      suite.detailedResults.forEach(result => {
        if (testCaseIds.some(id => result.testId.includes(id))) {
          relevantTests.push({
            testId: result.testId,
            testName: result.prompt,
            metrics: result.metrics,
            averageScore: Object.values(result.metrics).reduce((a, b) => a + b, 0) / 5,
            passed: result.passed,
            feedback: result.feedback
          });
        }
      });
    });

    return relevantTests;
  }

  /**
   * Calculate overall score for a requirement
   */
  private calculateRequirementScore(tests: TestResult[]): number {
    if (tests.length === 0) return 0;
    return tests.reduce((sum, test) => sum + test.averageScore, 0) / tests.length;
  }

  /**
   * Determine if a requirement is passed, failed, or partial
   */
  private determineRequirementStatus(req: RequirementMapping, score: number): 'passed' | 'failed' | 'partial' {
    if (req.id === 'REQ-002' || req.id === 'REQ-006' || req.id === 'REQ-008') {
      return score >= 7.5 ? 'passed' : score >= 6.0 ? 'partial' : 'failed';
    }
    if (req.id === 'REQ-003' || req.id === 'REQ-007') {
      return score >= 8.0 ? 'passed' : score >= 6.5 ? 'partial' : 'failed';
    }
    return score >= 7.0 ? 'passed' : score >= 5.5 ? 'partial' : 'failed';
  }

  /**
   * Identify gaps in requirement fulfillment
   */
  private identifyRequirementGaps(req: RequirementMapping, tests: TestResult[]): string[] {
    const gaps: string[] = [];
    
    if (tests.length === 0) {
      gaps.push('No test cases executed for this requirement');
      return gaps;
    }

    const avgScores = {
      contextRetention: tests.reduce((sum, t) => sum + t.metrics.contextRetention, 0) / tests.length,
      relevance: tests.reduce((sum, t) => sum + t.metrics.relevance, 0) / tests.length,
      coherence: tests.reduce((sum, t) => sum + t.metrics.coherence, 0) / tests.length,
      businessInsight: tests.reduce((sum, t) => sum + t.metrics.businessInsight, 0) / tests.length,
      continuity: tests.reduce((sum, t) => sum + t.metrics.continuity, 0) / tests.length
    };

    if (avgScores.contextRetention < 7.0) {
      gaps.push('Context retention below threshold (7.0)');
    }
    if (avgScores.relevance < 7.0) {
      gaps.push('Response relevance below threshold (7.0)');
    }
    if (avgScores.coherence < 7.0) {
      gaps.push('Response coherence below threshold (7.0)');
    }
    if (avgScores.businessInsight < 7.0) {
      gaps.push('Business insight quality below threshold (7.0)');
    }
    if (avgScores.continuity < 7.0) {
      gaps.push('Conversation continuity below threshold (7.0)');
    }

    return gaps;
  }

  /**
   * Generate recommendations for requirement improvement
   */
  private generateRequirementRecommendations(req: RequirementMapping, gaps: string[]): string[] {
    const recommendations: string[] = [];
    
    if (gaps.includes('Context retention below threshold (7.0)')) {
      recommendations.push('Enhance conversation memory management system');
      recommendations.push('Implement better session state persistence');
    }
    if (gaps.includes('Response relevance below threshold (7.0)')) {
      recommendations.push('Improve prompt engineering for business context');
      recommendations.push('Enhance domain-specific knowledge base');
    }
    if (gaps.includes('Business insight quality below threshold (7.0)')) {
      recommendations.push('Strengthen strategic thinking prompts');
      recommendations.push('Add more business framework knowledge');
    }
    if (gaps.includes('Conversation continuity below threshold (7.0)')) {
      recommendations.push('Improve conversation flow management');
      recommendations.push('Enhance context building algorithms');
    }

    if (recommendations.length === 0) {
      recommendations.push('Requirement is performing well. Consider adding more complex test scenarios.');
    }

    return recommendations;
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(results: TestSuiteResult[]): PerformanceMetrics {
    const overall = this.calculateOverallMetrics(results);
    const byDomain = this.calculateDomainMetrics(results);
    const trends = this.identifyTrends(overall);

    return { overall, byDomain, trends };
  }

  /**
   * Calculate overall metrics
   */
  private calculateOverallMetrics(results: TestSuiteResult[]): { contextRetention: number; relevance: number; coherence: number; businessInsight: number; continuity: number } {
    const totalTests = results.reduce((sum, r) => sum + r.totalTests, 0);
    if (totalTests === 0) return { contextRetention: 0, relevance: 0, coherence: 0, businessInsight: 0, continuity: 0 };

    return {
      contextRetention: results.reduce((sum, r) => sum + r.averageScores.contextRetention, 0) / results.length,
      relevance: results.reduce((sum, r) => sum + r.averageScores.relevance, 0) / results.length,
      coherence: results.reduce((sum, r) => sum + r.averageScores.coherence, 0) / results.length,
      businessInsight: results.reduce((sum, r) => sum + r.averageScores.businessInsight, 0) / results.length,
      continuity: results.reduce((sum, r) => sum + r.averageScores.continuity, 0) / results.length
    };
  }

  /**
   * Calculate metrics by business domain
   */
  private calculateDomainMetrics(results: TestSuiteResult[]): Record<string, any> {
    const domains: Record<string, { scores: number[], testCount: number }> = {};
    
    results.forEach(suite => {
      suite.detailedResults.forEach(result => {
        // Extract domain from test ID or prompt
        const domain = this.extractDomain(result.prompt);
        if (!domains[domain]) {
          domains[domain] = { scores: [], testCount: 0 };
        }
        
        const avgScore = Object.values(result.metrics).reduce((a, b) => a + b, 0) / 5;
        domains[domain].scores.push(avgScore);
        domains[domain].testCount++;
      });
    });

    const domainMetrics: Record<string, any> = {};
    Object.entries(domains).forEach(([domain, data]) => {
      const averageScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      const successRate = (data.scores.filter(s => s >= 7.0).length / data.scores.length) * 100;
      
      domainMetrics[domain] = {
        averageScore: parseFloat(averageScore.toFixed(2)),
        testCount: data.testCount,
        successRate: parseFloat(successRate.toFixed(1))
      };
    });

    return domainMetrics;
  }

  /**
   * Extract business domain from test prompt
   */
  private extractDomain(prompt: string): string {
    if (prompt.includes('SaaS') || prompt.includes('project management')) return 'SaaS';
    if (prompt.includes('food delivery') || prompt.includes('mobile app')) return 'Mobile Apps';
    if (prompt.includes('e-commerce') || prompt.includes('Southeast Asia')) return 'E-commerce';
    if (prompt.includes('financial') || prompt.includes('subscription')) return 'Financial Services';
    if (prompt.includes('fitness') || prompt.includes('competitive')) return 'Health & Fitness';
    if (prompt.includes('coffee shop') || prompt.includes('productivity')) return 'Retail & Services';
    return 'General Business';
  }

  /**
   * Identify performance trends
   */
  private identifyTrends(overall: Record<string, number>): { strongAreas: string[], weakAreas: string[], improvementOpportunities: string[] } {
    const strongAreas: string[] = [];
    const weakAreas: string[] = [];
    const improvementOpportunities: string[] = [];

    Object.entries(overall).forEach(([metric, score]) => {
      if (score >= 8.0) {
        strongAreas.push(`${this.formatMetricName(metric)} (${score.toFixed(1)}/10)`);
      } else if (score < 6.0) {
        weakAreas.push(`${this.formatMetricName(metric)} (${score.toFixed(1)}/10)`);
      } else if (score < 7.0) {
        improvementOpportunities.push(`${this.formatMetricName(metric)} (${score.toFixed(1)}/10)`);
      }
    });

    return { strongAreas, weakAreas, improvementOpportunities };
  }

  /**
   * Format metric names for display
   */
  private formatMetricName(metric: string): string {
    return metric
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Identify improvement areas
   */
  private identifyImprovementAreas(metrics: PerformanceMetrics): ImprovementArea[] {
    const improvementAreas: ImprovementArea[] = [];
    
    Object.entries(metrics.overall).forEach(([metric, score]) => {
      if (score < 7.0) {
        const targetScore = 8.0;
        const gap = targetScore - score;
        const priority = score < 6.0 ? 'critical' : score < 6.5 ? 'high' : 'medium';
        
        improvementAreas.push({
          category: this.formatMetricName(metric),
          currentScore: score,
          targetScore,
          gap: parseFloat(gap.toFixed(1)),
          priority,
          specificActions: this.generateSpecificActions(metric, score),
          estimatedEffort: this.estimateEffort(metric, gap),
          businessImpact: this.assessBusinessImpact(metric, priority)
        });
      }
    });

    return improvementAreas.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generate specific actions for improvement
   */
  private generateSpecificActions(metric: string, score: number): string[] {
    const actions: Record<string, string[]> = {
      contextRetention: [
        'Implement conversation memory management system',
        'Add session state persistence',
        'Enhance context building algorithms'
      ],
      relevance: [
        'Improve prompt engineering',
        'Enhance domain knowledge base',
        'Add business context validation'
      ],
      coherence: [
        'Implement response structure templates',
        'Add logical flow validation',
        'Enhance content organization algorithms'
      ],
      businessInsight: [
        'Strengthen strategic thinking prompts',
        'Add business framework knowledge',
        'Implement insight quality scoring'
      ],
      continuity: [
        'Improve conversation flow management',
        'Add context transition validation',
        'Enhance follow-up question handling'
      ]
    };

    return actions[metric] || ['Review and optimize system configuration'];
  }

  /**
   * Estimate effort for improvements
   */
  private estimateEffort(metric: string, gap: number): string {
    if (gap > 2.0) return 'High (2-3 weeks)';
    if (gap > 1.0) return 'Medium (1-2 weeks)';
    return 'Low (3-5 days)';
  }

  /**
   * Assess business impact of improvements
   */
  private assessBusinessImpact(metric: string, priority: string): string {
    if (priority === 'critical') return 'High - Directly impacts user experience and business value';
    if (priority === 'high') return 'Medium-High - Significant improvement in conversation quality';
    return 'Medium - Noticeable improvement in specific areas';
  }

  /**
   * Calculate overall system score
   */
  private calculateOverallScore(overall: Record<string, number>): number {
    const scores = Object.values(overall);
    return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
  }

  /**
   * Identify critical issues
   */
  private identifyCriticalIssues(traceabilityResults: RequirementTraceabilityResult[]): string[] {
    return traceabilityResults
      .filter(r => r.status === 'failed' && r.requirement.priority === 'high')
      .map(r => `${r.requirement.id}: ${r.requirement.description} (Score: ${r.overallScore.toFixed(1)})`);
  }

  /**
   * Generate overall recommendations
   */
  private generateRecommendations(traceabilityResults: RequirementTraceabilityResult[], improvementAreas: ImprovementArea[]): string[] {
    const recommendations: string[] = [];
    
    const failedRequirements = traceabilityResults.filter(r => r.status === 'failed');
    if (failedRequirements.length > 0) {
      recommendations.push(`Address ${failedRequirements.length} failed requirements as priority`);
    }

    const criticalAreas = improvementAreas.filter(a => a.priority === 'critical');
    if (criticalAreas.length > 0) {
      recommendations.push(`Focus on ${criticalAreas.length} critical improvement areas first`);
    }

    const partialRequirements = traceabilityResults.filter(r => r.status === 'partial');
    if (partialRequirements.length > 0) {
      recommendations.push(`Improve ${partialRequirements.length} partially met requirements`);
    }

    if (recommendations.length === 0) {
      recommendations.push('System is performing well. Consider adding more complex test scenarios.');
    }

    return recommendations;
  }

  /**
   * Generate test case details
   */
  private generateTestCaseDetails(results: TestSuiteResult[]): TestCaseDetail[] {
    const details: TestCaseDetail[] = [];
    
    results.forEach(suite => {
      suite.detailedResults.forEach(result => {
        details.push({
          id: result.testId,
          name: result.prompt.substring(0, 100) + '...',
          description: result.prompt,
          businessDomain: this.extractDomain(result.prompt),
          complexity: this.assessComplexity(result.prompt),
          expectedOutcomes: this.generateExpectedOutcomes(result.prompt),
          actualResults: result.feedback,
          successCriteria: 'Score ≥ 7.0 across all metrics'
        });
      });
    });

    return details;
  }

  /**
   * Assess test complexity
   */
  private assessComplexity(prompt: string): string {
    if (prompt.includes('financial') || prompt.includes('strategic') || prompt.includes('market')) {
      return 'High';
    }
    if (prompt.includes('competitive') || prompt.includes('validation')) {
      return 'Medium';
    }
    return 'Low';
  }

  /**
   * Generate expected outcomes
   */
  private generateExpectedOutcomes(prompt: string): string[] {
    if (prompt.includes('SaaS')) {
      return ['Strategic business planning', 'Market analysis', 'Competitive positioning'];
    }
    if (prompt.includes('financial')) {
      return ['Financial modeling guidance', 'Metrics calculation', 'Strategic planning'];
    }
    if (prompt.includes('market')) {
      return ['Geographic analysis', 'Entry strategy', 'Risk assessment'];
    }
    return ['Business guidance', 'Strategic advice', 'Actionable insights'];
  }

  /**
   * Generate evaluation criteria details
   */
  private generateEvaluationCriteria(): EvaluationCriteriaDetail[] {
    return [
      {
        metric: 'Context Retention',
        description: 'Ability to remember and build upon conversation history',
        scoringMethod: 'GPT-4 evaluation of context awareness',
        weight: 1.0,
        threshold: 7.0,
        examples: {
          excellent: 'Perfect memory of all previous conversation elements',
          good: 'Good awareness of recent context',
          needsImprovement: 'Limited memory of conversation history'
        }
      },
      {
        metric: 'Response Relevance',
        description: 'Direct relevance to user questions and business context',
        scoringMethod: 'GPT-4 evaluation of question-answer alignment',
        weight: 1.0,
        threshold: 7.0,
        examples: {
          excellent: 'Perfectly addresses the specific question asked',
          good: 'Generally relevant to the business context',
          needsImprovement: 'Off-topic or inappropriate responses'
        }
      },
      {
        metric: 'Business Insight Quality',
        description: 'Depth and actionable nature of business advice',
        scoringMethod: 'GPT-4 evaluation of strategic value',
        weight: 1.0,
        threshold: 7.0,
        examples: {
          excellent: 'Exceptional strategic insights with clear actions',
          good: 'Valuable business guidance',
          needsImprovement: 'Superficial or unhelpful advice'
        }
      },
      {
        metric: 'Conversation Continuity',
        description: 'Natural flow and progression of conversation',
        scoringMethod: 'GPT-4 evaluation of conversation flow',
        weight: 1.0,
        threshold: 7.0,
        examples: {
          excellent: 'Seamless conversation progression',
          good: 'Natural conversation flow',
          needsImprovement: 'Disconnected or abrupt responses'
        }
      },
      {
        metric: 'Response Coherence',
        description: 'Logical structure and clarity of responses',
        scoringMethod: 'GPT-4 evaluation of response organization',
        weight: 1.0,
        threshold: 7.0,
        examples: {
          excellent: 'Perfectly structured and clear responses',
          good: 'Well-organized and logical',
          needsImprovement: 'Confusing or poorly structured'
        }
      }
    ];
  }

  /**
   * Generate technical specifications
   */
  private generateTechnicalSpecs(): TechnicalSpecification[] {
    return [
      {
        component: 'Conversation Evaluator',
        version: '1.0.0',
        configuration: {
          evaluationModel: 'GPT-4',
          temperature: 0,
          maxTokens: 1000
        },
        dependencies: ['@langchain/openai', '@langchain/evaluation'],
        performanceTargets: {
          evaluationTime: '< 30 seconds per response',
          accuracy: '> 90% correlation with human evaluation'
        }
      },
      {
        component: 'Test Runner',
        version: '1.0.0',
        configuration: {
          concurrentTests: 1,
          timeout: 300000,
          retryAttempts: 2
        },
        dependencies: ['tsx', 'typescript'],
        performanceTargets: {
          testExecutionTime: '< 25 minutes for full suite',
          memoryUsage: '< 500MB'
        }
      }
    ];
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report: TraceableReport): string {
    return `# 🧪 CrewAI Conversation Quality Report

## 📋 Executive Summary

**Report Generated**: ${new Date(report.executiveSummary.timestamp).toLocaleString()}
**Overall System Score**: ${report.executiveSummary.overallScore}/10
**Requirements Status**: ${report.executiveSummary.passedRequirements}/${report.executiveSummary.totalRequirements} Passed

### 🎯 Key Findings
- **Total Requirements**: ${report.executiveSummary.totalRequirements}
- **Passed Requirements**: ${report.executiveSummary.passedRequirements}
- **Failed Requirements**: ${report.executiveSummary.failedRequirements}

### 🚨 Critical Issues
${report.executiveSummary.criticalIssues.length > 0 
  ? report.executiveSummary.criticalIssues.map(issue => `- ${issue}`).join('\n')
  : '- No critical issues identified'}

### 💡 Top Recommendations
${report.executiveSummary.recommendations.map(rec => `- ${rec}`).join('\n')}

---

## 🔍 Requirement Traceability Matrix

| Req ID | Category | Description | Status | Score | Test Cases |
|---------|----------|-------------|---------|-------|------------|
${report.requirementTraceability.map(req => 
  `| ${req.requirement.id} | ${req.requirement.category} | ${req.requirement.description.substring(0, 50)}... | ${req.status.toUpperCase()} | ${req.overallScore.toFixed(1)}/10 | ${req.requirement.testCases.join(', ')} |`
).join('\n')}

---

## 📊 Detailed Requirement Analysis

${report.requirementTraceability.map(req => `
### ${req.requirement.id}: ${req.requirement.description}

**Category**: ${req.requirement.category}  
**Priority**: ${req.requirement.priority.toUpperCase()}  
**Status**: ${req.status.toUpperCase()}  
**Score**: ${req.overallScore.toFixed(1)}/10

**Success Criteria**: ${req.requirement.successCriteria}

**Test Results**:
${req.testResults.map(test => 
  `- **${test.testName}**: ${test.averageScore.toFixed(1)}/10 ${test.passed ? '✅' : '❌'}`
).join('\n')}

**Gaps Identified**:
${req.gaps.length > 0 
  ? req.gaps.map(gap => `- ${gap}`).join('\n')
  : '- No significant gaps identified'}

**Recommendations**:
${req.recommendations.map(rec => `- ${rec}`).join('\n')}
`).join('\n')}

---

## 📈 Performance Metrics

### 🎯 Overall Performance

| Metric | Score | Status |
|--------|-------|---------|
${Object.entries(report.detailedResults.performanceMetrics.overall).map(([metric, score]) => {
  const status = score >= 8.0 ? '🟢 Excellent' : score >= 7.0 ? '🟡 Good' : score >= 6.0 ? '🟠 Fair' : '🔴 Poor';
  return `| ${this.formatMetricName(metric)} | ${score.toFixed(1)}/10 | ${status} |`;
}).join('\n')}

### 🏢 Performance by Business Domain

| Domain | Average Score | Test Count | Success Rate | Status |
|--------|---------------|------------|--------------|---------|
${Object.entries(report.detailedResults.performanceMetrics.byDomain).map(([domain, metrics]) => {
  const status = metrics.averageScore >= 8.0 ? '🟢 Excellent' : metrics.averageScore >= 7.0 ? '🟡 Good' : metrics.averageScore >= 6.0 ? '🟠 Fair' : '🔴 Poor';
  return `| ${domain} | ${metrics.averageScore}/10 | ${metrics.testCount} | ${metrics.successRate}% | ${status} |`;
}).join('\n')}

### 📊 Performance Trends
**Strong Areas**:
${report.detailedResults.performanceMetrics.trends.strongAreas.length > 0 
  ? report.detailedResults.performanceMetrics.trends.strongAreas.map(area => `- ${area}`).join('\n')
  : '- None identified'}

**Areas Needing Improvement**:
${report.detailedResults.performanceMetrics.trends.weakAreas.length > 0 
  ? report.detailedResults.performanceMetrics.trends.weakAreas.map(area => `- ${area}`).join('\n')
  : '- None identified'}

**Improvement Opportunities**:
${report.detailedResults.performanceMetrics.trends.improvementOpportunities.length > 0 
  ? report.detailedResults.performanceMetrics.trends.improvementOpportunities.map(area => `- ${area}`).join('\n')
  : '- None identified'}

---

## 🚀 Improvement Roadmap

| Category | Current Score | Target Score | Gap | Priority | Effort | Business Impact |
|----------|---------------|--------------|-----|----------|---------|-----------------|
${report.detailedResults.improvementAreas.map(area => 
  `| ${area.category} | ${area.currentScore}/10 | ${area.targetScore}/10 | ${area.gap} pts | ${area.priority.toUpperCase()} | ${area.estimatedEffort} | ${area.businessImpact} |`
).join('\n')}

### 📋 Detailed Improvement Actions

${report.detailedResults.improvementAreas.map(area => `
#### ${area.category}

**Priority**: ${area.priority.toUpperCase()}  
**Gap**: ${area.gap} points  
**Estimated Effort**: ${area.estimatedEffort}  
**Business Impact**: ${area.businessImpact}

**Specific Actions**:
${area.specificActions.map(action => `- ${action}`).join('\n')}
`).join('\n')}

---

## 📋 Test Case Details

| Test ID | Business Domain | Complexity | Success Criteria | Status |
|----------|-----------------|------------|------------------|---------|
${report.appendices.testCaseDetails.map(test => {
  const status = test.actualResults.includes('PASSED') ? '✅ Passed' : test.actualResults.includes('FAILED') ? '❌ Failed' : '⚠️ Partial';
  return `| ${test.id} | ${test.businessDomain} | ${test.complexity} | ${test.successCriteria} | ${status} |`;
}).join('\n')}

### 📊 Detailed Test Results

${report.appendices.testCaseDetails.map(test => `
#### ${test.id}

**Name**: ${test.name}  
**Business Domain**: ${test.businessDomain}  
**Complexity**: ${test.complexity}  
**Success Criteria**: ${test.successCriteria}

**Expected Outcomes**:
${test.expectedOutcomes.map(outcome => `- ${outcome}`).join('\n')}

**Actual Results**: ${test.actualResults}
`).join('\n')}

---

## 📚 Evaluation Criteria

| Metric | Description | Scoring Method | Threshold | Weight |
|--------|-------------|----------------|-----------|---------|
${report.appendices.evaluationCriteria.map(criteria => 
  `| ${criteria.metric} | ${criteria.description} | ${criteria.scoringMethod} | ${criteria.threshold}/10 | ${criteria.weight} |`
).join('\n')}

### 📖 Detailed Criteria Examples

${report.appendices.evaluationCriteria.map(criteria => `
#### ${criteria.metric}

**Description**: ${criteria.description}  
**Scoring Method**: ${criteria.scoringMethod}  
**Threshold**: ${criteria.threshold}/10

**Examples**:
- **Excellent (8-10)**: ${criteria.examples.excellent}
- **Good (6-7)**: ${criteria.examples.good}
- **Needs Improvement (1-5)**: ${criteria.examples.needsImprovement}
`).join('\n')}

---

## 🔧 Technical Specifications

| Component | Version | Dependencies | Configuration | Performance Targets |
|-----------|---------|--------------|---------------|---------------------|
${report.appendices.technicalSpecs.map(spec => 
  `| ${spec.component} | ${spec.version} | ${spec.dependencies.join(', ')} | ${Object.keys(spec.configuration).length} config items | ${Object.keys(spec.performanceTargets).length} targets |`
).join('\n')}

### 🔍 Detailed Technical Specs

${report.appendices.technicalSpecs.map(spec => `
#### ${spec.component}

**Version**: ${spec.version}  
**Dependencies**: ${spec.dependencies.join(', ')}

**Configuration**:
${Object.entries(spec.configuration).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}

**Performance Targets**:
${Object.entries(spec.performanceTargets).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}
`).join('\n')}

---

## 📄 Report Metadata

- **Generated By**: CrewAI Conversation Testing Framework
- **Framework Version**: 1.0.0
- **Evaluation Model**: GPT-4
- **Total Test Cases**: ${report.detailedResults.testSuites.reduce((sum, suite) => sum + suite.totalTests, 0)}
- **Report Format**: Markdown
- **Generated**: ${new Date().toISOString()}

---

*This report provides comprehensive traceability between system requirements and test results, enabling data-driven improvement decisions for your CrewAI interface.*`;
  }

  /**
   * Save markdown report to file
   */
  saveMarkdownReport(report: TraceableReport, outputPath: string): void {
    const markdown = this.generateMarkdownReport(report);
    fs.writeFileSync(outputPath, markdown);
    console.log(`📄 Markdown report saved to: ${outputPath}`);
  }
}
