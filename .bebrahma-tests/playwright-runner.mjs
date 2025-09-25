#!/usr/bin/env node

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { AIEvaluator } from './ai-evaluator.mjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

class PlaywrightTestRunner {
  constructor(persona) {
    this.persona = persona;
    this.browser = null;
    this.page = null;
    this.screenshots = [];
    this.steps = [];
    this.reportsDir = null;
  }

  static generateRunId() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }

  async setup() {
    const runId = PlaywrightTestRunner.generateRunId();
    this.reportsDir = path.join(process.cwd(), 'reports', `${runId}-${this.persona.id}`);
    await fs.mkdir(this.reportsDir, { recursive: true });
    
    console.log(`📁 Created report directory: ${this.reportsDir}`);
    
    // Launch browser
    console.log('🌐 Launching browser...');
    this.browser = await chromium.launch({ 
      headless: process.env.HEADFUL !== '1',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }

  async executePersona() {
    console.log(`🎭 Running persona: ${this.persona.id}`);
    console.log(`🎯 Goal: ${this.persona.goal}`);
    console.log(`📝 Task: ${this.persona.task}`);

    const url = process.env.BEBRAHMA_URL || 'http://localhost:3000';
    const email = process.env.BEBRAHMA_TEST_EMAIL || 'test@example.com';
    const password = process.env.BEBRAHMA_TEST_PASSWORD || 'testpassword123';

    try {
      // Step 1: Navigate to BeBrahma
      await this.executeStep('navigate', 'Navigate to BeBrahma', async () => {
        await this.page.goto(url, { waitUntil: 'networkidle' });
      });
      await this.takeScreenshot('01-navigate');

      // Step 2: Check if we need to sign in
      await this.executeStep('wait_for_page', 'Wait for page to load', async () => {
        await this.page.waitForLoadState('domcontentloaded');
      });
      await this.takeScreenshot('02-page-loaded');

      // Step 3: Look for sign-in elements
      await this.executeStep('find_signin', 'Look for sign-in elements', async () => {
        const signInElements = await this.page.locator('text=/sign.?in/i').count();
        const buttons = await this.page.locator('button').count();
        return { signInElements, buttons };
      });
      await this.takeScreenshot('03-signin-search');

      // Step 4: Try to interact with the page
      await this.executeStep('interact', 'Try to interact with page elements', async () => {
        const buttons = await this.page.locator('button').all();
        if (buttons.length > 0) {
          // Click the first button
          await buttons[0].click();
          await this.page.waitForTimeout(1000);
        }
      });
      await this.takeScreenshot('04-interaction');

      // Step 5: Check for forms or input fields
      await this.executeStep('check_forms', 'Check for forms and inputs', async () => {
        const forms = await this.page.locator('form').count();
        const inputs = await this.page.locator('input').count();
        const textareas = await this.page.locator('textarea').count();
        return { forms, inputs, textareas };
      });
      await this.takeScreenshot('05-forms-check');

      // Step 6: Try to fill a form if available
      if (await this.page.locator('input').count() > 0) {
        await this.executeStep('fill_form', 'Fill available form fields', async () => {
          const inputs = await this.page.locator('input').all();
          for (const input of inputs.slice(0, 2)) { // Fill first 2 inputs
            const type = await input.getAttribute('type');
            if (type === 'email' || type === 'text') {
              await input.fill(email);
            } else if (type === 'password') {
              await input.fill(password);
            }
          }
        });
        await this.takeScreenshot('06-form-filled');
      }

      // Step 7: Final page state
      await this.executeStep('final_state', 'Capture final page state', async () => {
        const title = await this.page.title();
        const url = this.page.url();
        return { title, url };
      });
      await this.takeScreenshot('07-final-state');

      console.log('✅ Persona execution completed successfully');

    } catch (error) {
      console.error('❌ Persona execution failed:', error);
      throw error;
    }
  }

  async executeStep(stepId, description, action) {
    console.log(`🤖 Executing: ${stepId} - ${description}`);
    
    const startTime = Date.now();
    try {
      const result = await action();
      const duration = Date.now() - startTime;
      
      this.steps.push({
        stepId,
        description,
        timestamp: new Date().toISOString(),
        success: true,
        duration,
        result
      });
      
      console.log(`✅ Step completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.steps.push({
        stepId,
        description,
        timestamp: new Date().toISOString(),
        success: false,
        duration,
        error: error.message
      });
      
      console.error(`❌ Step failed after ${duration}ms:`, error.message);
      throw error;
    }
  }

  async takeScreenshot(name) {
    const screenshotPath = path.join(this.reportsDir, `${String(this.screenshots.length + 1).padStart(2, '0')}-${name}.png`);
    
    try {
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      this.screenshots.push(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      console.warn(`⚠️ Screenshot failed for ${name}:`, error.message);
      return null;
    }
  }

  async generateReport() {
    console.log('📊 Generating founder evaluation report...');
    
    const artifacts = {
      steps: this.steps,
      screenshots: this.screenshots,
      success: this.steps.every(step => step.success),
      persona: this.persona,
      timestamp: new Date().toISOString()
    };

    // Save artifacts
    await fs.writeFile(
      path.join(this.reportsDir, 'artifacts.json'),
      JSON.stringify(artifacts, null, 2)
    );

    // Generate AI evaluation
    try {
      const aiEvaluator = new AIEvaluator();
      const evaluation = await aiEvaluator.evaluateFounderExperience(
        artifacts,
        this.persona,
        this.screenshots
      );

      // Save evaluation
      await fs.writeFile(
        path.join(this.reportsDir, 'evaluation.json'),
        JSON.stringify(evaluation, null, 2)
      );

      // Generate markdown report
      const report = this.generateMarkdownReport(evaluation);
      await fs.writeFile(
        path.join(this.reportsDir, 'FounderReport.md'),
        report
      );

      console.log(`📄 Report generated: ${path.join(this.reportsDir, 'FounderReport.md')}`);
      
      return evaluation;
    } catch (error) {
      console.error('❌ AI evaluation failed:', error);
      throw error;
    }
  }

  generateMarkdownReport(evaluation) {
    const screenshots = this.screenshots.map((screenshot, index) => 
      `![Step ${index + 1}](./${path.basename(screenshot)})`
    ).join('\n\n');

    return `# Founder Evaluation Report

**Persona:** ${this.persona.id}  
**Goal:** ${this.persona.goal}  
**Task:** ${this.persona.task}  
**Generated:** ${new Date().toISOString()}

## Executive Summary

${evaluation.summary}

## Rubric Scores

| Criteria | Score | Justification |
|----------|-------|---------------|
${Object.entries(evaluation.rubric).map(([key, value]) => 
  `| ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} | ${value.score}/5 | ${value.justification} |`
).join('\n')}

## Overall Score

**${Object.values(evaluation.rubric).reduce((sum, r) => sum + r.score, 0) / Object.keys(evaluation.rubric).length}/5**

## Verdict

**${evaluation.verdict.toUpperCase()}**

## Top Blockers

${evaluation.blockers ? evaluation.blockers.map((blocker, index) => `${index + 1}. ${blocker}`).join('\n') : 'No blockers identified'}

## Quick Wins

${evaluation.quickWins ? evaluation.quickWins.map((win, index) => `${index + 1}. ${win}`).join('\n') : 'No quick wins identified'}

## Step-by-Step Analysis

${this.steps.map((step, index) => `
### Step ${index + 1}: ${step.description}
- **Timestamp:** ${step.timestamp}
- **Duration:** ${step.duration}ms
- **Status:** ${step.success ? '✅ Success' : '❌ Failed'}
${step.result ? `- **Result:** ${JSON.stringify(step.result, null, 2)}` : ''}
${step.error ? `- **Error:** ${step.error}` : ''}
`).join('\n')}

## Screenshots

${screenshots}

## Raw Data

- [Artifacts](./artifacts.json)
- [Evaluation](./evaluation.json)
`;
  }

  async cleanup() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }
}

async function main() {
  const personaArg = process.argv.find(arg => arg.startsWith('--persona='));
  const personaId = personaArg ? personaArg.split('=')[1] : 'indie-marketer';
  
  // Load personas
  const personasYaml = await fs.readFile(path.join(process.cwd(), '.bebrahma-tests', 'personas.yaml'), 'utf8');
  const personas = personasYaml.split('personas:')[1].split('- id:').slice(1).map(p => {
    const lines = p.trim().split('\n');
    return {
      id: lines[0].trim(),
      goal: lines.find(l => l.includes('goal:'))?.split('goal:')[1]?.trim()?.replace(/"/g, '') || '',
      task: lines.find(l => l.includes('task:'))?.split('task:')[1]?.trim()?.replace(/"/g, '') || ''
    };
  });
  
  const persona = personas.find(p => p.id === personaId);
  if (!persona) {
    console.error(`❌ Persona not found: ${personaId}`);
    process.exit(1);
  }

  const runner = new PlaywrightTestRunner(persona);
  
  try {
    await runner.setup();
    await runner.executePersona();
    const evaluation = await runner.generateReport();
    
    console.log('\n🎉 Test completed successfully!');
    console.log(`📊 Overall score: ${Object.values(evaluation.rubric).reduce((sum, r) => sum + r.score, 0) / Object.keys(evaluation.rubric).length}/5`);
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  } finally {
    await runner.cleanup();
  }
}

// Export the class for use in other modules
export { PlaywrightTestRunner };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
