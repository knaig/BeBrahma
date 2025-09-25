import { TestCycle, TestSuite } from './types';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

export class CycleManager {
  private cyclesDirectory: string;

  constructor() {
    this.cyclesDirectory = path.join(process.cwd(), 'test-results');
  }

  async createNewCycle(name: string, version: string = '1.0.0'): Promise<TestCycle> {
    const cycleId = `cycle-${Date.now()}`;
    const cycle: TestCycle = {
      id: cycleId,
      name,
      version,
      startDate: new Date(),
      status: 'planned',
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
    const cycleDir = path.join(this.cyclesDirectory, cycleId);
    await fs.ensureDir(cycleDir);

    // Save cycle metadata
    await this.saveCycle(cycle);

    console.log(chalk.green(`✅ Created new test cycle: ${name} (${cycleId})`));
    return cycle;
  }

  async loadCycle(cycleId: string): Promise<TestCycle | null> {
    try {
      const cycleDir = path.join(this.cyclesDirectory, cycleId);
      const cycleDataPath = path.join(cycleDir, 'cycle-data.json');
      
      if (await fs.pathExists(cycleDataPath)) {
        const cycleData = await fs.readJson(cycleDataPath);
        return cycleData as TestCycle;
      }
      
      return null;
    } catch (error) {
      console.log(chalk.red(`❌ Failed to load cycle ${cycleId}: ${error.message}`));
      return null;
    }
  }

  async saveCycle(cycle: TestCycle): Promise<void> {
    try {
      const cycleDir = path.join(this.cyclesDirectory, cycle.id);
      await fs.ensureDir(cycleDir);
      
      // Save cycle data
      await fs.writeJson(path.join(cycleDir, 'cycle-data.json'), cycle, { spaces: 2 });
      
      // Save test results
      await fs.writeJson(path.join(cycleDir, 'test-results.json'), cycle.results, { spaces: 2 });
      
      // Save changes
      if (cycle.changes.length > 0) {
        await fs.writeJson(path.join(cycleDir, 'changes.json'), cycle.changes, { spaces: 2 });
      }
      
      // Save observations
      if (cycle.observations.length > 0) {
        await fs.writeJson(path.join(cycleDir, 'observations.json'), cycle.observations, { spaces: 2 });
      }
      
      // Save recommendations
      if (cycle.recommendations.length > 0) {
        await fs.writeJson(path.join(cycleDir, 'recommendations.json'), cycle.recommendations, { spaces: 2 });
      }
      
      // Save competitive analysis if available
      if (cycle.competitiveAnalysis) {
        await fs.writeJson(path.join(cycleDir, 'competitive-analysis.json'), cycle.competitiveAnalysis, { spaces: 2 });
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Failed to save cycle ${cycle.id}: ${error.message}`));
      throw error;
    }
  }

  async listCycles(): Promise<TestCycle[]> {
    try {
      if (!await fs.pathExists(this.cyclesDirectory)) {
        return [];
      }
      
      const cycleDirs = await fs.readdir(this.cyclesDirectory);
      const cycles: TestCycle[] = [];
      
      for (const cycleDir of cycleDirs) {
        const cycleDataPath = path.join(this.cyclesDirectory, cycleDir, 'cycle-data.json');
        if (await fs.pathExists(cycleDataPath)) {
          try {
            const cycleData = await fs.readJson(cycleDataPath);
            cycles.push(cycleData as TestCycle);
          } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to load cycle ${cycleDir}: ${error.message}`));
          }
        }
      }
      
      // Sort by start date (newest first)
      return cycles.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      
    } catch (error) {
      console.log(chalk.red(`❌ Failed to list cycles: ${error.message}`));
      return [];
    }
  }

  async getCycleSummary(cycleId: string): Promise<any> {
    try {
      const cycle = await this.loadCycle(cycleId);
      if (!cycle) {
        return null;
      }
      
      const cycleDir = path.join(this.cyclesDirectory, cycleId);
      
      // Get file sizes and modification times
      const files = await this.getCycleFiles(cycleDir);
      
      return {
        id: cycle.id,
        name: cycle.name,
        version: cycle.version,
        status: cycle.status,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        duration: cycle.endDate ? new Date(cycle.endDate).getTime() - new Date(cycle.startDate).getTime() : 0,
        testSuites: cycle.testSuites.length,
        totalTests: cycle.results.totalTests,
        passedTests: cycle.results.passedTests,
        failedTests: cycle.results.failedTests,
        overallScore: cycle.results.scores.overallScore,
        changes: cycle.changes.length,
        observations: cycle.observations.length,
        recommendations: cycle.recommendations.length,
        hasCompetitiveAnalysis: !!cycle.competitiveAnalysis,
        files,
        directory: cycleDir
      };
      
    } catch (error) {
      console.log(chalk.red(`❌ Failed to get cycle summary for ${cycleId}: ${error.message}`));
      return null;
    }
  }

  private async getCycleFiles(cycleDir: string): Promise<any[]> {
    try {
      const files = await fs.readdir(cycleDir);
      const fileInfo = [];
      
      for (const file of files) {
        const filePath = path.join(cycleDir, file);
        const stats = await fs.stat(filePath);
        
        fileInfo.push({
          name: file,
          size: stats.size,
          modified: stats.mtime,
          path: filePath
        });
      }
      
      return fileInfo;
      
    } catch (error) {
      return [];
    }
  }

  async compareCycles(cycleId1: string, cycleId2: string): Promise<any> {
    try {
      const cycle1 = await this.loadCycle(cycleId1);
      const cycle2 = await this.loadCycle(cycleId2);
      
      if (!cycle1 || !cycle2) {
        throw new Error('One or both cycles not found');
      }
      
      const comparison = {
        cycle1: {
          id: cycle1.id,
          name: cycle1.name,
          version: cycle1.version,
          overallScore: cycle1.results.scores.overallScore,
          totalTests: cycle1.results.totalTests,
          passedTests: cycle1.results.passedTests,
          failedTests: cycle1.results.failedTests,
          executionTime: cycle1.results.executionTime
        },
        cycle2: {
          id: cycle2.id,
          name: cycle2.name,
          version: cycle2.version,
          overallScore: cycle2.results.scores.overallScore,
          totalTests: cycle2.results.totalTests,
          passedTests: cycle2.results.passedTests,
          failedTests: cycle2.results.failedTests,
          executionTime: cycle2.results.executionTime
        },
        improvements: {
          scoreChange: cycle2.results.scores.overallScore - cycle1.results.scores.overallScore,
          testCountChange: cycle2.results.totalTests - cycle1.results.totalTests,
          passRateChange: this.calculatePassRate(cycle2) - this.calculatePassRate(cycle1),
          executionTimeChange: cycle2.results.executionTime - cycle1.results.executionTime
        },
        detailedComparison: this.compareDetailedResults(cycle1, cycle2)
      };
      
      return comparison;
      
    } catch (error) {
      console.log(chalk.red(`❌ Failed to compare cycles: ${error.message}`));
      throw error;
    }
  }

  private calculatePassRate(cycle: TestCycle): number {
    if (cycle.results.totalTests === 0) return 0;
    return (cycle.results.passedTests / cycle.results.totalTests) * 100;
  }

  private compareDetailedResults(cycle1: TestCycle, cycle2: TestCycle): any {
    const comparison = {
      contextRetention: {
        cycle1: cycle1.results.scores.contextRetention,
        cycle2: cycle2.results.scores.contextRetention,
        change: cycle2.results.scores.contextRetention - cycle1.results.scores.contextRetention
      },
      responseRelevance: {
        cycle1: cycle1.results.scores.responseRelevance,
        cycle2: cycle2.results.scores.responseRelevance,
        change: cycle2.results.scores.responseRelevance - cycle1.results.scores.responseRelevance
      },
      conversationContinuity: {
        cycle1: cycle1.results.scores.conversationContinuity,
        cycle2: cycle2.results.scores.conversationContinuity,
        change: cycle2.results.scores.conversationContinuity - cycle1.results.scores.conversationContinuity
      },
      businessInsightQuality: {
        cycle1: cycle1.results.scores.businessInsightQuality,
        cycle2: cycle2.results.scores.businessInsightQuality,
        change: cycle2.results.scores.businessInsightQuality - cycle1.results.scores.businessInsightQuality
      },
      responseCoherence: {
        cycle1: cycle1.results.scores.responseCoherence,
        cycle2: cycle2.results.scores.responseCoherence,
        change: cycle2.results.scores.responseCoherence - cycle1.results.scores.responseCoherence
      }
    };
    
    return comparison;
  }

  async archiveCycle(cycleId: string): Promise<void> {
    try {
      const cycle = await this.loadCycle(cycleId);
      if (!cycle) {
        throw new Error(`Cycle ${cycleId} not found`);
      }
      
      const cycleDir = path.join(this.cyclesDirectory, cycleId);
      const archiveDir = path.join(this.cyclesDirectory, 'archived', cycleId);
      
      // Create archive directory
      await fs.ensureDir(path.join(this.cyclesDirectory, 'archived'));
      
      // Move cycle to archive
      await fs.move(cycleDir, archiveDir);
      
      console.log(chalk.green(`✅ Archived cycle ${cycleId} to ${archiveDir}`));
      
    } catch (error) {
      console.log(chalk.red(`❌ Failed to archive cycle ${cycleId}: ${error.message}`));
      throw error;
    }
  }

  async deleteCycle(cycleId: string): Promise<void> {
    try {
      const cycleDir = path.join(this.cyclesDirectory, cycleId);
      
      if (await fs.pathExists(cycleDir)) {
        await fs.remove(cycleDir);
        console.log(chalk.green(`✅ Deleted cycle ${cycleId}`));
      } else {
        console.log(chalk.yellow(`⚠️  Cycle ${cycleId} not found`));
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Failed to delete cycle ${cycleId}: ${error.message}`));
      throw error;
    }
  }

  async exportCycle(cycleId: string, exportPath: string): Promise<void> {
    try {
      const cycle = await this.loadCycle(cycleId);
      if (!cycle) {
        throw new Error(`Cycle ${cycleId} not found`);
      }
      
      const cycleDir = path.join(this.cyclesDirectory, cycleId);
      
      // Create export directory
      await fs.ensureDir(exportPath);
      
      // Copy cycle data to export location
      await fs.copy(cycleDir, path.join(exportPath, cycleId));
      
      console.log(chalk.green(`✅ Exported cycle ${cycleId} to ${exportPath}`));
      
    } catch (error) {
      console.log(chalk.red(`❌ Failed to export cycle ${cycleId}: ${error.message}`));
      throw error;
    }
  }

  async getCycleTrends(): Promise<any> {
    try {
      const cycles = await this.listCycles();
      if (cycles.length < 2) {
        return { message: 'Need at least 2 cycles to analyze trends' };
      }
      
      // Sort by start date
      const sortedCycles = cycles.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      
      const trends = {
        totalCycles: cycles.length,
        dateRange: {
          start: sortedCycles[0].startDate,
          end: sortedCycles[sortedCycles.length - 1].startDate
        },
        scoreTrend: sortedCycles.map(c => ({
          cycle: c.name,
          date: c.startDate,
          score: c.results.scores.overallScore
        })),
        testCountTrend: sortedCycles.map(c => ({
          cycle: c.name,
          date: c.startDate,
          totalTests: c.results.totalTests,
          passedTests: c.results.passedTests
        })),
        executionTimeTrend: sortedCycles.map(c => ({
          cycle: c.name,
          date: c.startDate,
          executionTime: c.results.executionTime
        }))
      };
      
      return trends;
      
    } catch (error) {
      console.log(chalk.red(`❌ Failed to get cycle trends: ${error.message}`));
      return { error: error.message };
    }
  }
}
