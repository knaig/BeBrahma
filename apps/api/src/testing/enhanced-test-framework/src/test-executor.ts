import { TestSuite, TestResults, TestResult, ConversationFlow } from './types';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

export class TestExecutor {
  private config: any;
  private openaiApiKey: string;
  private crewaiEndpoint: string;

  constructor(config: any) {
    this.config = config;
    this.openaiApiKey = config.openaiApiKey;
    this.crewaiEndpoint = config.crewaiEndpoint;
  }

  async executeTestSuites(testSuites: TestSuite[]): Promise<TestResults> {
    console.log(chalk.blue(`🧪 Executing ${testSuites.length} test suites...`));
    
    const startTime = Date.now();
    const allResults: TestResult[] = [];
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;

    // Execute test suites
    for (const suite of testSuites) {
      console.log(chalk.cyan(`\n📋 Executing: ${suite.name}`));
      console.log(chalk.gray(`   Priority: ${suite.priority}, Estimated Duration: ${suite.estimatedDuration} minutes`));
      
      const suiteResults = await this.executeTestSuite(suite);
      allResults.push(...suiteResults);
      
      // Update counters
      for (const result of suiteResults) {
        totalTests++;
        if (result.status === 'passed') passedTests++;
        else if (result.status === 'failed') failedTests++;
        else skippedTests++;
      }
    }

    const executionTime = Date.now() - startTime;
    
    // Calculate overall scores
    const scores = this.calculateOverallScores(allResults);
    
    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(allResults, executionTime);

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      executionTime,
      scores,
      detailedResults: allResults,
      performanceMetrics
    };
  }

  private async executeTestSuite(suite: TestSuite): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    for (const flow of suite.conversationFlows) {
      const spinner = ora(`Testing: ${flow.name}`).start();
      
      try {
        const result = await this.executeConversationFlow(flow);
        results.push(result);
        
        if (result.status === 'passed') {
          spinner.succeed(`✅ ${flow.name} - Passed (${result.scores.averageScore.toFixed(1)}/10)`);
        } else {
          spinner.fail(`❌ ${flow.name} - Failed (${result.scores.averageScore.toFixed(1)}/10)`);
        }
      } catch (error) {
        const failedResult: TestResult = {
          testId: flow.id,
          conversationFlow: flow,
          status: 'failed',
          scores: {
            contextRetention: 0,
            responseRelevance: 0,
            conversationContinuity: 0,
            businessInsightQuality: 0,
            responseCoherence: 0,
            averageScore: 0
          },
          feedback: [`Execution error: ${error.message}`],
          recommendations: ['Check system connectivity and configuration'],
          executionTime: 0,
          errorMessage: error.message
        };
        
        results.push(failedResult);
        spinner.fail(`❌ ${flow.name} - Error: ${error.message}`);
      }
    }
    
    return results;
  }

  private async executeConversationFlow(flow: ConversationFlow): Promise<TestResult> {
    const startTime = Date.now();
    const conversationHistory: string[] = [];
    
    try {
      // Execute initial prompt
      const initialResponse = await this.sendPrompt(flow.initialPrompt);
      conversationHistory.push(`User: ${flow.initialPrompt}`);
      conversationHistory.push(`AI: ${initialResponse}`);
      
      // Execute follow-up prompts
      for (const followUp of flow.followUpPrompts) {
        const followUpResponse = await this.sendPrompt(followUp, conversationHistory);
        conversationHistory.push(`User: ${followUp}`);
        conversationHistory.push(`AI: ${followUpResponse}`);
      }
      
      // Evaluate the conversation
      const evaluation = await this.evaluateConversation(flow, conversationHistory);
      
      const executionTime = Date.now() - startTime;
      
      // Determine test status based on scores
      const averageScore = evaluation.averageScore;
      const status = averageScore >= 7.0 ? 'passed' : 'failed';
      
      return {
        testId: flow.id,
        conversationFlow: flow,
        status,
        scores: evaluation,
        feedback: evaluation.feedback || [],
        recommendations: evaluation.recommendations || [],
        executionTime
      };
      
    } catch (error) {
      throw new Error(`Failed to execute conversation flow: ${error.message}`);
    }
  }

  private async sendPrompt(prompt: string, conversationHistory?: string[]): Promise<string> {
    try {
      // Prepare the full conversation context
      let fullPrompt = prompt;
      if (conversationHistory && conversationHistory.length > 0) {
        fullPrompt = `Previous conversation:\n${conversationHistory.join('\n')}\n\nCurrent question: ${prompt}`;
      }
      
      // Send to CrewAI endpoint
      const response = await axios.post(
        `${this.crewaiEndpoint}/chat`,
        {
          message: fullPrompt,
          context: conversationHistory || []
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          },
          timeout: this.config.testTimeout
        }
      );
      
      return response.data.response || response.data.message || 'No response received';
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('CrewAI service is not running. Please start the service first.');
      }
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Check your API key.');
      }
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before retrying.');
      }
      
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  private async evaluateConversation(flow: ConversationFlow, conversationHistory: string[]): Promise<any> {
    try {
      // Use OpenAI to evaluate the conversation quality
      const evaluationPrompt = this.createEvaluationPrompt(flow, conversationHistory);
      
      const evaluationResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert evaluator of AI conversation quality. Rate conversations on a 1-10 scale for each metric.'
            },
            {
              role: 'user',
              content: evaluationPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      const evaluationText = evaluationResponse.data.choices[0].message.content;
      return this.parseEvaluationResponse(evaluationText);
      
    } catch (error) {
      console.log(chalk.yellow(`⚠️  OpenAI evaluation failed, using fallback: ${error.message}`));
      return this.fallbackEvaluation(flow, conversationHistory);
    }
  }

  private createEvaluationPrompt(flow: ConversationFlow, conversationHistory: string[]): string {
    const conversationText = conversationHistory.join('\n');
    
    return `Please evaluate the following AI conversation based on these criteria:

Conversation Flow: ${flow.name}
Business Domain: ${flow.businessDomain}
User Persona: ${flow.userPersona.name} (${flow.userPersona.expertise} level, ${flow.userPersona.industry})

Expected Contexts: ${flow.expectedContexts.join(', ')}
Expected Relevance: ${flow.expectedRelevance.join(', ')}

Conversation:
${conversationText}

Please rate each metric on a 1-10 scale and provide brief feedback:

1. Context Retention (1-10): How well does the AI remember and build upon previous conversation elements?
2. Response Relevance (1-10): How relevant are the responses to the user's questions and business context?
3. Conversation Continuity (1-10): How natural and logical is the conversation flow?
4. Business Insight Quality (1-10): How valuable and actionable are the business insights provided?
5. Response Coherence (1-10): How clear, structured, and logical are the individual responses?

Provide your response in this exact format:
Context Retention: [score]/10 - [brief feedback]
Response Relevance: [score]/10 - [brief feedback]
Conversation Continuity: [score]/10 - [brief feedback]
Business Insight Quality: [score]/10 - [brief feedback]
Response Coherence: [score]/10 - [brief feedback]

Overall Assessment: [brief summary of strengths and areas for improvement]`;
  }

  private parseEvaluationResponse(evaluationText: string): any {
    try {
      const lines = evaluationText.split('\n').filter(line => line.trim());
      const scores: any = {};
      const feedback: string[] = [];
      
      for (const line of lines) {
        if (line.includes(':')) {
          const [metric, rest] = line.split(':').map(s => s.trim());
          const scoreMatch = rest.match(/(\d+)\/10/);
          
          if (scoreMatch) {
            const score = parseInt(scoreMatch[1]);
            const feedbackText = rest.replace(/\d+\/10\s*-\s*/, '').trim();
            
            switch (metric.toLowerCase()) {
              case 'context retention':
                scores.contextRetention = score;
                break;
              case 'response relevance':
                scores.responseRelevance = score;
                break;
              case 'conversation continuity':
                scores.conversationContinuity = score;
                break;
              case 'business insight quality':
                scores.businessInsightQuality = score;
                break;
              case 'response coherence':
                scores.responseCoherence = score;
                break;
            }
            
            if (feedbackText) {
              feedback.push(`${metric}: ${feedbackText}`);
            }
          }
        }
      }
      
      // Calculate average score
      const scoreValues = Object.values(scores).filter(v => typeof v === 'number');
      const averageScore = scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : 0;
      
      return {
        ...scores,
        averageScore,
        feedback,
        recommendations: this.generateRecommendations(scores, averageScore)
      };
      
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Failed to parse evaluation response: ${error.message}`));
      return this.fallbackEvaluation(null, []);
    }
  }

  private fallbackEvaluation(flow: ConversationFlow | null, conversationHistory: string[]): any {
    // Simple fallback evaluation based on conversation length and structure
    const totalLength = conversationHistory.join(' ').length;
    const responseCount = conversationHistory.filter(line => line.startsWith('AI:')).length;
    
    let baseScore = 5; // Base score
    
    if (totalLength > 1000) baseScore += 1; // Detailed conversation
    if (totalLength > 2000) baseScore += 1; // Very detailed
    if (responseCount >= 3) baseScore += 1; // Multiple responses
    if (responseCount >= 5) baseScore += 1; // Extended conversation
    
    return {
      contextRetention: baseScore,
      responseRelevance: baseScore,
      conversationContinuity: baseScore,
      businessInsightQuality: baseScore,
      responseCoherence: baseScore,
      averageScore: baseScore,
      feedback: ['Fallback evaluation used due to OpenAI evaluation failure'],
      recommendations: ['Improve OpenAI API connectivity for better evaluation']
    };
  }

  private generateRecommendations(scores: any, averageScore: number): string[] {
    const recommendations: string[] = [];
    
    if (scores.contextRetention < 7) {
      recommendations.push('Improve context memory and conversation continuity');
    }
    
    if (scores.responseRelevance < 7) {
      recommendations.push('Enhance business domain expertise and relevance');
    }
    
    if (scores.conversationContinuity < 7) {
      recommendations.push('Improve natural conversation flow and transitions');
    }
    
    if (scores.businessInsightQuality < 7) {
      recommendations.push('Strengthen business analysis and strategic thinking');
    }
    
    if (scores.responseCoherence < 7) {
      recommendations.push('Improve response structure and logical organization');
    }
    
    if (averageScore < 7) {
      recommendations.push('Focus on overall conversation quality improvement');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Maintain current high-quality performance');
    }
    
    return recommendations;
  }

  private calculateOverallScores(results: TestResult[]): any {
    if (results.length === 0) {
      return {
        contextRetention: 0,
        responseRelevance: 0,
        conversationContinuity: 0,
        businessInsightQuality: 0,
        responseCoherence: 0,
        overallScore: 0
      };
    }
    
    const totalScores = results.reduce((acc, result) => ({
      contextRetention: acc.contextRetention + result.scores.contextRetention,
      responseRelevance: acc.responseRelevance + result.scores.responseRelevance,
      conversationContinuity: acc.conversationContinuity + result.scores.conversationContinuity,
      businessInsightQuality: acc.businessInsightQuality + result.scores.businessInsightQuality,
      responseCoherence: acc.responseCoherence + result.scores.responseCoherence
    }), {
      contextRetention: 0,
      responseRelevance: 0,
      conversationContinuity: 0,
      businessInsightQuality: 0,
      responseCoherence: 0
    });
    
    const count = results.length;
    
    return {
      contextRetention: totalScores.contextRetention / count,
      responseRelevance: totalScores.responseRelevance / count,
      conversationContinuity: totalScores.conversationContinuity / count,
      businessInsightQuality: totalScores.businessInsightQuality / count,
      responseCoherence: totalScores.responseCoherence / count,
      overallScore: (totalScores.contextRetention + totalScores.responseRelevance + 
                     totalScores.conversationContinuity + totalScores.businessInsightQuality + 
                     totalScores.responseCoherence) / (count * 5)
    };
  }

  private calculatePerformanceMetrics(results: TestResult[], totalExecutionTime: number): any {
    const successfulResults = results.filter(r => r.status === 'passed');
    const failedResults = results.filter(r => r.status === 'failed');
    
    const averageResponseTime = successfulResults.length > 0 
      ? successfulResults.reduce((sum, r) => sum + r.executionTime, 0) / successfulResults.length 
      : 0;
    
    const errorRate = results.length > 0 ? (failedResults.length / results.length) * 100 : 0;
    
    // Estimate API call count (1 call per prompt + follow-ups)
    const apiCallCount = results.reduce((sum, r) => {
      return sum + 1 + r.conversationFlow.followUpPrompts.length;
    }, 0);
    
    return {
      averageResponseTime,
      memoryUsage: 0, // Would need system monitoring to get actual values
      cpuUsage: 0,    // Would need system monitoring to get actual values
      apiCallCount,
      errorRate
    };
  }
}
