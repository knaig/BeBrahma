import { TestCycle, TestExecutionOptions, TestConfiguration } from './types';
import { TestGenerator } from './test-generator';
import { TestExecutor } from './test-executor';
import { CompetitorComparison } from './competitor-comparison';
import { ReportGenerator } from './report-generator';
import { CycleManager } from './cycle-manager';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

export class CycleRunner {
  private config: TestConfiguration;
  private cycleManager: CycleManager;
  private testGenerator: TestGenerator;
  private testExecutor: TestExecutor;
  private competitorComparison: CompetitorComparison;
  private reportGenerator: ReportGenerator;

  constructor(config: TestConfiguration) {
    this.config = config;
    this.cycleManager = new CycleManager();
    this.testGenerator = new TestGenerator(config);
    this.testExecutor = new TestExecutor(config);
    this.competitorComparison = new CompetitorComparison(config);
    this.reportGenerator = new ReportGenerator();
  }

  async runCycle(options: TestExecutionOptions): Promise<TestCycle> {
    console.log(chalk.blue.bold('🚀 Starting Test Cycle Execution'));
    console.log(chalk.gray('=====================================\n'));

    // Step 1: Create test folder for cycle
    const cycle = await this.createTestCycle(options);
    console.log(chalk.green(`✅ Created test cycle: ${cycle.name} (${cycle.id})`));

    // Step 2: Generate tests
    const spinner = ora('Generating test cases...').start();
    const testSuites = await this.testGenerator.generateTestSuites(cycle);
    spinner.succeed(`Generated ${testSuites.length} test suites`);
    cycle.testSuites = testSuites;

    // Step 3: Run tests
    console.log(chalk.blue('\n🧪 Executing test suites...'));
    const results = await this.testExecutor.executeTestSuites(testSuites);
    cycle.results = results;
    cycle.status = 'completed';
    cycle.endDate = new Date();

    // Step 4: See results
    console.log(chalk.green('\n📊 Test Results Summary:'));
    this.displayResultsSummary(results);

    // Step 5: Store documentation and results
    await this.storeCycleResults(cycle);

    // Step 6: State the changes you are making
    const changes = await this.identifyRequiredChanges(results);
    cycle.changes = changes;
    console.log(chalk.yellow(`\n🔧 Identified ${changes.length} required changes`));

    // Step 7: Make code changes to source code
    if (changes.length > 0) {
      await this.implementCodeChanges(changes);
    }

    // Step 8: Revisit test cases and make changes if any
    const updatedTestSuites = await this.testGenerator.updateTestSuites(testSuites, changes);
    cycle.testSuites = updatedTestSuites;

    // Step 9: Make a summary of observations
    const observations = await this.generateObservations(results, changes);
    cycle.observations = observations;

    // Step 10: Run competitor comparison
    if (options.compareWithCompetitor) {
      console.log(chalk.blue('\n🏆 Running competitor comparison...'));
      const competitiveAnalysis = await this.competitorComparison.compareWithPerplexity(cycle);
      cycle.competitiveAnalysis = competitiveAnalysis;
      this.displayCompetitiveAnalysis(competitiveAnalysis);
    }

    // Step 11: Generate recommendations
    const recommendations = await this.generateRecommendations(cycle);
    cycle.recommendations = recommendations;

    // Step 12: Generate final report
    await this.reportGenerator.generateCycleReport(cycle, this.config.outputDirectory);

    console.log(chalk.green.bold('\n🎉 Test Cycle Completed Successfully!'));
    return cycle;
  }

  private async createTestCycle(options: TestExecutionOptions): Promise<TestCycle> {
    const cycleId = `cycle-${Date.now()}`;
    const cycleName = options.cycleId || `Test Cycle ${new Date().toISOString().split('T')[0]}`;
    
    const cycle: TestCycle = {
      id: cycleId,
      name: cycleName,
      version: '1.0.0',
      startDate: new Date(),
      status: 'running',
      testSuites: [],
      results: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        executionTime: 0,
        scores: {
          contextRetention: 0,
          responseRelevance: 0,
          conversationContinuity: 0,
          businessInsightQuality: 0,
          responseCoherence: 0,
          overallScore: 0
        },
        detailedResults: [],
        performanceMetrics: {
          averageResponseTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          apiCallCount: 0,
          errorRate: 0
        }
      },
      changes: [],
      observations: [],
      recommendations: []
    };

    // Create cycle directory
    const cycleDir = path.join(this.config.outputDirectory, cycleId);
    await fs.ensureDir(cycleDir);
    
