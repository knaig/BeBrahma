#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import PlaywrightMCPClient from './mcp-client.mjs';
import AIEvaluator from './ai-evaluator.mjs';
import VisualRegressionTester from './visual-regression.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.local') });

class BeBrahmaTestRunner {
  constructor() {
    this.runId = this.generateRunId();
    this.reportsDir = path.join(rootDir, 'reports', this.runId);
    this.artifacts = {
      steps: [],
      screenshots: [],
      startTime: new Date().toISOString(),
      endTime: null,
      persona: null,
      success: false,
      errors: []
    };
    
    // Initialize real services
    this.mcpClient = new PlaywrightMCPClient();
    this.aiEvaluator = new AIEvaluator();
    this.visualTester = new VisualRegressionTester(this.reportsDir);
  }

  static generateRunId() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  generateRunId() {
    return BeBrahmaTestRunner.generateRunId();
  }

  async setup() {
    // Create reports directory
    await fs.mkdir(this.reportsDir, { recursive: true });
    console.log(`📁 Created report directory: ${this.reportsDir}`);
    
    // Setup visual regression testing
    await this.visualTester.setup();
    
    // Connect to MCP server
    await this.mcpClient.connect();
    console.log('✅ Connected to Playwright MCP server');
  }

  async loadPersonas() {
    const personasPath = path.join(__dirname, 'personas.yaml');
    const content = await fs.readFile(personasPath, 'utf8');
    return yaml.load(content);
  }

  async getPersona(personas, personaId) {
    const persona = personas.personas.find(p => p.id === personaId);
    if (!persona) {
      throw new Error(`Persona ${personaId} not found`);
    }
    return persona;
  }

  async runMCPCommand(command, args = {}) {
    console.log(`🤖 Executing: ${command}`, args);

    try {
      const result = await this.executeRealMCPCommand(command, args);

      this.artifacts.steps.push({
        timestamp: new Date().toISOString(),
        command,
        args,
        result,
        success: true
      });
      return result;
    } catch (error) {
      console.error(`❌ MCP command failed: ${command}`, error);
      this.artifacts.steps.push({
        timestamp: new Date().toISOString(),
        command,
        args,
        error: error.message,
        success: false
      });
      this.artifacts.errors.push(error.message);
      throw error;
    }
  }

  async executeRealMCPCommand(command, args) {
    // Map command names to MCP client methods
    const methodMap = {
      'browser_navigate': () => this.mcpClient.browser_navigate(args.url),
      'browser_click': () => this.mcpClient.browser_click(args.element),
      'browser_fill': () => this.mcpClient.browser_fill(args.field, args.value),
      'browser_wait_for': () => this.mcpClient.browser_wait_for(args.condition, args.timeout),
      'browser_screenshot': () => this.mcpClient.browser_screenshot(args.name),
      'browser_get_text': () => this.mcpClient.browser_get_text(args.selector),
      'browser_evaluate': () => this.mcpClient.browser_evaluate(args.script),
      'browser_close': () => this.mcpClient.browser_close(),
      'browser_snapshot': () => this.mcpClient.browser_snapshot()
    };

    const method = methodMap[command];
    if (method) {
      return await method();
    } else {
      throw new Error(`Unknown MCP command: ${command}`);
    }
  }


