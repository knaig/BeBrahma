// Jest setup file for enhanced testing framework

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  if (process.env.NODE_ENV === 'test') {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test timeout
jest.setTimeout(300000); // 5 minutes

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.CREWAI_ENDPOINT = 'http://localhost:3001';
process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';

// Mock fs-extra for testing
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeJson: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readJson: jest.fn().mockResolvedValue({}),
  pathExists: jest.fn().mockResolvedValue(true),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn().mockResolvedValue({ size: 0, mtime: new Date() }),
  move: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  copy: jest.fn().mockResolvedValue(undefined)
}));

// Mock axios for testing
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({
    data: {
      choices: [{ message: { content: 'Mock response' } }],
      response: 'Mock response',
      message: 'Mock response'
    }
  })
}));

// Mock chalk for testing
jest.mock('chalk', () => ({
  blue: { bold: jest.fn((text: string) => text) },
  green: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  cyan: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
  white: jest.fn((text: string) => text)
}));

// Mock ora for testing
jest.mock('ora', () => {
  return jest.fn().mockImplementation(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis()
  }));
});

// Mock inquirer for testing
jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({
    cycleName: 'Test Cycle',
    businessDomains: ['SaaS Business Planning'],
    complexityLevels: ['medium'],
    compareWithCompetitor: true,
    generateReport: true
  })
}));

// Mock moment for testing
jest.mock('moment', () => {
  const mockMoment = (date: any) => ({
    format: jest.fn().mockReturnValue('2024-01-15 12:00:00'),
    duration: jest.fn().mockReturnValue({
      humanize: jest.fn().mockReturnValue('2 minutes')
    })
  });
  mockMoment.duration = jest.fn().mockReturnValue({
    humanize: jest.fn().mockReturnValue('2 minutes')
  });
  return mockMoment;
});

// Test utilities
export const createMockTestCycle = () => ({
  id: 'cycle-test-123',
  name: 'Test Cycle',
  version: '1.0.0',
  startDate: new Date(),
  status: 'completed' as const,
  testSuites: [],
  results: {
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
  },
  changes: [],
  observations: [],
  recommendations: []
});

export const createMockConversationFlow = () => ({
  id: 'flow-test-123',
  name: 'Test Conversation Flow',
  description: 'A test conversation flow for testing purposes',
  userPersona: {
    id: 'persona-test-123',
    name: 'Test User',
    role: 'Test Role',
    expertise: 'intermediate' as const,
    industry: 'Test Industry',
    companySize: 'startup' as const,
    useCase: 'Test use case',
    painPoints: ['Test pain point'],
    goals: ['Test goal'],
    technicalLevel: 'semi-technical' as const
  },
  initialPrompt: 'Test initial prompt',
  followUpPrompts: ['Test follow-up 1', 'Test follow-up 2'],
  expectedContexts: ['Test context 1', 'Test context 2'],
  expectedRelevance: ['Test relevance 1', 'Test relevance 2'],
  businessDomain: 'Test Business Domain',
  complexity: 'medium' as const,
  conversationType: 'strategy' as const,
  successCriteria: ['Test success criteria'],
  failureScenarios: ['Test failure scenario']
});
