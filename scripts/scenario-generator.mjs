#!/usr/bin/env node

import { PlaywrightTestRunner } from '../.bebrahma-tests/playwright-runner.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function loadPersonas() {
  const personasPath = path.join(rootDir, '.bebrahma-tests', 'personas.yaml');
  const content = await fs.readFile(personasPath, 'utf8');
  return yaml.load(content);
}

async function generateIndexReport(results) {
  const indexPath = path.join(rootDir, 'reports', 'index.md');
  
  let indexContent = `# BeBrahma Testing Results Summary

Generated: ${new Date().toISOString()}

## Overall Results

| Persona | Score | Verdict | Report |
|---------|-------|---------|--------|
`;

  results.forEach(result => {
    const score = result.evaluation?.averageScore || 'N/A';
    const verdict = result.evaluation?.verdict || 'Unknown';
    const reportPath = path.relative(rootDir, result.reportPath);
    indexContent += `| ${result.persona.id} | ${score}/5 | ${verdict} | [View Report](${reportPath}) |\n`;
  });

  indexContent += `
## Summary

${results.length} personas tested:

${results.map(result => {
  const score = result.evaluation?.averageScore || 'N/A';
  return `- **${result.persona.id}**: ${score}/5 (${result.evaluation?.verdict || 'Unknown'})`;
}).join('\n')}

## Recommendations

Based on the testing results:

${results.filter(r => r.evaluation?.verdict === 'ship').length > 0 ? 
  '✅ **Ready to Ship**: Some personas show the product is ready for launch.' : 
  '⚠️ **Not Ready to Ship**: All personas identified issues that need to be addressed.'}

${results.filter(r => r.evaluation?.verdict === 'fix then ship').length > 0 ? 
  '🔧 **Fix Then Ship**: Address critical issues before launch.' : ''}

${results.filter(r => r.evaluation?.verdict === 'rethink').length > 0 ? 
  '🔄 **Major Rethink**: Significant changes needed to the product.' : ''}
`;

  await fs.writeFile(indexPath, indexContent);
  console.log(`📊 Index report generated: ${indexPath}`);
  return indexPath;
}

async function runAllPersonas() {
  console.log('🚀 Running all personas...\n');
  
  const personas = await loadPersonas();
  const results = [];
  
  for (const persona of personas.personas) {
    console.log(`\n🎭 Running persona: ${persona.id}`);
    console.log('='.repeat(40));
    
    try {
      const runner = new PlaywrightTestRunner(persona);
      await runner.setup();
      await runner.executePersona();
      const evaluation = await runner.generateReport();
      await runner.cleanup();
      
      const reportPath = path.join(runner.reportsDir, 'FounderReport.md');
      
      results.push({
        persona,
        reportPath,
        evaluation,
        success: true
      });
      
      console.log(`✅ ${persona.id} completed successfully`);
      
    } catch (error) {
      console.error(`❌ ${persona.id} failed:`, error.message);
      results.push({
        persona,
        reportPath: null,
        evaluation: null,
        success: false,
        error: error.message
      });
    }
  }
  
  // Generate index report
  const indexPath = await generateIndexReport(results);
  
  console.log('\n🎉 All personas completed!');
  console.log(`📊 Summary report: ${indexPath}`);
  
  // Check if any tests failed
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log(`\n⚠️ ${failures.length} persona(s) failed:`);
    failures.forEach(f => console.log(`   - ${f.persona.id}: ${f.error}`));
    process.exit(1);
  }
  
  return results;
}

function parseEvaluationFromReport(reportContent) {
  try {
    // Extract overall score from the new format
    const scoreMatch = reportContent.match(/## Overall Score\s*\*\*(\d+\.?\d*)\/5\*\*/);
    const averageScore = scoreMatch ? parseFloat(scoreMatch[1]).toFixed(2) : 'N/A';
    
    // Extract verdict
    const verdictMatch = reportContent.match(/## Verdict\s*\*\*(.*?)\*\*/);
    const verdict = verdictMatch ? verdictMatch[1].toLowerCase().replace(/\s+/g, ' ') : 'unknown';
    
    return {
      averageScore,
      verdict: verdict.includes('ship') ? 'ship' : 
               verdict.includes('fix') ? 'fix then ship' : 'rethink'
    };
  } catch (error) {
    return {
      averageScore: 'N/A',
      verdict: 'unknown'
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--all')) {
    await runAllPersonas();
  } else {
    console.log('Usage: node scenario-generator.mjs --all');
    console.log('This will run all personas sequentially and generate a summary report.');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
