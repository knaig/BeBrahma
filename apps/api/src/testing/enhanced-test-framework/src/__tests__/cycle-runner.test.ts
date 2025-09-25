import { CycleRunner } from '../cycle-runner';
import { TestConfiguration } from '../types';
import { createMockTestCycle } from '../setup';

describe('CycleRunner', () => {
  let cycleRunner: CycleRunner;
  let mockConfig: TestConfiguration;

  beforeEach(() => {
    mockConfig = {
      openaiApiKey: 'test-key',
      crewaiEndpoint: 'http://localhost:3001',
      competitorApiKeys: {
        perplexity: 'test-perplexity-key',
        claude: 'test-claude-key',
        gpt4: 'test-gpt4-key'
      },
      testTimeout: 300000,
      retryAttempts: 3,
      parallelExecution: true,
      maxConcurrentTests: 3,
      reportFormats: ['json', 'markdown', 'html'],
      outputDirectory: './test-results'
    };

    cycleRunner = new CycleRunner(mockConfig);
  });

  describe('runCycle', () => {
    it('should create a test cycle with basic options', async () => {
      const options = {
        cycleId: 'Test Cycle 1',
        businessDomains: ['SaaS Business Planning'],
        complexityLevels: ['medium'],
        compareWithCompetitor: false,
        generateReport: true,
        saveResults: true
      };

      // Mock the internal methods to avoid actual execution
      jest.spyOn(cycleRunner as any, 'createTestCycle').mockResolvedValue(createMockTestCycle());
      jest.spyOn(cycleRunner as any, 'testGenerator').mockResolvedValue([]);
      jest.spyOn(cycleRunner as any, 'testExecutor').mockResolvedValue({
        totalTests: 5,
        passedTests: 4,
        failedTests: 1,
        skippedTests: 0,
        executionTime: 120000,
        scores: {
          contextRetention: 8.0,
          responseRelevance: 7.5,
          conversationContinuity: 8.0,
          businessInsightQuality: 7.0,
          responseCoherence: 8.5,
          overallScore: 7.8
        },
        detailedResults: [],
        performanceMetrics: {
          averageResponseTime: 5000,
          memoryUsage: 200,
          cpuUsage: 30,
          apiCallCount: 25,
          errorRate: 2.0
        }
      });

      const result = await cycleRunner.runCycle(options);

      expect(result).toBeDefined();
      expect(result.id).toBe('cycle-test-123');
      expect(result.name).toBe('Test Cycle');
      expect(result.status).toBe('completed');
    });

    it('should handle errors gracefully', async () => {
      const options = {
        cycleId: 'Error Test Cycle',
        businessDomains: ['SaaS Business Planning'],
        complexityLevels: ['medium'],
        compareWithCompetitor: false,
        generateReport: true,
        saveResults: true
      };

      // Mock an error
      jest.spyOn(cycleRunner as any, 'createTestCycle').mockRejectedValue(new Error('Test error'));

      await expect(cycleRunner.runCycle(options)).rejects.toThrow('Test error');
    });
  });

  describe('runInteractiveCycle', () => {
    it('should run interactive cycle setup', async () => {
      // Mock the internal runCycle method
      jest.spyOn(cycleRunner as any, 'runCycle').mockResolvedValue(createMockTestCycle());

      const result = await cycleRunner.runInteractiveCycle();

      expect(result).toBeDefined();
      expect(cycleRunner['runCycle']).toHaveBeenCalledWith({
        cycleId: 'Test Cycle',
        businessDomains: ['SaaS Business Planning'],
        complexityLevels: ['medium'],
        compareWithCompetitor: true,
        generateReport: true,
        saveResults: true
      });
    });
  });
});
