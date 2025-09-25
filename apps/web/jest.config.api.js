/** @type {import('jest').Config} */
const config = {
  displayName: 'API Tests',
  
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/api/setup.ts'
  ],
  
  // Test patterns and directories
  testMatch: [
    '<rootDir>/tests/api/**/*.test.ts',
    '<rootDir>/tests/api/**/*.spec.ts'
  ],
  
  // Ignore UI tests and other non-API test files
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/accessibility.spec.ts',
    '<rootDir>/tests/theme-responsiveness.spec.ts',
    '<rootDir>/tests/dashboard.spec.ts',
    '<rootDir>/tests/component-integration.spec.ts',
    '<rootDir>/tests/chat-interface-enhanced.spec.ts'
  ],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
          lib: ['es2020'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          noEmit: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true
        }
      }
    }]
  },
  
  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration
  collectCoverage: false, // Enable only when requested via CLI
  collectCoverageFrom: [
    'app/api/**/*.ts',
    'lib/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/jest.config.*',
    '!**/playwright.config.*'
  ],
  coverageDirectory: 'coverage/api',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Test timeout (individual tests)
  testTimeout: 30000, // 30 seconds for individual tests
  
  // Performance settings
  maxWorkers: '50%', // Use half of available CPU cores
  cache: true,
  cacheDirectory: '<rootDir>/.jest/cache',
  
  // Verbose output for debugging
  verbose: false, // Set to true for detailed output
  
  // Error handling
  bail: 0, // Continue running tests after failures
  errorOnDeprecated: true,
  
  // Global setup and teardown
  globalSetup: undefined,
  globalTeardown: undefined,
  
  // Additional Jest options for API testing
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
  
  // Handle ES modules from MSW and other dependencies
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: false
    }
  },
  
  // Transform node_modules that need to be processed
  transformIgnorePatterns: [
    'node_modules/(?!(msw|@bundled-es-modules)/)'
  ],
  
  // Custom test environment variables
  setupFiles: [],
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage/api',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/'
  ],
  
  // Snapshot configuration
  snapshotSerializers: [],
  updateSnapshot: false,
  
  // Custom matchers and test utilities
  testResultsProcessor: undefined,
  
  // Test categorization via projects (for running subsets)
  projects: undefined,
  
  // Custom resolver for module resolution issues
  resolver: undefined,
  
  // Notify configuration
  notify: false,
  notifyMode: 'failure-change',
  
  // Fail fast configuration
  forceExit: false,
  detectOpenHandles: true,
  detectLeaks: false,
  
  // Custom test runner (default is jest-circus)
  testRunner: 'jest-circus/runner',
  
  // Additional configuration for MSW integration
  testEnvironmentOptions: {
    // Node environment options if needed
  }
};

module.exports = config;