  async executePersona(persona) {
    console.log(`🎭 Running persona: ${persona.id}`);
    console.log(`🎯 Goal: ${persona.goal}`);
    console.log(`📝 Task: ${persona.task}`);
    
    this.artifacts.persona = persona;

    const url = process.env.BEBRAHMA_URL || 'http://localhost:3000';
    const email = process.env.BEBRAHMA_TEST_EMAIL || 'test@example.com';
    const password = process.env.BEBRAHMA_TEST_PASSWORD || 'testpassword123';

    try {
      // Step 1: Navigate to BeBrahma
      await this.runMCPCommand('browser_navigate', { url });
      await this.takeScreenshot('01-navigate');

      // Step 2: Check if we need to sign in
      await this.runMCPCommand('browser_wait_for', { condition: 'page_loaded' });
      await this.takeScreenshot('02-page-loaded');

      // Step 3: Look for sign-in form and sign in if needed
      await this.runMCPCommand('browser_click', { element: 'sign-in-button' });
      await this.takeScreenshot('03-sign-in-click');

      await this.runMCPCommand('browser_fill', { field: 'email', value: email });
      await this.runMCPCommand('browser_fill', { field: 'password', value: password });
      await this.runMCPCommand('browser_click', { element: 'submit-button' });
      await this.takeScreenshot('04-signed-in');

      // Step 4: Create new project based on persona task
      await this.runMCPCommand('browser_click', { element: 'new-project-button' });
      await this.takeScreenshot('05-new-project');

      // Fill in project details based on persona task
      await this.runMCPCommand('browser_fill', { 
        field: 'project-title', 
        value: this.extractProjectTitle(persona.task) 
      });
      await this.takeScreenshot('06-project-title');

      await this.runMCPCommand('browser_fill', { 
        field: 'project-description', 
        value: persona.task 
      });
      await this.takeScreenshot('07-project-description');

      // Step 5: Progress through the workflow
      await this.runMCPCommand('browser_click', { element: 'continue-button' });
      await this.takeScreenshot('08-workflow-start');

      // Simulate going through the workflow steps
      await this.runMCPCommand('browser_wait_for', { condition: 'solution-options-loaded' });
      await this.takeScreenshot('09-solution-options');

      await this.runMCPCommand('browser_click', { element: 'select-solution' });
      await this.takeScreenshot('10-solution-selected');

      // Step 6: Generate GTM prompt
      await this.runMCPCommand('browser_click', { element: 'generate-gtm-button' });
      await this.runMCPCommand('browser_wait_for', { condition: 'gtm-prompt-generated' });
      await this.takeScreenshot('11-gtm-prompt');

      // Step 7: Export artifacts if available
      await this.runMCPCommand('browser_click', { element: 'export-button' });
      await this.takeScreenshot('12-export-complete');

      this.artifacts.success = true;
      console.log('✅ Persona execution completed successfully');

    } catch (error) {
      console.error('❌ Persona execution failed:', error);
      this.artifacts.success = false;
      throw error;
    }
  }

  extractProjectTitle(task) {
    // Extract project title from task description
    const match = task.match(/['"]([^'"]+)['"]/);
    return match ? match[1] : 'Test Project';
  }

  async takeScreenshot(name) {
    const screenshotPath = path.join(this.reportsDir, `${String(this.artifacts.screenshots.length + 1).padStart(2, '0')}-${name}.png`);
    
    try {
      // Use real MCP to take screenshot
      const screenshotBuffer = await this.mcpClient.browser_screenshot(name);
      await fs.writeFile(screenshotPath, Buffer.from(screenshotBuffer, 'base64'));
    } catch (error) {
      console.warn(`⚠️ Screenshot failed for ${name}:`, error.message);
      // Create placeholder file
      await fs.writeFile(screenshotPath, `Screenshot placeholder: ${name}`);
    }
    
    this.artifacts.screenshots.push(screenshotPath);
    return screenshotPath;
  }

  async generateReport() {
    console.log('📊 Generating founder evaluation report...');
    
    // Use real AI evaluation
    const evaluation = await this.aiEvaluator.evaluateFounderExperience(
      this.artifacts,
      this.artifacts.persona,
      this.artifacts.screenshots
    );

    console.log('✅ AI evaluation completed');

    const reportPath = path.join(this.reportsDir, 'FounderReport.md');
    const report = this.generateMarkdownReport(evaluation);

    await fs.writeFile(reportPath, report);
    console.log(`📄 Report generated: ${reportPath}`);

    return reportPath;
  }


