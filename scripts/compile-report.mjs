#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function compileReport(runId) {
  const reportsDir = path.join(rootDir, 'reports', runId);
  
  try {
    // Check if the report directory exists
    await fs.access(reportsDir);
  } catch (error) {
    console.error(`❌ Report directory not found: ${reportsDir}`);
    process.exit(1);
  }
  
  console.log(`📊 Compiling report for run: ${runId}`);
  
  // Read artifacts
  const artifactsPath = path.join(reportsDir, 'artifacts.json');
  let artifacts = {};
  try {
    const artifactsContent = await fs.readFile(artifactsPath, 'utf8');
    artifacts = JSON.parse(artifactsContent);
  } catch (error) {
    console.warn('⚠️ Could not read artifacts.json, using empty object');
  }
  
  // Read existing report if it exists
  const reportPath = path.join(reportsDir, 'FounderReport.md');
  let existingReport = '';
  try {
    existingReport = await fs.readFile(reportPath, 'utf8');
  } catch (error) {
    console.warn('⚠️ No existing report found, will create new one');
  }
  
  // Enhance the report with additional data
  const enhancedReport = enhanceReport(existingReport, artifacts);
  
  // Write the enhanced report
  await fs.writeFile(reportPath, enhancedReport);
  console.log(`✅ Enhanced report written: ${reportPath}`);
  
  return reportPath;
}

function enhanceReport(existingReport, artifacts) {
  // If no existing report, create a basic one
  if (!existingReport) {
    return generateBasicReport(artifacts);
  }
  
  // Enhance existing report
  let enhanced = existingReport;
  
  // Add artifacts section if not present
  if (!enhanced.includes('## Detailed Artifacts')) {
    enhanced += '\n\n' + generateArtifactsSection(artifacts);
  }
  
  // Add technical details if not present
  if (!enhanced.includes('## Technical Details')) {
    enhanced += '\n\n' + generateTechnicalSection(artifacts);
  }
  
  return enhanced;
}

function generateBasicReport(artifacts) {
  const persona = artifacts.persona || {};
  const steps = artifacts.steps || [];
  const screenshots = artifacts.screenshots || [];
  const errors = artifacts.errors || [];
  
  return `# BeBrahma Founder Evaluation Report

**Run ID:** ${artifacts.runId || 'Unknown'}  
**Persona:** ${persona.id || 'Unknown'}  
**Goal:** ${persona.goal || 'Unknown'}  
**Date:** ${new Date().toISOString()}  
**Status:** ${artifacts.success ? '✅ Success' : '❌ Failed'}

## Summary

This automated test run executed the "${persona.task || 'Unknown task'}" scenario using the ${persona.id || 'Unknown'} persona.

**Key Metrics:**
- Total Steps: ${steps.length}
- Screenshots Captured: ${screenshots.length}
- Errors Encountered: ${errors.length}
- Success Rate: ${artifacts.success ? '100%' : '0%'}

## Step-by-Step Execution

${steps.map((step, index) => 
  `${index + 1}. **${step.timestamp}** - ${step.command}: ${step.success ? '✅' : '❌'} ${step.result || step.error || 'No details'}`
).join('\n')}

## Screenshots

${screenshots.map((screenshot, index) => 
  `${index + 1}. [Screenshot ${index + 1}](${path.basename(screenshot)})`
).join('\n')}

## Errors

${errors.length > 0 ? 
  errors.map((error, index) => `${index + 1}. ${error}`).join('\n') :
  'No errors encountered during execution.'
}

## Recommendations

Based on the automated execution:

${artifacts.success ? 
  '✅ **Test Passed**: The automated flow completed successfully without critical errors.' :
  '❌ **Test Failed**: Critical errors were encountered that need to be addressed.'
}

${errors.length > 0 ? 
  `\n🔧 **Fix Required**: ${errors.length} error(s) need to be resolved before this flow can be considered production-ready.` :
  ''
}

## Next Steps

1. Review the screenshots to verify the UI flow
2. ${artifacts.success ? 'Test the generated artifacts (GTM prompts, exports)' : 'Fix the identified errors'}
3. Run manual testing to validate the automated results
4. Consider the persona-specific feedback for UX improvements

${generateArtifactsSection(artifacts)}

${generateTechnicalSection(artifacts)}
`;
}

function generateArtifactsSection(artifacts) {
  return `## Detailed Artifacts

### Execution Timeline
- **Start Time:** ${artifacts.startTime || 'Unknown'}
- **End Time:** ${artifacts.endTime || 'Unknown'}
- **Duration:** ${artifacts.startTime && artifacts.endTime ? 
    Math.round((new Date(artifacts.endTime) - new Date(artifacts.startTime)) / 1000) + ' seconds' : 
    'Unknown'
  }

### Step Details
${(artifacts.steps || []).map((step, index) => `
**Step ${index + 1}: ${step.command}**
- Timestamp: ${step.timestamp}
- Success: ${step.success ? 'Yes' : 'No'}
- Details: ${step.result || step.error || 'No additional details'}
`).join('\n')}

### Screenshot Metadata
${(artifacts.screenshots || []).map((screenshot, index) => `
**Screenshot ${index + 1}:**
- Path: \`${screenshot}\`
- Name: \`${path.basename(screenshot)}\`
`).join('\n')}`;
}

function generateTechnicalSection(artifacts) {
  return `## Technical Details

### Environment
- **Test URL:** ${process.env.BEBRAHMA_URL || 'Not set'}
- **Test Email:** ${process.env.BEBRAHMA_TEST_EMAIL || 'Not set'}
- **Headless Mode:** ${process.env.HEADFUL !== '1' ? 'Yes' : 'No'}

### Artifacts Summary
- **JSON Artifacts:** Available in \`artifacts.json\`
- **Screenshots:** ${(artifacts.screenshots || []).length} files
- **Trace Files:** ${artifacts.tracePath ? 'Available' : 'Not generated'}
- **HAR Files:** ${artifacts.harPath ? 'Available' : 'Not generated'}

### Performance Metrics
- **Total Commands:** ${(artifacts.steps || []).length}
- **Success Rate:** ${artifacts.steps ? 
    Math.round((artifacts.steps.filter(s => s.success).length / artifacts.steps.length) * 100) + '%' : 
    'N/A'
  }
- **Error Rate:** ${artifacts.steps ? 
    Math.round((artifacts.steps.filter(s => !s.success).length / artifacts.steps.length) * 100) + '%' : 
    'N/A'
  }

### Recommendations for Improvement
${artifacts.success ? 
  'The automated flow completed successfully. Consider adding more edge case testing.' :
  'Critical issues were found. Focus on error handling and user experience improvements.'
}`;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node compile-report.mjs <runId>');
    console.log('Example: node compile-report.mjs 2025-01-15T10-30-00');
    process.exit(1);
  }
  
  const runId = args[0];
  await compileReport(runId);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
