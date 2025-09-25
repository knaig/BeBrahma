import { ConversationEvaluator, ConversationTest, TestSuiteResult } from './conversation-evaluator';

/**
 * Test Runner for CrewAI Conversation Evaluation
 * Executes predefined test suites and generates reports
 */

export class TestRunner {
  private evaluator: ConversationEvaluator;
  private apiEndpoint: string;

  constructor(openaiApiKey: string, apiEndpoint: string) {
    this.evaluator = new ConversationEvaluator(openaiApiKey);
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Run all predefined test suites
   */
  async runAllTests(): Promise<TestSuiteResult[]> {
    console.log('🚀 Starting CrewAI Conversation Evaluation Tests...\n');
    
    const testSuites = this.getTestSuites();
    const results: TestSuiteResult[] = [];

    for (const [suiteName, tests] of Object.entries(testSuites)) {
      console.log(`📋 Running Test Suite: ${suiteName}`);
      console.log(`📊 Tests in suite: ${tests.length}\n`);
      
      try {
        const result = await this.evaluator.runTestSuite(tests, this.apiEndpoint);
        results.push(result);
        
        this.printSuiteResults(suiteName, result);
      } catch (error) {
        console.error(`❌ Test suite ${suiteName} failed:`, error);
      }
      
      console.log('\n' + '='.repeat(80) + '\n');
    }

    this.printOverallResults(results);
    return results;
  }

  /**
   * Run a specific test suite
   */
  async runTestSuite(suiteName: string): Promise<TestSuiteResult | null> {
    const testSuites = this.getTestSuites();
    const tests = testSuites[suiteName];
    
    if (!tests) {
      console.error(`❌ Test suite '${suiteName}' not found`);
      return null;
    }

    console.log(`📋 Running Test Suite: ${suiteName}`);
    console.log(`📊 Tests in suite: ${tests.length}\n`);
    
    try {
      const result = await this.evaluator.runTestSuite(tests, this.apiEndpoint);
      this.printSuiteResults(suiteName, result);
      return result;
    } catch (error) {
      console.error(`❌ Test suite ${suiteName} failed:`, error);
      return null;
    }
  }

  /**
   * Get predefined test suites
   */
  private getTestSuites(): Record<string, ConversationTest[]> {
    return {
      'Business Strategy': this.getBusinessStrategyTests(),
      'Market Research': this.getMarketResearchTests(),
      'Financial Analysis': this.getFinancialAnalysisTests(),
      'Competitive Intelligence': this.getCompetitiveIntelligenceTests(),
      'Context Continuity': this.getContextContinuityTests(),
    };
  }

  /**
   * Business Strategy Test Cases
   */
  private getBusinessStrategyTests(): ConversationTest[] {
    return [
      {
        id: 'strategy_1',
        initialPrompt: 'I want to start a SaaS company in the project management space. What should I consider?',
        followUpPrompts: [
          'What pricing strategy would work best for this market?',
          'How should I differentiate from existing players like Asana and Monday.com?',
          'What are the key metrics I should track in the first year?'
        ],
        expectedContexts: [
          'Business model considerations for SaaS project management',
          'Pricing strategy for project management SaaS',
          'Competitive differentiation strategy',
          'Key performance indicators for SaaS startups'
        ],
        expectedRelevance: [
          'Strategic business planning',
          'Pricing and monetization',
          'Competitive positioning',
          'Performance measurement'
        ],
        businessDomain: 'SaaS',
        complexity: 'complex'
      },
      {
        id: 'strategy_2',
        initialPrompt: 'I have a mobile app idea for food delivery. How do I validate this market?',
        followUpPrompts: [
          'What customer segments should I target first?',
          'How can I test this with minimal investment?',
          'What partnerships would accelerate growth?'
        ],
        expectedContexts: [
          'Market validation strategies for food delivery',
          'Customer segmentation for mobile apps',
          'Lean startup methodology',
          'Strategic partnerships in food delivery'
        ],
        expectedRelevance: [
          'Market research and validation',
          'Customer targeting',
          'Cost-effective testing',
          'Growth acceleration'
        ],
        businessDomain: 'Food Delivery',
        complexity: 'medium'
      }
    ];
  }

  /**
   * Market Research Test Cases
   */
  private getMarketResearchTests(): ConversationTest[] {
    return [
      {
        id: 'research_1',
        initialPrompt: 'I want to understand the e-commerce market in Southeast Asia. What should I research?',
        followUpPrompts: [
          'Which countries have the highest growth potential?',
          'What are the main challenges for foreign companies?',
          'How do payment preferences vary by country?'
        ],
        expectedContexts: [
          'E-commerce market analysis in Southeast Asia',
          'Country-specific growth analysis',
          'Market entry challenges',
          'Payment infrastructure analysis'
        ],
        expectedRelevance: [
          'Geographic market analysis',
          'Risk assessment',
          'Local market understanding',
          'Operational considerations'
        ],
        businessDomain: 'E-commerce',
        complexity: 'complex'
      }
    ];
  }

  /**
   * Financial Analysis Test Cases
   */
  private getFinancialAnalysisTests(): ConversationTest[] {
    return [
      {
        id: 'financial_1',
        initialPrompt: 'I need to create a financial model for a subscription business. What should I include?',
        followUpPrompts: [
          'How do I calculate customer lifetime value?',
          'What are the key assumptions I should model?',
          'How do I project cash flow for the first 3 years?'
        ],
        expectedContexts: [
          'Financial modeling for subscription businesses',
          'Customer lifetime value calculation',
          'Financial modeling assumptions',
          'Cash flow projection methodology'
        ],
        expectedRelevance: [
          'Financial planning',
          'Customer metrics',
          'Modeling best practices',
          'Cash flow management'
        ],
        businessDomain: 'Subscription Business',
        complexity: 'complex'
      }
    ];
  }

  /**
   * Competitive Intelligence Test Cases
   */
  private getCompetitiveIntelligenceTests(): ConversationTest[] {
    return [
      {
        id: 'competitive_1',
        initialPrompt: 'I want to analyze my competitors in the fitness app market. How should I approach this?',
        followUpPrompts: [
          'What competitive advantages should I focus on?',
          'How do I identify market gaps?',
          'What pricing strategies are my competitors using?'
        ],
        expectedContexts: [
          'Competitive analysis methodology for fitness apps',
          'Competitive advantage identification',
          'Market gap analysis',
          'Competitive pricing analysis'
        ],
        expectedRelevance: [
          'Competitive strategy',
          'Market opportunity identification',
          'Strategic positioning',
          'Pricing strategy'
        ],
        businessDomain: 'Fitness Technology',
        complexity: 'medium'
      }
    ];
  }

  /**
   * Context Continuity Test Cases
   */
  private getContextContinuityTests(): ConversationTest[] {
    return [
      {
        id: 'continuity_1',
        initialPrompt: 'I want to start a coffee shop. What are the key considerations?',
        followUpPrompts: [
          'What about location selection?',
          'How does this affect my menu planning?',
          'What staffing considerations should I keep in mind?'
        ],
        expectedContexts: [
          'Coffee shop business planning',
          'Location strategy for coffee shops',
          'Menu planning based on location',
          'Staffing strategy for coffee shops'
        ],
        expectedRelevance: [
          'Business planning',
          'Location strategy',
          'Operational planning',
          'Human resources'
        ],
        businessDomain: 'Food & Beverage',
        complexity: 'medium'
      },
      {
        id: 'continuity_2',
        initialPrompt: 'I have an idea for a productivity app. How do I validate this?',
        followUpPrompts: [
          'What user research methods should I use?',
          'How do I build a minimum viable product?',
          'What feedback collection methods work best?'
        ],
        expectedContexts: [
          'Productivity app validation',
          'User research methodology',
          'MVP development approach',
          'Feedback collection strategies'
        ],
        expectedRelevance: [
          'Product validation',
          'User research',
          'Product development',
          'User feedback'
        ],
        businessDomain: 'Productivity Software',
        complexity: 'medium'
      }
    ];
  }

  /**
   * Print results for a specific test suite
   */
  private printSuiteResults(suiteName: string, result: TestSuiteResult): void {
    console.log(`📊 Test Suite Results: ${suiteName}`);
    console.log(`✅ Passed: ${result.passedTests}`);
    console.log(`❌ Failed: ${result.failedTests}`);
    console.log(`📈 Success Rate: ${((result.passedTests / result.totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📊 Average Scores:');
    console.log(`  🧠 Context Retention: ${result.averageScores.contextRetention.toFixed(2)}/10`);
    console.log(`  🎯 Relevance: ${result.averageScores.relevance.toFixed(2)}/10`);
    console.log(`  🔗 Coherence: ${result.averageScores.coherence.toFixed(2)}/10`);
    console.log(`  💡 Business Insight: ${result.averageScores.businessInsight.toFixed(2)}/10`);
    console.log(`  🔄 Continuity: ${result.averageScores.continuity.toFixed(2)}/10`);
    
    if (result.failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      result.detailedResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.prompt}: ${r.feedback}`);
        });
    }
  }

  /**
   * Print overall results across all test suites
   */
  private printOverallResults(results: TestSuiteResult[]): void {
    console.log('🎯 OVERALL TEST RESULTS');
    console.log('='.repeat(50));
    
    const totalTests = results.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passedTests, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failedTests, 0);
    
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Total Passed: ${totalPassed}`);
    console.log(`❌ Total Failed: ${totalFailed}`);
    console.log(`📈 Overall Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    
    // Calculate overall averages
    const overallAverages = {
      contextRetention: results.reduce((sum, r) => sum + r.averageScores.contextRetention, 0) / results.length,
      relevance: results.reduce((sum, r) => sum + r.averageScores.relevance, 0) / results.length,
      coherence: results.reduce((sum, r) => sum + r.averageScores.coherence, 0) / results.length,
      businessInsight: results.reduce((sum, r) => sum + r.averageScores.businessInsight, 0) / results.length,
      continuity: results.reduce((sum, r) => sum + r.averageScores.continuity, 0) / results.length,
    };
    
    console.log('\n📊 Overall Average Scores:');
    console.log(`  🧠 Context Retention: ${overallAverages.contextRetention.toFixed(2)}/10`);
    console.log(`  🎯 Relevance: ${overallAverages.relevance.toFixed(2)}/10`);
    console.log(`  🔗 Coherence: ${overallAverages.coherence.toFixed(2)}/10`);
    console.log(`  💡 Business Insight: ${overallAverages.businessInsight.toFixed(2)}/10`);
    console.log(`  🔄 Continuity: ${overallAverages.continuity.toFixed(2)}/10`);
    
    // Performance summary
    if (overallAverages.contextRetention >= 8 && overallAverages.continuity >= 8) {
      console.log('\n🎉 EXCELLENT: Context retention and conversation continuity are performing exceptionally well!');
    } else if (overallAverages.contextRetention >= 7 && overallAverages.continuity >= 7) {
      console.log('\n✅ GOOD: Context retention and conversation continuity are performing well.');
    } else {
      console.log('\n⚠️  NEEDS IMPROVEMENT: Context retention and conversation continuity need attention.');
    }
  }

  /**
   * Generate a detailed report in JSON format
   */
  generateReport(results: TestSuiteResult[]): string {
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        totalTestSuites: results.length,
        totalTests: results.reduce((sum, r) => sum + r.totalTests, 0),
        totalPassed: results.reduce((sum, r) => sum + r.passedTests, 0),
        totalFailed: results.reduce((sum, r) => sum + r.failedTests, 0),
        overallSuccessRate: ((results.reduce((sum, r) => sum + r.passedTests, 0) / 
                            results.reduce((sum, r) => sum + r.totalTests, 0)) * 100).toFixed(1)
      },
      detailedResults: results,
      recommendations: this.generateRecommendations(results)
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(results: TestSuiteResult[]): string[] {
    const recommendations: string[] = [];
    
    // Analyze context retention
    const avgContextRetention = results.reduce((sum, r) => sum + r.averageScores.contextRetention, 0) / results.length;
    if (avgContextRetention < 7) {
      recommendations.push('Improve context retention by enhancing conversation memory management');
    }
    
    // Analyze continuity
    const avgContinuity = results.reduce((sum, r) => sum + r.averageScores.continuity, 0) / results.length;
    if (avgContinuity < 7) {
      recommendations.push('Enhance conversation continuity by improving session state management');
    }
    
    // Analyze business insight
    const avgBusinessInsight = results.reduce((sum, r) => sum + r.averageScores.businessInsight, 0) / results.length;
    if (avgBusinessInsight < 7) {
      recommendations.push('Strengthen business insight generation by improving prompt engineering');
    }
    
    // Overall recommendations
    if (recommendations.length === 0) {
      recommendations.push('All systems are performing well. Consider adding more complex test scenarios.');
    }
    
    return recommendations;
  }
}
