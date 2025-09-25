import { 
  EvaluatorType, 
  StringEvaluator, 
  CriteriaEvalChain,
  LabeledCriteriaEvalChain,
  Criteria,
  CriteriaEvalChainInput
} from "langchain/evaluation";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

/**
 * Conversation Evaluation Framework for CrewAI Interface
 * Tests conversation continuity, context retention, and response relevance
 */

export interface ConversationTest {
  id: string;
  initialPrompt: string;
  followUpPrompts: string[];
  expectedContexts: string[];
  expectedRelevance: string[];
  businessDomain: string;
  complexity: 'simple' | 'medium' | 'complex';
}

export interface EvaluationResult {
  testId: string;
  prompt: string;
  response: string;
  metrics: {
    contextRetention: number;
    relevance: number;
    coherence: number;
    businessInsight: number;
    continuity: number;
  };
  feedback: string;
  passed: boolean;
}

export interface TestSuiteResult {
  testSuiteId: string;
  timestamp: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageScores: {
    contextRetention: number;
    relevance: number;
    coherence: number;
    businessInsight: number;
    continuity: number;
  };
  detailedResults: EvaluationResult[];
}

export class ConversationEvaluator {
  private llm: ChatOpenAI;
  private contextEvaluator: StringEvaluator;
  private relevanceEvaluator: StringEvaluator;
  private coherenceEvaluator: StringEvaluator;
  private businessInsightEvaluator: StringEvaluator;
  private continuityEvaluator: StringEvaluator;