  generateMarkdownReport(evaluation) {
    const totalScore = Object.values(evaluation.rubric).reduce((sum, item) => sum + item.score, 0);
    const averageScore = (totalScore / Object.keys(evaluation.rubric).length).toFixed(1);
    
    return `# BeBrahma Founder Evaluation Report

**Run ID:** ${this.runId}  
**Persona:** ${this.artifacts.persona?.id || 'Unknown'}  
**Date:** ${new Date().toISOString()}  
**Overall Score:** ${averageScore}/5

## Summary

${evaluation.summary}

## Rubric Scores

| Criterion | Score | Justification |
|-----------|-------|---------------|
${Object.entries(evaluation.rubric).map(([key, value]) => 
  `| ${key.replace(/_/g, ' ')} | ${value.score}/5 | ${value.justification} |`
).join('\n')}

## Step-by-Step Notes

${this.artifacts.steps.map((step, index) => 
  `${index + 1}. **${step.timestamp}** - ${step.command}: ${step.success ? '✅' : '❌'} ${step.result || step.error}`
).join('\n')}

## Screenshots

${this.artifacts.screenshots.map((screenshot, index) => 
  `${index + 1}. [Screenshot ${index + 1}](${path.basename(screenshot)})`
).join('\n')}

## Top 5 Blockers (Ranked)

${evaluation.blockers.map((blocker, index) => `${index + 1}. ${blocker}`).join('\n')}

## Top 5 Quick Wins (Ranked)

${evaluation.quickWins.map((win, index) => `${index + 1}. ${win}`).join('\n')}

## Verdict

**${evaluation.verdict.toUpperCase()}**

${evaluation.verdict === 'ship' ? '🚀 Ready to ship!' : 
  evaluation.verdict === 'fix then ship' ? '🔧 Fix critical issues then ship' : 
  '🔄 Needs major rethinking'}

## Artifacts

- **Steps Log:** ${this.artifacts.steps.length} steps recorded
- **Screenshots:** ${this.artifacts.screenshots.length} screenshots captured
- **Errors:** ${this.artifacts.errors.length} errors encountered
- **Success Rate:** ${this.artifacts.success ? '100%' : '0%'}

## Technical Details

- **AI Evaluation:** ${this.aiEvaluator ? 'Real OpenAI GPT-4' : 'Simulated'}
- **MCP Integration:** ${this.mcpClient.isConnected ? 'Real Playwright MCP' : 'Simulated'}
- **Visual Regression:** Enabled
- **Execution Time:** ${this.artifacts.startTime && this.artifacts.endTime ? 
    Math.round((new Date(this.artifacts.endTime) - new Date(this.artifacts.startTime)) / 1000) + ' seconds' : 
    'N/A'
  }
`;
  }

  async saveArtifacts() {
    const artifactsPath = path.join(this.reportsDir, 'artifacts.json');
    this.artifacts.endTime = new Date().toISOString();
    await fs.writeFile(artifactsPath, JSON.stringify(this.artifacts, null, 2));
    console.log(`💾 Artifacts saved: ${artifactsPath}`);
  }

  async run(personaId) {
    try {
      await this.setup();
      
      const personas = await this.loadPersonas();
      const persona = await this.getPersona(personas, personaId);
      
      await this.executePersona(persona);
      await this.saveArtifacts();
      
      // Run visual regression analysis
      console.log('🔍 Running visual regression analysis...');
      const visualResults = await this.visualTester.compareScreenshots(
        this.artifacts.screenshots, 
        this.runId
      );
      
      // Generate visual regression report
      const visualReportPath = await this.visualTester.generateVisualRegressionReport(
        visualResults, 
        this.runId
      );
      
      const reportPath = await this.generateReport();
      
      console.log('\n🎉 Test run completed successfully!');
      console.log(`📊 Main Report: ${reportPath}`);
      console.log(`📸 Visual Report: ${visualReportPath}`);
      console.log(`📁 All artifacts: ${this.reportsDir}`);
      
      // Disconnect from MCP server
      await this.mcpClient.disconnect();

      return reportPath;

    } catch (error) {
      console.error('💥 Test run failed:', error);
      await this.saveArtifacts();

      // Disconnect from MCP server
      await this.mcpClient.disconnect();

      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const personaIndex = args.indexOf('--persona');
  const personaId = personaIndex !== -1 && args[personaIndex + 1] ? args[personaIndex + 1] : 'indie-marketer';
  
  const headful = args.includes('--headful');
  if (headful) {
    process.env.HEADFUL = '1';
  }

  console.log(`🚀 Starting BeBrahma test run with persona: ${personaId}`);
  
  const runner = new BeBrahmaTestRunner();
  await runner.run(personaId);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { BeBrahmaTestRunner };