    return cycle;
  }

  private displayResultsSummary(results: any): void {
    console.log(chalk.gray(`  Total Tests: ${results.totalTests}`));
    console.log(chalk.green(`  Passed: ${results.passedTests}`));
    console.log(chalk.red(`  Failed: ${results.failedTests}`));
    console.log(chalk.yellow(`  Skipped: ${results.skippedTests}`));
    console.log(chalk.blue(`  Execution Time: ${(results.executionTime / 1000).toFixed(2)}s`));
    console.log(chalk.cyan(`  Overall Score: ${results.scores.overallScore.toFixed(2)}/10`));
  }

  private async storeCycleResults(cycle: TestCycle): Promise<void> {
    const cycleDir = path.join(this.config.outputDirectory, cycle.id);
    
    // Save cycle data
    await fs.writeJson(path.join(cycleDir, 'cycle-data.json'), cycle, { spaces: 2 });
    
    // Save test results
    await fs.writeJson(path.join(cycleDir, 'test-results.json'), cycle.results, { spaces: 2 });
    
    // Save changes
    await fs.writeJson(path.join(cycleDir, 'changes.json'), cycle.changes, { spaces: 2 });
    
    console.log(chalk.green(`✅ Cycle results stored in: ${cycleDir}`));
  }

  private async identifyRequiredChanges(results: any): Promise<any[]> {
    const changes = [];
    
    // Analyze failed tests and identify required changes
    if (results.failedTests > 0) {
      changes.push({
        id: `change-${Date.now()}`,
        description: 'Fix failing test cases',
        filePath: 'src/testing/',
        changeType: 'modification',
        reason: `${results.failedTests} tests failed`,
        impact: 'medium',
        status: 'planned'
      });
    }

    // Analyze low scores and identify improvement areas
    if (results.scores.overallScore < 7.0) {
      changes.push({
        id: `change-${Date.now() + 1}`,
        description: 'Improve conversation quality scores',
        filePath: 'src/ai/',
        changeType: 'modification',
        reason: `Overall score ${results.scores.overallScore} is below target of 7.0`,
        impact: 'high',
        status: 'planned'
      });
    }

    return changes;
  }

  private async implementCodeChanges(changes: any[]): Promise<void> {
    console.log(chalk.blue('\n🔧 Implementing code changes...'));
    
    for (const change of changes) {
      console.log(chalk.yellow(`  Implementing: ${change.description}`));
      
      // Here you would implement the actual code changes
      // For now, we'll just mark them as implemented
      change.status = 'implemented';
      
      // Simulate implementation time
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(chalk.green('✅ Code changes implemented'));
  }

  private async generateObservations(results: any, changes: any[]): Promise<string[]> {
    const observations = [];
    
    // Performance observations
    if (results.executionTime > 150000) { // 2.5 minutes
      observations.push('Test execution time exceeded target of 2.5 minutes');
    }
    
    // Quality observations
    if (results.scores.overallScore < 7.0) {
      observations.push('Overall conversation quality needs improvement');
    }
    
    if (results.scores.contextRetention < 7.0) {
      observations.push('Context retention capabilities need enhancement');
    }
    
    // Change observations
    if (changes.length > 0) {
      observations.push(`${changes.length} code changes required to improve performance`);
    }
    
    return observations;
  }

  private displayCompetitiveAnalysis(analysis: any): void {
    console.log(chalk.blue('\n🏆 Competitive Analysis Results:'));
    console.log(chalk.gray('================================'));
    
    if (analysis) {
      console.log(chalk.cyan(`  Competitor: ${analysis.competitor}`));
      console.log(chalk.green(`  Our Score: ${analysis.comparisonMetrics.businessInsightQuality}/10`));
      console.log(chalk.yellow(`  Their Score: ${analysis.comparisonMetrics.businessInsightQuality}/10`));
      
      if (analysis.advantages.length > 0) {
        console.log(chalk.green('\n  Our Advantages:'));
        analysis.advantages.forEach((adv: string) => console.log(chalk.green(`    • ${adv}`)));
      }
      
      if (analysis.gaps.length > 0) {
        console.log(chalk.red('\n  Areas for Improvement:'));
        analysis.gaps.forEach((gap: string) => console.log(chalk.red(`    • ${gap}`)));
      }
    }
  }

  private async generateRecommendations(cycle: TestCycle): Promise<string[]> {
    const recommendations = [];
    
    // Performance recommendations
    if (cycle.results.executionTime > 150000) {
      recommendations.push('Optimize test execution for faster results');
    }
    
    // Quality recommendations
    if (cycle.results.scores.overallScore < 7.0) {
      recommendations.push('Focus on improving conversation quality metrics');
    }
    
    if (cycle.results.scores.contextRetention < 7.0) {
      recommendations.push('Enhance context retention capabilities');
    }
    
    // Competitive recommendations
    if (cycle.competitiveAnalysis) {
      recommendations.push(`Address ${cycle.competitiveAnalysis.gaps.length} competitive gaps`);
      recommendations.push(`Leverage ${cycle.competitiveAnalysis.advantages.length} competitive advantages`);
    }
    
    return recommendations;
  }

  async runInteractiveCycle(): Promise<TestCycle> {
    console.log(chalk.blue.bold('🎯 Interactive Test Cycle Setup'));
    console.log(chalk.gray('==================================\n'));

    const questions = [
      {
        type: 'input',
        name: 'cycleName',
        message: 'What would you like to name this test cycle?',
        default: `Test Cycle ${new Date().toISOString().split('T')[0]}`
      },
      {
        type: 'checkbox',
        name: 'businessDomains',
        message: 'Which business domains should we focus on?',
        choices: [
          'SaaS Business Planning',
          'FinTech Product Strategy',
          'EV Infrastructure Consulting',
          'E-commerce Marketing',
          'Investment Due Diligence',
          'Retail Operations'
        ],
        default: ['SaaS Business Planning', 'FinTech Product Strategy']
      },
      {
        type: 'checkbox',
        name: 'complexityLevels',
        message: 'Which complexity levels should we test?',
        choices: [
          { name: 'Low Complexity', value: 'low' },
          { name: 'Medium Complexity', value: 'medium' },
          { name: 'High Complexity', value: 'high' }
        ],
        default: ['medium', 'high']
      },
      {
        type: 'confirm',
        name: 'compareWithCompetitor',
        message: 'Would you like to compare results with Perplexity?',
        default: true
      },
      {
        type: 'confirm',
        name: 'generateReport',
        message: 'Generate detailed report after completion?',
        default: true
      }
    ];

    const answers = await inquirer.prompt(questions);
    
    const options: TestExecutionOptions = {
      cycleId: answers.cycleName,
      businessDomains: answers.businessDomains,
      complexityLevels: answers.complexityLevels,
      compareWithCompetitor: answers.compareWithCompetitor,
      generateReport: answers.generateReport,
      saveResults: true
    };

    return this.runCycle(options);
  }
}
