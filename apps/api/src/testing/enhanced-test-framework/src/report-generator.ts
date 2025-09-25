import { TestCycle } from './types';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import moment from 'moment';

export class ReportGenerator {
  async generateCycleReport(cycle: TestCycle, outputDirectory: string): Promise<void> {
    console.log(chalk.blue('\n📊 Generating comprehensive reports...'));
    
    try {
      const cycleDir = path.join(outputDirectory, cycle.id);
      await fs.ensureDir(cycleDir);
      
      // Generate JSON report
      await this.generateJsonReport(cycle, cycleDir);
      
      // Generate Markdown report
      await this.generateMarkdownReport(cycle, cycleDir);
      
      // Generate HTML report
      await this.generateHtmlReport(cycle, cycleDir);
      
      // Generate executive summary
      await this.generateExecutiveSummary(cycle, cycleDir);
      
      console.log(chalk.green(`✅ Reports generated in: ${cycleDir}`));
      
    } catch (error) {
      console.log(chalk.red(`❌ Failed to generate reports: ${error.message}`));
      throw error;
    }
  }

  private async generateJsonReport(cycle: TestCycle, cycleDir: string): Promise<void> {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        cycleId: cycle.id,
        cycleName: cycle.name,
        version: cycle.version
      },
      summary: {
        status: cycle.status,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        duration: cycle.endDate ? new Date(cycle.endDate).getTime() - new Date(cycle.startDate).getTime() : 0,
        totalTests: cycle.results.totalTests,
        passedTests: cycle.results.passedTests,
        failedTests: cycle.results.failedTests,
        skippedTests: cycle.results.skippedTests,
        passRate: cycle.results.totalTests > 0 ? (cycle.results.passedTests / cycle.results.totalTests) * 100 : 0
      },
      scores: cycle.results.scores,
      performance: cycle.results.performanceMetrics,
      testSuites: cycle.testSuites.map(suite => ({
        id: suite.id,
        name: suite.name,
        priority: suite.priority,
        estimatedDuration: suite.estimatedDuration,
        conversationFlows: suite.conversationFlows.length
      })),
      detailedResults: cycle.results.detailedResults,
      changes: cycle.changes,
      observations: cycle.observations,
      recommendations: cycle.recommendations,
      competitiveAnalysis: cycle.competitiveAnalysis
    };
    
    await fs.writeJson(path.join(cycleDir, 'comprehensive-report.json'), report, { spaces: 2 });
  }

  private async generateMarkdownReport(cycle: TestCycle, cycleDir: string): Promise<void> {
    const markdown = this.createMarkdownContent(cycle);
    await fs.writeFile(path.join(cycleDir, 'cycle-report.md'), markdown);
  }

  private async generateHtmlReport(cycle: TestCycle, cycleDir: string): Promise<void> {
    const html = this.createHtmlContent(cycle);
    await fs.writeFile(path.join(cycleDir, 'cycle-report.html'), html);
  }

  private async generateExecutiveSummary(cycle: TestCycle, cycleDir: string): Promise<void> {
    const summary = this.createExecutiveSummary(cycle);
    await fs.writeFile(path.join(cycleDir, 'executive-summary.md'), summary);
  }

  private createMarkdownContent(cycle: TestCycle): string {
    const duration = cycle.endDate ? 
      moment.duration(new Date(cycle.endDate).getTime() - new Date(cycle.startDate).getTime()).humanize() : 
      'In Progress';
    
    const passRate = cycle.results.totalTests > 0 ? 
      ((cycle.results.passedTests / cycle.results.totalTests) * 100).toFixed(1) : '0';
    
    return `# 🧪 Test Cycle Report: ${cycle.name}

## 📋 **Executive Summary**

| Metric | Value |
|--------|-------|
| **Cycle ID** | ${cycle.id} |
| **Status** | ${cycle.status} |
| **Start Date** | ${moment(cycle.startDate).format('YYYY-MM-DD HH:mm:ss')} |
| **Duration** | ${duration} |
| **Total Tests** | ${cycle.results.totalTests} |
| **Passed Tests** | ${cycle.results.passedTests} |
| **Failed Tests** | ${cycle.results.failedTests} |
| **Pass Rate** | ${passRate}% |
| **Overall Score** | ${cycle.results.scores.overallScore.toFixed(2)}/10 |

## 🎯 **Quality Metrics**

### **Detailed Scores**
- **Context Retention**: ${cycle.results.scores.contextRetention.toFixed(2)}/10
- **Response Relevance**: ${cycle.results.scores.responseRelevance.toFixed(2)}/10
- **Conversation Continuity**: ${cycle.results.scores.conversationContinuity.toFixed(2)}/10
- **Business Insight Quality**: ${cycle.results.scores.businessInsightQuality.toFixed(2)}/10
- **Response Coherence**: ${cycle.results.scores.responseCoherence.toFixed(2)}/10

### **Performance Metrics**
- **Execution Time**: ${(cycle.results.executionTime / 1000).toFixed(2)} seconds
- **Average Response Time**: ${(cycle.results.performanceMetrics.averageResponseTime / 1000).toFixed(2)} seconds
- **API Call Count**: ${cycle.results.performanceMetrics.apiCallCount}
- **Error Rate**: ${cycle.results.performanceMetrics.errorRate.toFixed(2)}%

## 📊 **Test Suite Results**

${cycle.testSuites.map(suite => `
### **${suite.name}**
- **Priority**: ${suite.priority}
- **Estimated Duration**: ${suite.estimatedDuration} minutes
- **Conversation Flows**: ${suite.conversationFlows.length}
- **Description**: ${suite.description}
`).join('')}

## 🔍 **Detailed Test Results**

${cycle.results.detailedResults.map(result => `
### **${result.conversationFlow.name}**
- **Status**: ${result.status === 'passed' ? '✅ Passed' : '❌ Failed'}
- **Average Score**: ${result.scores.averageScore.toFixed(2)}/10
- **Execution Time**: ${(result.executionTime / 1000).toFixed(2)} seconds
- **User Persona**: ${result.conversationFlow.userPersona.name} (${result.conversationFlow.userPersona.expertise})
- **Business Domain**: ${result.conversationFlow.businessDomain}
- **Complexity**: ${result.conversationFlow.complexity}

**Scores:**
- Context Retention: ${result.scores.contextRetention}/10
- Response Relevance: ${result.scores.responseRelevance}/10
- Conversation Continuity: ${result.scores.conversationContinuity}/10
- Business Insight Quality: ${result.scores.businessInsightQuality}/10
- Response Coherence: ${result.scores.responseCoherence}/10

**Feedback:**
${result.feedback.map(f => `- ${f}`).join('\n')}

**Recommendations:**
${result.recommendations.map(r => `- ${r}`).join('\n')}
`).join('')}

## 🔧 **Code Changes**

${cycle.changes.length > 0 ? cycle.changes.map(change => `
### **${change.description}**
- **Type**: ${change.changeType}
- **File Path**: ${change.filePath}
- **Reason**: ${change.reason}
- **Impact**: ${change.impact}
- **Status**: ${change.status}
`).join('') : 'No code changes identified in this cycle.'}

## 📝 **Observations**

${cycle.observations.length > 0 ? cycle.observations.map(obs => `- ${obs}`).join('\n') : 'No specific observations for this cycle.'}

## 💡 **Recommendations**

${cycle.recommendations.length > 0 ? cycle.recommendations.map(rec => `- ${rec}`).join('\n') : 'No specific recommendations for this cycle.'}

## 🏆 **Competitive Analysis**

${cycle.competitiveAnalysis ? `
### **Comparison with ${cycle.competitiveAnalysis.competitor}**

**Our Scores:**
- Context Retention: ${cycle.results.scores.contextRetention.toFixed(2)}/10
- Response Relevance: ${cycle.results.scores.responseRelevance.toFixed(2)}/10
- Business Insight Quality: ${cycle.results.scores.businessInsightQuality.toFixed(2)}/10

**Their Scores:**
- Context Retention: ${cycle.competitiveAnalysis.comparisonMetrics.contextRetention.toFixed(2)}/10
- Response Relevance: ${cycle.competitiveAnalysis.comparisonMetrics.responseRelevance.toFixed(2)}/10
- Business Insight Quality: ${cycle.competitiveAnalysis.comparisonMetrics.businessInsightQuality.toFixed(2)}/10

**Competitive Advantage**: ${cycle.competitiveAnalysis.competitiveAdvantage}

**Our Advantages:**
${cycle.competitiveAnalysis.advantages.map(adv => `- ${adv}`).join('\n')}

**Areas for Improvement:**
${cycle.competitiveAnalysis.gaps.map(gap => `- ${gap}`).join('\n')}

**Strategic Recommendations:**
${cycle.competitiveAnalysis.recommendations.map(rec => `- ${rec}`).join('\n')}
` : 'No competitive analysis performed in this cycle.'}

## 📈 **Next Steps**

Based on the results of this test cycle:

1. **Immediate Actions**: ${this.getImmediateActions(cycle)}
2. **Short-term Improvements**: ${this.getShortTermImprovements(cycle)}
3. **Long-term Strategy**: ${this.getLongTermStrategy(cycle)}

---

*Report generated on ${moment().format('YYYY-MM-DD HH:mm:ss')}*
*Cycle ID: ${cycle.id}*
`;
  }

  private createHtmlContent(cycle: TestCycle): string {
    const duration = cycle.endDate ? 
      moment.duration(new Date(cycle.endDate).getTime() - new Date(cycle.startDate).getTime()).humanize() : 
      'In Progress';
    
    const passRate = cycle.results.totalTests > 0 ? 
      ((cycle.results.passedTests / cycle.results.totalTests) * 100).toFixed(1) : '0';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Cycle Report: ${cycle.name}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #1e40af; margin-top: 30px; }
        h3 { color: #374151; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; }
        .metric-value { font-size: 24px; font-weight: bold; color: #1e40af; }
        .metric-label { color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .scores-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .score-card { background: #f0f9ff; padding: 15px; border-radius: 6px; text-align: center; }
        .score-value { font-size: 20px; font-weight: bold; color: #0369a1; }
        .score-label { color: #0c4a6e; font-size: 12px; }
        .status-passed { color: #059669; }
        .status-failed { color: #dc2626; }
        .status-skipped { color: #d97706; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; color: #374151; }
        .progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: #2563eb; transition: width 0.3s ease; }
        .chart-container { margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Test Cycle Report: ${cycle.name}</h1>
        
        <h2>📋 Executive Summary</h2>
        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-value">${cycle.id}</div>
                <div class="metric-label">Cycle ID</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${cycle.status}</div>
                <div class="metric-label">Status</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${moment(cycle.startDate).format('MMM DD, YYYY')}</div>
                <div class="metric-label">Start Date</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${duration}</div>
                <div class="metric-label">Duration</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${cycle.results.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${passRate}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${cycle.results.scores.overallScore.toFixed(2)}/10</div>
                <div class="metric-label">Overall Score</div>
            </div>
        </div>

        <h2>🎯 Quality Metrics</h2>
        <div class="scores-grid">
            <div class="score-card">
                <div class="score-value">${cycle.results.scores.contextRetention.toFixed(1)}</div>
                <div class="score-label">Context Retention</div>
            </div>
            <div class="score-card">
                <div class="score-value">${cycle.results.scores.responseRelevance.toFixed(1)}</div>
                <div class="score-label">Response Relevance</div>
            </div>
            <div class="score-card">
                <div class="score-value">${cycle.results.scores.conversationContinuity.toFixed(1)}</div>
                <div class="score-label">Conversation Continuity</div>
            </div>
            <div class="score-card">
                <div class="score-value">${cycle.results.scores.businessInsightQuality.toFixed(1)}</div>
                <div class="score-label">Business Insight Quality</div>
            </div>
            <div class="score-card">
                <div class="score-value">${cycle.results.scores.responseCoherence.toFixed(1)}</div>
                <div class="score-label">Response Coherence</div>
            </div>
        </div>

        <h2>📊 Test Results Breakdown</h2>
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Duration</th>
                    <th>User Persona</th>
                </tr>
            </thead>
            <tbody>
                ${cycle.results.detailedResults.map(result => `
                <tr>
                    <td>${result.conversationFlow.name}</td>
                    <td class="status-${result.status}">${result.status === 'passed' ? '✅ Passed' : '❌ Failed'}</td>
                    <td>${result.scores.averageScore.toFixed(1)}/10</td>
                    <td>${(result.executionTime / 1000).toFixed(2)}s</td>
                    <td>${result.conversationFlow.userPersona.name}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>🔧 Code Changes</h2>
        ${cycle.changes.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Impact</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${cycle.changes.map(change => `
                <tr>
                    <td>${change.description}</td>
                    <td>${change.changeType}</td>
                    <td>${change.impact}</td>
                    <td>${change.status}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<p>No code changes identified in this cycle.</p>'}

        <h2>💡 Recommendations</h2>
        <ul>
            ${cycle.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>

        ${cycle.competitiveAnalysis ? `
        <h2>🏆 Competitive Analysis</h2>
        <div class="chart-container">
            <h3>Comparison with ${cycle.competitiveAnalysis.competitor}</h3>
            <p><strong>Competitive Advantage:</strong> ${cycle.competitiveAnalysis.competitiveAdvantage}</p>
            <p><strong>Key Advantages:</strong></p>
            <ul>
                ${cycle.competitiveAnalysis.advantages.map(adv => `<li>${adv}</li>`).join('')}
            </ul>
            <p><strong>Areas for Improvement:</strong></p>
            <ul>
                ${cycle.competitiveAnalysis.gaps.map(gap => `<li>${gap}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <h2>📈 Next Steps</h2>
        <div class="chart-container">
            <h3>Immediate Actions</h3>
            <p>${this.getImmediateActions(cycle)}</p>
            
            <h3>Short-term Improvements</h3>
            <p>${this.getShortTermImprovements(cycle)}</p>
            
            <h3>Long-term Strategy</h3>
            <p>${this.getLongTermStrategy(cycle)}</p>
        </div>
    </div>
</body>
</html>`;
  }

  private createExecutiveSummary(cycle: TestCycle): string {
    const passRate = cycle.results.totalTests > 0 ? 
      ((cycle.results.passedTests / cycle.results.totalTests) * 100).toFixed(1) : '0';
    
    return `# 📊 Executive Summary - Test Cycle: ${cycle.name}

## 🎯 **Key Results**

- **Overall Score**: ${cycle.results.scores.overallScore.toFixed(2)}/10
- **Test Success Rate**: ${passRate}% (${cycle.results.passedTests}/${cycle.results.totalTests})
- **Execution Time**: ${(cycle.results.executionTime / 1000).toFixed(2)} seconds
- **Status**: ${cycle.status}

## 🚨 **Critical Findings**

${this.getCriticalFindings(cycle)}

## 💡 **Top Recommendations**

${this.getTopRecommendations(cycle)}

## 📈 **Performance Summary**

- **Context Retention**: ${cycle.results.scores.contextRetention.toFixed(2)}/10
- **Business Insight Quality**: ${cycle.results.scores.businessInsightQuality.toFixed(2)}/10
- **Response Relevance**: ${cycle.results.scores.responseRelevance.toFixed(2)}/10

## 🔧 **Required Actions**

${this.getRequiredActions(cycle)}

## 🏆 **Competitive Position**

${cycle.competitiveAnalysis ? 
  `**${cycle.competitiveAnalysis.competitiveAdvantage}** against ${cycle.competitiveAnalysis.competitor}` : 
  'No competitive analysis performed'}

---

*Generated on ${moment().format('YYYY-MM-DD HH:mm:ss')}*
*Cycle ID: ${cycle.id}*`;
  }

  private getImmediateActions(cycle: TestCycle): string {
    if (cycle.results.failedTests > 0) {
      return `Address ${cycle.results.failedTests} failing tests and investigate root causes.`;
    }
    if (cycle.results.scores.overallScore < 7.0) {
      return 'Focus on improving conversation quality scores to meet target of 7.0/10.';
    }
    return 'Review test results and plan next iteration improvements.';
  }

  private getShortTermImprovements(cycle: TestCycle): string {
    const improvements = [];
    
    if (cycle.results.scores.contextRetention < 7.0) {
      improvements.push('Enhance context retention capabilities');
    }
    if (cycle.results.scores.businessInsightQuality < 7.0) {
      improvements.push('Improve business domain expertise');
    }
    if (cycle.results.executionTime > 150000) {
      improvements.push('Optimize test execution performance');
    }
    
    return improvements.length > 0 ? improvements.join(', ') : 'Maintain current performance levels';
  }

  private getLongTermStrategy(cycle: TestCycle): string {
    if (cycle.competitiveAnalysis && cycle.competitiveAnalysis.gaps.length > 0) {
      return `Build sustainable competitive advantage by addressing ${cycle.competitiveAnalysis.gaps.length} identified gaps and leveraging ${cycle.competitiveAnalysis.advantages.length} competitive strengths.`;
    }
    return 'Continue iterative improvement cycles to maintain and enhance conversation quality.';
  }

  private getCriticalFindings(cycle: TestCycle): string {
    const findings = [];
    
    if (cycle.results.failedTests > 0) {
      findings.push(`**${cycle.results.failedTests} tests failed** - Requires immediate attention`);
    }
    if (cycle.results.scores.overallScore < 7.0) {
      findings.push(`**Overall score ${cycle.results.scores.overallScore.toFixed(2)}/10** - Below target threshold`);
    }
    if (cycle.results.performanceMetrics.errorRate > 5) {
      findings.push(`**Error rate ${cycle.results.performanceMetrics.errorRate.toFixed(1)}%** - System stability concerns`);
    }
    
    return findings.length > 0 ? findings.map(f => `- ${f}`).join('\n') : 'All critical metrics are within acceptable ranges.';
  }

  private getTopRecommendations(cycle: TestCycle): string {
    const recommendations = cycle.recommendations.slice(0, 3);
    return recommendations.map(rec => `- ${rec}`).join('\n');
  }

  private getRequiredActions(cycle: TestCycle): string {
    const actions = [];
    
    if (cycle.changes.length > 0) {
      actions.push(`Implement ${cycle.changes.length} identified code changes`);
    }
    if (cycle.results.scores.overallScore < 7.0) {
      actions.push('Improve conversation quality metrics');
    }
    if (cycle.results.failedTests > 0) {
      actions.push('Fix failing test cases');
    }
    
    return actions.length > 0 ? actions.map(a => `- ${a}`).join('\n') : 'No immediate actions required.';
  }
}
