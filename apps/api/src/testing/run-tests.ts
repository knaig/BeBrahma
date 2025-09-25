#!/usr/bin/env tsx

/**
 * CLI Script to Run CrewAI Conversation Evaluation Tests
 * Usage: npm run test:conversation
 */

import { TestRunner } from './test-runner';
import { EnhancedReporter } from './enhanced-reporter';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🧪 CrewAI Conversation Evaluation Test Runner');
  console.log('='.repeat(60));
  
  // Check environment variables
  const openaiApiKey = process.env['OPENAI_API_KEY'];
  const apiEndpoint = process.env['API_ENDPOINT'] || 'http://localhost:3001';
  
  if (!openaiApiKey) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    console.log('💡 Set it in your .env.local file or export it');
    process.exit(1);
  }
  
  console.log(`🔑 OpenAI API: ${openaiApiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🌐 API Endpoint: ${apiEndpoint}`);
  console.log('');
  
  // Initialize test runner
  const testRunner = new TestRunner(openaiApiKey, apiEndpoint);
  
  try {
    // Check if API is accessible
    console.log('🔍 Checking API connectivity...');
    const healthCheck = await fetch(`${apiEndpoint}/health`);
    if (!healthCheck.ok) {
      throw new Error(`API health check failed: ${healthCheck.status}`);
    }
    console.log('✅ API is accessible\n');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0];
    
    let results;
    
    switch (command) {
      case '--suite':
        const suiteName = args[1];
        if (!suiteName) {
          console.error('❌ Please specify a test suite name');
          console.log('Available suites: Business Strategy, Market Research, Financial Analysis, Competitive Intelligence, Context Continuity');
          process.exit(1);
        }
        
        console.log(`🎯 Running specific test suite: ${suiteName}`);
        const suiteResult = await testRunner.runTestSuite(suiteName);
        results = suiteResult ? [suiteResult] : [];
        break;
        
      case '--all':
      default:
        console.log('🚀 Running all test suites...');
        results = await testRunner.runAllTests();
        break;
    }
    
    if (!results || results.length === 0) {
      console.error('❌ No test results generated');
      process.exit(1);
    }
    
    // Generate enhanced traceable reports
    const enhancedReporter = new EnhancedReporter();
    const traceableReport = enhancedReporter.generateTraceableReport(results);
    
    const reportPath = path.join(__dirname, '..', '..', 'test-results');
    
    // Ensure reports directory exists
    if (!fs.existsSync(reportPath)) {
      fs.mkdirSync(reportPath, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save JSON report
    const jsonReport = JSON.stringify(traceableReport, null, 2);
    const jsonReportFile = path.join(reportPath, `conversation-evaluation-${timestamp}.json`);
    fs.writeFileSync(jsonReportFile, jsonReport);
    
    // Save Markdown report
    const markdownReportFile = path.join(reportPath, `conversation-evaluation-${timestamp}.md`);
    enhancedReporter.saveMarkdownReport(traceableReport, markdownReportFile);
    
    console.log(`\n📄 Reports saved to:`);
    console.log(`   📊 JSON: ${jsonReportFile}`);
    console.log(`   📝 Markdown: ${markdownReportFile}`);
    
    // Print summary
    const totalTests = results.reduce((sum, r) => sum + (r?.totalTests || 0), 0);
    const totalPassed = results.reduce((sum, r) => sum + (r?.passedTests || 0), 0);
    const successRate = ((totalPassed / totalTests) * 100).toFixed(1);
    
    console.log('\n🎯 FINAL SUMMARY');
    console.log('='.repeat(40));
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalTests - totalPassed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (parseFloat(successRate) >= 80) {
      console.log('\n🎉 EXCELLENT PERFORMANCE! Your CrewAI system is working very well.');
    } else if (parseFloat(successRate) >= 60) {
      console.log('\n✅ GOOD PERFORMANCE! Some areas need improvement.');
    } else {
      console.log('\n⚠️  NEEDS ATTENTION! Several areas need significant improvement.');
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
