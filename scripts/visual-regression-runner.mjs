#!/usr/bin/env node

import VisualRegressionTester from '../.bebrahma-tests/visual-regression.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function runVisualRegression() {
  console.log('🔍 Starting visual regression analysis...');
  
  try {
    // Find the latest test run
    const reportsDir = path.join(rootDir, 'reports');
    const runs = await fs.readdir(reportsDir);
    const latestRun = runs
      .filter(run => run.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/))
      .sort()
      .pop();

    if (!latestRun) {
      console.log('❌ No test runs found for visual regression analysis');
      process.exit(1);
    }

    const runDir = path.join(reportsDir, latestRun);
    console.log(`📁 Analyzing run: ${latestRun}`);

    // Find all screenshots in the run
    const files = await fs.readdir(runDir);
    const screenshots = files
      .filter(file => file.endsWith('.png'))
      .map(file => path.join(runDir, file));

    if (screenshots.length === 0) {
      console.log('❌ No screenshots found for visual regression analysis');
      process.exit(1);
    }

    console.log(`📸 Found ${screenshots.length} screenshots to analyze`);

    // Initialize visual regression tester
    const tester = new VisualRegressionTester(runDir);
    await tester.setup();

    // Run comparison
    const results = await tester.compareScreenshots(screenshots, latestRun);

    // Generate report
    const reportPath = await tester.generateVisualRegressionReport(results, latestRun);

    // Cleanup old diffs
    await tester.cleanupOldDiffs();

    console.log('✅ Visual regression analysis completed');
    console.log(`📊 Results: ${results.passed}/${results.total} passed, ${results.failed} failed, ${results.new} new`);
    console.log(`📄 Report: ${reportPath}`);

    // Exit with appropriate code
    if (results.failed > 0) {
      console.log('⚠️ Visual differences detected - review required');
      process.exit(1);
    } else {
      console.log('✅ No visual differences detected');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Visual regression analysis failed:', error);
    process.exit(1);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Visual Regression Runner for BeBrahma

Usage:
  node scripts/visual-regression-runner.mjs [options]

Options:
  --help, -h     Show this help message
  --run-id ID    Analyze specific test run ID
  --cleanup      Clean up old diff files
  --baseline     Update baselines with latest screenshots

Examples:
  node scripts/visual-regression-runner.mjs
  node scripts/visual-regression-runner.mjs --run-id 2025-01-15T10-30-00
  node scripts/visual-regression-runner.mjs --cleanup
  node scripts/visual-regression-runner.mjs --baseline
`);
    process.exit(0);
  }

  if (args.includes('--cleanup')) {
    await cleanupOldFiles();
    return;
  }

  if (args.includes('--baseline')) {
    await updateBaselines();
    return;
  }

  const runIdIndex = args.indexOf('--run-id');
  if (runIdIndex !== -1 && args[runIdIndex + 1]) {
    const specificRunId = args[runIdIndex + 1];
    await runVisualRegressionForRun(specificRunId);
    return;
  }

  await runVisualRegression();
}

async function cleanupOldFiles() {
  console.log('🗑️ Cleaning up old visual regression files...');
  
  try {
    const reportsDir = path.join(rootDir, 'reports');
    const tester = new VisualRegressionTester(reportsDir);
    await tester.setup();
    
    await tester.cleanupOldDiffs();
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

async function updateBaselines() {
  console.log('📸 Updating visual regression baselines...');
  
  try {
    const reportsDir = path.join(rootDir, 'reports');
    const runs = await fs.readdir(reportsDir);
    const latestRun = runs
      .filter(run => run.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/))
      .sort()
      .pop();

    if (!latestRun) {
      console.log('❌ No test runs found for baseline update');
      process.exit(1);
    }

    const runDir = path.join(reportsDir, latestRun);
    const files = await fs.readdir(runDir);
    const screenshots = files
      .filter(file => file.endsWith('.png'))
      .map(file => ({ path: path.join(runDir, file), filename: file }));

    const tester = new VisualRegressionTester(runDir);
    await tester.setup();

    for (const screenshot of screenshots) {
      await tester.updateBaseline(screenshot.path, screenshot.filename);
    }

    console.log(`✅ Updated ${screenshots.length} baselines from run ${latestRun}`);
  } catch (error) {
    console.error('❌ Baseline update failed:', error);
    process.exit(1);
  }
}

async function runVisualRegressionForRun(runId) {
  console.log(`🔍 Running visual regression for specific run: ${runId}`);
  
  try {
    const runDir = path.join(rootDir, 'reports', runId);
    
    // Check if run directory exists
    try {
      await fs.access(runDir);
    } catch {
      console.log(`❌ Test run ${runId} not found`);
      process.exit(1);
    }

    const files = await fs.readdir(runDir);
    const screenshots = files
      .filter(file => file.endsWith('.png'))
      .map(file => path.join(runDir, file));

    if (screenshots.length === 0) {
      console.log(`❌ No screenshots found in run ${runId}`);
      process.exit(1);
    }

    const tester = new VisualRegressionTester(runDir);
    await tester.setup();

    const results = await tester.compareScreenshots(screenshots, runId);
    const reportPath = await tester.generateVisualRegressionReport(results, runId);

    console.log(`✅ Visual regression completed for run ${runId}`);
    console.log(`📊 Results: ${results.passed}/${results.total} passed, ${results.failed} failed, ${results.new} new`);
    console.log(`📄 Report: ${reportPath}`);

    if (results.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Visual regression failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