  constructor(apiKey: string) {
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: "gpt-4",
      temperature: 0,
    });

    this.initializeEvaluators();
  }

  private async initializeEvaluators() {
    // Context Retention Evaluator
    this.contextEvaluator = await CriteriaEvalChain.fromLLM(
      this.llm,
      {
        criteria: {
          contextRetention: "Does the response demonstrate understanding of the conversation history and previous context? Score 1-10.",
        },
      }
    );

    // Relevance Evaluator
    this.relevanceEvaluator = await CriteriaEvalChain.fromLLM(
      this.llm,
      {
        criteria: {
          relevance: "Is the response directly relevant to the user's question and the business context? Score 1-10.",
        },
      }
    );

    // Coherence Evaluator
    this.coherenceEvaluator = await CriteriaEvalChain.fromLLM(
      this.llm,
      {
        criteria: {
          coherence: "Is the response logically coherent and well-structured? Score 1-10.",
        },
      }
    );

    // Business Insight Evaluator
    this.businessInsightEvaluator = await CriteriaEvalChain.fromLLM(
      this.llm,
      {
        criteria: {
          businessInsight: "Does the response provide valuable business insights and actionable advice? Score 1-10.",
        },
      }
    );

    // Continuity Evaluator
    this.continuityEvaluator = await CriteriaEvalChain.fromLLM(
      this.llm,
      {
        criteria: {
          continuity: "Does the response build upon previous responses and maintain conversation flow? Score 1-10.",
        },
      }
    );
  }

  /**
   * Run a complete conversation test suite
   */
  async runTestSuite(
    testSuite: ConversationTest[],
    apiEndpoint: string
  ): Promise<TestSuiteResult> {
    const detailedResults: EvaluationResult[] = [];
    let passedTests = 0;
    let failedTests = 0;

    for (const test of testSuite) {
      console.log(`🧪 Running test: ${test.id}`);
      
      try {
        const result = await this.runSingleTest(test, apiEndpoint);
        detailedResults.push(result);
        
        if (result.passed) {
          passedTests++;
        } else {
          failedTests++;
        }
      } catch (error) {
        console.error(`❌ Test ${test.id} failed with error:`, error);
        failedTests++;
      }
    }

    // Calculate average scores
    const averageScores = this.calculateAverageScores(detailedResults);

    return {
      testSuiteId: `test_suite_${Date.now()}`,
      timestamp: new Date(),
      totalTests: testSuite.length,
      passedTests,
      failedTests,
      averageScores,
      detailedResults,
    };
  }

  /**
   * Run a single conversation test
   */
  private async runSingleTest(
    test: ConversationTest,
    apiEndpoint: string
  ): Promise<EvaluationResult> {
    const conversationHistory: Array<HumanMessage | AIMessage> = [];
    let currentContext = "";
    let previousResponse = "";

    // Initial prompt
    console.log(`📝 Initial prompt: ${test.initialPrompt}`);
    const initialResponse = await this.sendPrompt(test.initialPrompt, apiEndpoint);
    conversationHistory.push(new HumanMessage(test.initialPrompt));
    conversationHistory.push(new AIMessage(initialResponse));
    previousResponse = initialResponse;

    // Evaluate initial response
    const initialEvaluation = await this.evaluateResponse(
      test.initialPrompt,
      initialResponse,
      "",
      test.expectedContexts[0] || "",
      test.expectedRelevance[0] || ""
    );

    const results: EvaluationResult[] = [initialEvaluation];

    // Follow-up prompts
    for (let i = 0; i < test.followUpPrompts.length; i++) {
      const followUpPrompt = test.followUpPrompts[i];
      console.log(`🔄 Follow-up ${i + 1}: ${followUpPrompt}`);
      
      // Build context from conversation history
      currentContext = this.buildContextString(conversationHistory);
      
      // Send follow-up with context
      const followUpResponse = await this.sendPromptWithContext(
        followUpPrompt,
        currentContext,
        apiEndpoint
      );
      
      conversationHistory.push(new HumanMessage(followUpPrompt));
      conversationHistory.push(new AIMessage(followUpResponse));
      
      // Evaluate follow-up response
      const followUpEvaluation = await this.evaluateResponse(
        followUpPrompt,
        followUpResponse,
        previousResponse,
        test.expectedContexts[i + 1] || "",
        test.expectedRelevance[i + 1] || ""
      );
      
      results.push(followUpEvaluation);
      previousResponse = followUpResponse;
    }

    // Aggregate results for this test
    const aggregatedResult = this.aggregateTestResults(test.id, results);
    
    return aggregatedResult;
  }

  /**
   * Send a prompt to the CrewAI API
   */
  private async sendPrompt(prompt: string, apiEndpoint: string): Promise<string> {
    try {
      const response = await fetch(`${apiEndpoint}/api/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: prompt,
          sessionContext: {
            recentMessages: [],
            sessionSummary: '',
            userPreferences: [],
            marketInsights: [],
            currentPhase: 'testing'
          },
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.response || data.message || 'No response received';
    } catch (error) {
      console.error('Error sending prompt:', error);
      return 'Error: Failed to get response from API';
    }
  }

  /**
   * Send a prompt with conversation context
   */
  private async sendPromptWithContext(
    prompt: string,
    context: string,
    apiEndpoint: string
  ): Promise<string> {
    try {
      const response = await fetch(`${apiEndpoint}/api/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: prompt,
          sessionContext: {
            recentMessages: [context],
            sessionSummary: context,
            userPreferences: [],
            marketInsights: [],
            currentPhase: 'testing'
          },
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.response || data.message || 'No response received';
    } catch (error) {
      console.error('Error sending prompt with context:', error);
      return 'Error: Failed to get response from API';
    }
  }

  /**
   * Evaluate a single response using multiple criteria
   */
  private async evaluateResponse(
    prompt: string,
    response: string,
    previousResponse: string,
    expectedContext: string,
    expectedRelevance: string
  ): Promise<EvaluationResult> {
    const contextScore = await this.evaluateContextRetention(
      prompt,
      response,
      previousResponse
    );
    
    const relevanceScore = await this.evaluateRelevance(
      prompt,
      response,
      expectedRelevance
    );
    
    const coherenceScore = await this.evaluateCoherence(response);
    const businessInsightScore = await this.evaluateBusinessInsight(response);
    const continuityScore = await this.evaluateContinuity(
      prompt,
      response,
      previousResponse
    );

    const metrics = {
      contextRetention: contextScore,
      relevance: relevanceScore,
      coherence: coherenceScore,
      businessInsight: businessInsightScore,
      continuity: continuityScore,
    };

    const averageScore = Object.values(metrics).reduce((a, b) => a + b, 0) / 5;
    const passed = averageScore >= 7.0; // Pass threshold: 7/10

    const feedback = this.generateFeedback(metrics, passed);

    return {
      testId: `eval_${Date.now()}`,
      prompt,
      response,
      metrics,
      feedback,
      passed,
    };
  }

  /**
   * Evaluate context retention
   */
  private async evaluateContextRetention(
    prompt: string,
    response: string,
    previousResponse: string
  ): Promise<number> {
    try {
      const result = await this.contextEvaluator.evaluateStrings({
        prediction: response,
        input: `Prompt: ${prompt}\nPrevious Response: ${previousResponse}`,
      });
      
      return this.extractScore(result.score || "0");
    } catch (error) {
      console.error('Context evaluation error:', error);
      return 5; // Default score on error
    }
  }

  /**
   * Evaluate relevance
   */
  private async evaluateRelevance(
    prompt: string,
    response: string,
    expectedRelevance: string
  ): Promise<number> {
    try {
      const result = await this.relevanceEvaluator.evaluateStrings({
        prediction: response,
        input: `Prompt: ${prompt}\nExpected Focus: ${expectedRelevance}`,
      });
      
      return this.extractScore(result.score || "0");
    } catch (error) {
      console.error('Relevance evaluation error:', error);
      return 5; // Default score on error
    }
  }

  /**
   * Evaluate coherence
   */
  private async evaluateCoherence(response: string): Promise<number> {
    try {
      const result = await this.coherenceEvaluator.evaluateStrings({
        prediction: response,
        input: "Evaluate the logical coherence of this response",
      });
      
      return this.extractScore(result.score || "0");
    } catch (error) {
      console.error('Coherence evaluation error:', error);
      return 5; // Default score on error
    }
  }

  /**
   * Evaluate business insight quality
   */
  private async evaluateBusinessInsight(response: string): Promise<number> {
    try {
      const result = await this.businessInsightEvaluator.evaluateStrings({
        prediction: response,
        input: "Evaluate the business insight quality of this response",
      });
      
      return this.extractScore(result.score || "0");
    } catch (error) {
      console.error('Business insight evaluation error:', error);
      return 5; // Default score on error
    }
  }

  /**
   * Evaluate conversation continuity
   */
  private async evaluateContinuity(
    prompt: string,
    response: string,
    previousResponse: string
  ): Promise<number> {
    try {
      const result = await this.continuityEvaluator.evaluateStrings({
        prediction: response,
        input: `Current Prompt: ${prompt}\nPrevious Response: ${previousResponse}`,
      });
      
      return this.extractScore(result.score || "0");
    } catch (error) {
      console.error('Continuity evaluation error:', error);
      return 5; // Default score on error
    }
  }

  /**
   * Extract numeric score from evaluation result
   */
  private extractScore(score: string | number): number {
    if (typeof score === 'number') return score;
    
    const match = score.toString().match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 5;
  }

  /**
   * Build context string from conversation history
   */
  private buildContextString(history: Array<HumanMessage | AIMessage>): string {
    return history
      .map(msg => `${msg._getType() === 'human' ? 'User' : 'AI'}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Aggregate results from multiple evaluations in a test
   */
  private aggregateTestResults(
    testId: string,
    results: EvaluationResult[]
  ): EvaluationResult {
    const avgMetrics = {
      contextRetention: results.reduce((sum, r) => sum + r.metrics.contextRetention, 0) / results.length,
      relevance: results.reduce((sum, r) => sum + r.metrics.relevance, 0) / results.length,
      coherence: results.reduce((sum, r) => sum + r.metrics.coherence, 0) / results.length,
      businessInsight: results.reduce((sum, r) => sum + r.metrics.businessInsight, 0) / results.length,
      continuity: results.reduce((sum, r) => sum + r.metrics.continuity, 0) / results.length,
    };

    const overallScore = Object.values(avgMetrics).reduce((a, b) => a + b, 0) / 5;
    const passed = overallScore >= 7.0;

    return {
      testId,
      prompt: `Test: ${testId} (${results.length} evaluations)`,
      response: `Aggregated results from ${results.length} conversation turns`,
      metrics: avgMetrics,
      feedback: `Overall test score: ${overallScore.toFixed(2)}/10. ${passed ? 'PASSED' : 'FAILED'}`,
      passed,
    };
  }

  /**
   * Calculate average scores across all tests
   */
  private calculateAverageScores(results: EvaluationResult[]) {
    if (results.length === 0) {
      return {
        contextRetention: 0,
        relevance: 0,
        coherence: 0,
        businessInsight: 0,
        continuity: 0,
      };
    }

    return {
      contextRetention: results.reduce((sum, r) => sum + r.metrics.contextRetention, 0) / results.length,
      relevance: results.reduce((sum, r) => sum + r.metrics.relevance, 0) / results.length,
      coherence: results.reduce((sum, r) => sum + r.metrics.coherence, 0) / results.length,
      businessInsight: results.reduce((sum, r) => sum + r.metrics.businessInsight, 0) / results.length,
      continuity: results.reduce((sum, r) => sum + r.metrics.continuity, 0) / results.length,
    };
  }

  /**
   * Generate feedback based on evaluation metrics
   */
  private generateFeedback(metrics: any, passed: boolean): string {
    const feedbacks = [];
    
    if (metrics.contextRetention < 6) {
      feedbacks.push("Context retention needs improvement");
    }
    if (metrics.relevance < 6) {
      feedbacks.push("Response relevance could be better");
    }
    if (metrics.coherence < 6) {
      feedbacks.push("Response coherence needs work");
    }
    if (metrics.businessInsight < 6) {
      feedbacks.push("Business insights could be stronger");
    }
    if (metrics.continuity < 6) {
      feedbacks.push("Conversation continuity needs improvement");
    }

    if (feedbacks.length === 0) {
      return "All metrics are performing well!";
    }

    return feedbacks.join(". ") + ".";
  }
}
