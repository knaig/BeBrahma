#!/usr/bin/env node

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

/**
 * Real AI Evaluator using OpenAI API
 * Evaluates BeBrahma user experience using actual LLM
 */
export class AIEvaluator {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(`❌ OPENAI_API_KEY not found in environment variables.
      
Please ensure:
1. Add OPENAI_API_KEY to your .env or .env.local file
2. Get a valid API key from: https://platform.openai.com/api-keys
3. The key should start with 'sk-proj-' or 'sk-'

Example:
OPENAI_API_KEY=sk-proj-your_actual_api_key_here

The system requires real AI evaluation and cannot fallback to simulation.`);
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async evaluateFounderExperience(artifacts, persona, screenshots = []) {
    console.log('🤖 Running AI evaluation with OpenAI...');
    
    try {
      const evaluationPrompt = await this.buildEvaluationPrompt(artifacts, persona, screenshots);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: await this.getSystemPrompt()
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const evaluationText = response.choices[0].message.content;
      const evaluation = this.parseEvaluation(evaluationText);
      
      console.log('✅ AI evaluation completed');
      return evaluation;
      
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('Incorrect API key')) {
        throw new Error(`❌ Invalid OpenAI API key.
        
Please ensure:
1. Your API key is correct and active
2. You have sufficient credits in your OpenAI account
3. The key has access to GPT-4 models

Get a valid API key from: https://platform.openai.com/api-keys

The system requires real AI evaluation and cannot fallback to simulation.`);
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new Error(`❌ OpenAI API rate limit exceeded.
        
Please:
1. Wait a few minutes before retrying
2. Check your OpenAI usage limits
3. Consider upgrading your OpenAI plan if needed

The system requires real AI evaluation and cannot fallback to simulation.`);
      } else {
        throw new Error(`❌ AI evaluation failed: ${error.message}
        
Please ensure:
1. Your internet connection is stable
2. OpenAI API is accessible
3. Your API key has proper permissions

The system requires real AI evaluation and cannot fallback to simulation.`);
      }
    }
  }

  async getSystemPrompt() {
    const promptPath = path.join(process.cwd(), '.bebrahma-tests', 'founder-evaluator.prompt');
    try {
      return await fs.readFile(promptPath, 'utf8');
    } catch (error) {
      return this.getDefaultSystemPrompt();
    }
  }

  getDefaultSystemPrompt() {
    return `You are "Founder Evaluator" for BeBrahma. Judge if the app helps a solo SaaS founder go from problem → solution → GTM prompt quickly.

Rubric (score 1–5; justify with 1–2 sentences + evidence links/screens):

1. Onboarding clarity
2. Problem capture quality
3. Idea quality vs inputs
4. Flow friction (clicks, dead-ends, rework)
5. Copy clarity and guidance
6. Artifacts produced (prompts, BRDs, GTM assets)
7. Would I pay for this? (confidence)

Deliverables:

* Summary (≤150 words)
* Step-by-step notes with timestamps and screenshot refs
* Top 5 blockers (ranked)
* Top 5 quick wins (ranked)
* Verdict: {ship | fix then ship | rethink}`;
  }

  async buildEvaluationPrompt(artifacts, persona, screenshots) {
    const steps = artifacts.steps || [];
    const errors = artifacts.errors || [];
    const success = artifacts.success || false;
    
    let prompt = `# BeBrahma Founder Evaluation Request

## Persona Context
- **ID**: ${persona.id}
- **Goal**: ${persona.goal}
- **Task**: ${persona.task}

## Execution Summary
- **Success**: ${success ? 'Yes' : 'No'}
- **Total Steps**: ${steps.length}
- **Errors**: ${errors.length}
- **Screenshots**: ${screenshots.length}

## Step-by-Step Execution Log
`;

    steps.forEach((step, index) => {
      prompt += `${index + 1}. **${step.timestamp}** - ${step.command}: ${step.success ? '✅' : '❌'}\n`;
      if (step.result) {
        prompt += `   Result: ${JSON.stringify(step.result)}\n`;
      }
      if (step.error) {
        prompt += `   Error: ${step.error}\n`;
      }
      prompt += '\n';
    });

    if (errors.length > 0) {
      prompt += `## Errors Encountered\n`;
      errors.forEach((error, index) => {
        prompt += `${index + 1}. ${error}\n`;
      });
      prompt += '\n';
    }

    if (screenshots.length > 0) {
      prompt += `## Screenshots Available\n`;
      screenshots.forEach((screenshot, index) => {
        prompt += `${index + 1}. ${path.basename(screenshot)}\n`;
      });
      prompt += '\n';
    }

    prompt += `## Evaluation Request

Please evaluate this BeBrahma user experience test run and provide:

1. **Summary** (≤150 words): Overall assessment of the user journey
2. **Rubric Scores** (1-5 scale with justification):
   - Onboarding clarity
   - Problem capture quality  
   - Idea quality vs inputs
   - Flow friction
   - Copy clarity and guidance
   - Artifacts produced
   - Would I pay for this?
3. **Top 5 Blockers** (ranked by severity)
4. **Top 5 Quick Wins** (ranked by impact)
5. **Verdict**: ship | fix then ship | rethink

Format your response as JSON with the following structure:
{
  "summary": "Your summary here",
  "rubric": {
    "onboarding_clarity": {"score": 4, "justification": "Clear navigation and sign-in process"},
    "problem_capture_quality": {"score": 3, "justification": "Good input fields but could use better validation"},
    "idea_quality_vs_inputs": {"score": 4, "justification": "Generated relevant solutions based on input"},
    "flow_friction": {"score": 4, "justification": "Minimal clicks, smooth progression"},
    "copy_clarity_and_guidance": {"score": 3, "justification": "Mostly clear but some ambiguous labels"},
    "artifacts_produced": {"score": 4, "justification": "Generated GTM prompt and exportable assets"},
    "would_i_pay_for_this": {"score": 4, "justification": "High confidence in value proposition"}
  },
  "blockers": [
    "Email validation could be more robust",
    "Project template selection unclear",
    "Export format options limited",
    "Progress indicators could be more detailed",
    "Error handling needs improvement"
  ],
  "quick_wins": [
    "Add progress bar to workflow steps",
    "Improve button labeling", 
    "Add tooltips for complex features",
    "Implement auto-save functionality",
    "Add keyboard shortcuts for power users"
  ],
  "verdict": "fix then ship"
}`;

    return prompt;
  }

  parseEvaluation(evaluationText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = evaluationText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error(`❌ Could not parse JSON from AI response. 
      
The AI evaluation returned an invalid response format. Please check:
1. The OpenAI API key is valid and has sufficient credits
2. The API endpoint is accessible
3. The model 'gpt-4-turbo-preview' is available

The system requires real AI evaluation and cannot fallback to simulation.`);
    } catch (error) {
      if (error.message.includes('Could not parse JSON')) {
        throw error; // Re-throw our custom error
      }
      
      throw new Error(`❌ Error parsing AI evaluation: ${error.message}
      
Please ensure:
1. The AI response format is valid
2. The OpenAI API is returning proper JSON
3. Your API key has sufficient credits

The system requires real AI evaluation and cannot fallback to simulation.`);
    }
  }


  async generateVisualAnalysis(screenshots) {
    if (screenshots.length === 0) {
      throw new Error(`❌ No screenshots available for visual analysis.
      
Please ensure:
1. Screenshots are being captured during test execution
2. Screenshot paths are valid and accessible
3. The test run completed successfully

The system requires real visual analysis and cannot fallback to simulation.`);
    }

    try {
      const prompt = `Analyze these BeBrahma UI screenshots and provide insights on:

1. Visual design quality and consistency
2. User interface clarity and intuitiveness  
3. Navigation flow and information architecture
4. Accessibility and usability concerns
5. Mobile responsiveness (if applicable)
6. Brand consistency and professional appearance

Screenshots: ${screenshots.map(s => path.basename(s)).join(', ')}

Provide a concise analysis focusing on the most important visual and UX issues.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...await Promise.all(screenshots.map(async screenshot => ({
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${await this.encodeImage(screenshot)}`
                }
              })))
            ]
          }
        ],
        max_tokens: 1000
      });

      return response.choices[0].message.content;
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('Incorrect API key')) {
        throw new Error(`❌ Invalid OpenAI API key for visual analysis.
        
Please ensure:
1. Your API key is correct and active
2. You have sufficient credits in your OpenAI account
3. The key has access to GPT-4 Vision models

Get a valid API key from: https://platform.openai.com/api-keys

The system requires real visual analysis and cannot fallback to simulation.`);
      } else {
        throw new Error(`❌ Visual analysis failed: ${error.message}
        
Please ensure:
1. Your internet connection is stable
2. OpenAI API is accessible
3. Your API key has access to GPT-4 Vision models

The system requires real visual analysis and cannot fallback to simulation.`);
      }
    }
  }

  async encodeImage(imagePath) {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      console.error(`Error encoding image ${imagePath}:`, error);
      return null;
    }
  }
}

export default AIEvaluator;
