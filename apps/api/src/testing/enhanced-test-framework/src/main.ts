#!/usr/bin/env ts-node

import { CycleRunner } from './cycle-runner';
import { TestConfiguration } from './types';
import * as dotenv from 'dotenv';
import * as path from 'path';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log(chalk.blue.bold('🧪 BeBrahma Enhanced Testing Framework'));
  console.log(chalk.gray('==========================================\n'));

  // Configuration setup
  const config: TestConfiguration = {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    crewaiEndpoint: process.env.CREWAI_ENDPOINT || 'http://localhost:3001',
    competitorApiKeys: {
      perplexity: process.env.PERPLEXITY_API_KEY || '',
      claude: process.env.CLAUDE_API_KEY || '',
      gpt4: process.env.GPT4_API_KEY || ''
    },
    testTimeout: 300000, // 5 minutes
    retryAttempts: 3,
    parallelExecution: true,
    maxConcurrentTests: 3,
    reportFormats: ['json', 'markdown', 'html'],
    outputDirectory: path.join(process.cwd(), 'test-results')
  };

  // Validate configuration
  if (!config.openaiApiKey) {
    console.log(chalk.red('❌ OPENAI_API_KEY is required. Please set it in your .env.local file.'));
    process.exit(1);
  }

  if (!config.crewaiEndpoint) {
    console.log(chalk.yellow('⚠️  CREWAI_ENDPOINT not set. Using default: http://localhost:3001'));
  }

  console.log(chalk.green('✅ Configuration loaded successfully'));
  console.log(chalk.gray(`  CrewAI Endpoint: ${config.crewaiEndpoint}`));
  console.log(chalk.gray(`  Output Directory: ${config.outputDirectory}`));
  console.log(chalk.gray(`  Parallel Execution: ${config.parallelExecution ? 'Enabled' : 'Disabled'}`));
  console.log('');

  try {
    // Initialize cycle runner
    const cycleRunner = new CycleRunner(config);

    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--interactive') || args.includes('-i')) {
      // Run interactive cycle
      await cycleRunner.runInteractiveCycle();
    } else if (args.includes('--help') || args.includes('-h')) {
      showHelp();
    } else {
      // Run default cycle with command line options
      const options = parseCommandLineOptions(args);
      await cycleRunner.runCycle(options);
    }

  } catch (error) {
    console.log(chalk.red(`❌ Error running test cycle: ${error.message}`));
    console.log(chalk.gray('\nStack trace:'));
    console.log(error.stack);
    process.exit(1);
  }
}

function showHelp(): void {
  console.log(chalk.blue.bold('📖 Usage Guide'));
  console.log(chalk.gray('===============\n'));
  
  console.log(chalk.white('Commands:'));
  console.log(chalk.gray('  npm run test:cycle              Run default test cycle'));
  console.log(chalk.gray('  npm run test:cycle --interactive Run interactive test cycle'));
  console.log(chalk.gray('  npm run test:cycle --help        Show this help message'));
  console.log('');
  
  console.log(chalk.white('Options:'));
  console.log(chalk.gray('  --suite <name>                   Run specific test suite'));
  console.log(chalk.gray('  --persona <id>                   Test specific user persona'));
  console.log(chalk.gray('  --domain <domain>                Focus on specific business domain'));
  console.log(chalk.gray('  --complexity <level>             Test specific complexity level'));
  console.log(chalk.gray('  --compare                        Enable competitor comparison'));
  console.log(chalk.gray('  --dry-run                        Show what would be tested without running'));
  console.log('');
  
  console.log(chalk.white('Examples:'));
  console.log(chalk.gray('  npm run test:cycle --suite "Business Strategy"'));
  console.log(chalk.gray('  npm run test:cycle --persona startup-founder-sarah'));
  console.log(chalk.gray('  npm run test:cycle --domain "SaaS Business Planning"'));
  console.log(chalk.gray('  npm run test:cycle --complexity high --compare'));
  console.log('');
  
  console.log(chalk.white('Environment Variables:'));
  console.log(chalk.gray('  OPENAI_API_KEY                   Required: Your OpenAI API key'));
  console.log(chalk.gray('  CREWAI_ENDPOINT                  Optional: CrewAI API endpoint'));
  console.log(chalk.gray('  PERPLEXITY_API_KEY               Optional: For competitor comparison'));
  console.log(chalk.gray('  CLAUDE_API_KEY                   Optional: For competitor comparison'));
  console.log(chalk.gray('  GPT4_API_KEY                     Optional: For competitor comparison'));
}

function parseCommandLineOptions(args: string[]): any {
  const options: any = {
    saveResults: true,
    generateReport: true
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--suite':
        options.testSuiteIds = [args[++i]];
        break;
      case '--persona':
        options.userPersonaIds = [args[++i]];
        break;
      case '--domain':
        options.businessDomains = [args[++i]];
        break;
      case '--complexity':
        options.complexityLevels = [args[++i]];
        break;
      case '--compare':
        options.compareWithCompetitor = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--no-report':
        options.generateReport = false;
        break;
      case '--output':
        options.outputDirectory = args[++i];
        break;
    }
  }

  return options;
}

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.log(chalk.red(`❌ Fatal error: ${error.message}`));
    process.exit(1);
  });
}
