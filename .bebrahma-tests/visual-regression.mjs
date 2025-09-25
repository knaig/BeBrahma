#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Visual Regression Testing System
 * Compares screenshots across test runs to detect UI changes
 */
export class VisualRegressionTester {
  constructor(reportsDir) {
    this.reportsDir = reportsDir;
    this.baselineDir = path.join(reportsDir, '..', 'baselines');
    this.diffDir = path.join(reportsDir, 'diffs');
  }

  async setup() {
    await fs.mkdir(this.baselineDir, { recursive: true });
    await fs.mkdir(this.diffDir, { recursive: true });
  }

  async compareScreenshots(currentScreenshots, runId) {
    console.log('🔍 Running visual regression analysis...');
    
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      new: 0,
      comparisons: []
    };

    for (const screenshot of currentScreenshots) {
      const filename = path.basename(screenshot);
      const baselinePath = path.join(this.baselineDir, filename);
      const diffPath = path.join(this.diffDir, `${runId}-${filename}`);

      results.total++;

      try {
        if (!await this.fileExists(baselinePath)) {
          // New screenshot - copy to baseline
          await fs.copyFile(screenshot, baselinePath);
          results.new++;
          results.comparisons.push({
            filename,
            status: 'new',
            baseline: baselinePath,
            current: screenshot,
            diff: null,
            diffPercentage: 0
          });
          console.log(`📸 New baseline: ${filename}`);
        } else {
          // Compare with baseline
          const comparison = await this.compareImages(screenshot, baselinePath, diffPath);
          results.comparisons.push({
            filename,
            status: comparison.passed ? 'passed' : 'failed',
            baseline: baselinePath,
            current: screenshot,
            diff: comparison.passed ? null : diffPath,
            diffPercentage: comparison.diffPercentage
          });

          if (comparison.passed) {
            results.passed++;
            console.log(`✅ Match: ${filename} (${comparison.diffPercentage.toFixed(2)}% diff)`);
          } else {
            results.failed++;
            console.log(`❌ Diff: ${filename} (${comparison.diffPercentage.toFixed(2)}% diff)`);
          }
        }
      } catch (error) {
        console.error(`Error comparing ${filename}:`, error);
        results.failed++;
        results.comparisons.push({
          filename,
          status: 'error',
          baseline: baselinePath,
          current: screenshot,
          diff: null,
          diffPercentage: 100,
          error: error.message
        });
      }
    }

    console.log(`📊 Visual regression results: ${results.passed}/${results.total} passed, ${results.failed} failed, ${results.new} new`);
    return results;
  }

  async compareImages(currentPath, baselinePath, diffPath) {
    const currentImage = await this.loadPNG(currentPath);
    const baselineImage = await this.loadPNG(baselinePath);

    const { width, height } = currentImage;
    const diff = new PNG({ width, height });

    const diffPixels = pixelmatch(
      currentImage.data,
      baselineImage.data,
      diff.data,
      width,
      height,
      {
        threshold: 0.1, // 10% threshold for differences
        alpha: 0.1,
        diffColor: [255, 0, 0], // Red for differences
        diffColorAlt: [0, 255, 0] // Green for differences (alternative)
      }
    );

    const diffPercentage = (diffPixels / (width * height)) * 100;
    const passed = diffPercentage < 5; // 5% threshold for passing

    if (!passed) {
      // Save diff image
      await this.savePNG(diff, diffPath);
    }

    return {
      passed,
      diffPixels,
      diffPercentage,
      diffPath: passed ? null : diffPath
    };
  }

  async loadPNG(imagePath) {
    return new Promise((resolve, reject) => {
      const image = new PNG();
      const stream = fs.createReadStream(imagePath);
      
      stream.pipe(image);
      
      image.on('parsed', () => {
        resolve(image);
      });
      
      image.on('error', reject);
    });
  }

  async savePNG(image, outputPath) {
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(outputPath);
      
      image.pack().pipe(stream);
      
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async generateVisualRegressionReport(comparisonResults, runId) {
    const reportPath = path.join(this.reportsDir, 'visual-regression-report.md');
    
    let report = `# Visual Regression Report

**Run ID:** ${runId}  
**Date:** ${new Date().toISOString()}  
**Total Screenshots:** ${comparisonResults.total}

## Summary

- ✅ **Passed:** ${comparisonResults.passed}
- ❌ **Failed:** ${comparisonResults.failed}  
- 📸 **New:** ${comparisonResults.new}

## Detailed Results

| Screenshot | Status | Diff % | Baseline | Current | Diff |
|------------|--------|--------|----------|---------|------|
`;

    for (const comparison of comparisonResults.comparisons) {
      const status = comparison.status === 'passed' ? '✅' : 
                    comparison.status === 'failed' ? '❌' : 
                    comparison.status === 'new' ? '📸' : '⚠️';
      
      const diffPercent = comparison.diffPercentage ? `${comparison.diffPercentage.toFixed(2)}%` : 'N/A';
      const baselineLink = comparison.baseline ? `[Baseline](${path.basename(comparison.baseline)})` : 'N/A';
      const currentLink = comparison.current ? `[Current](${path.basename(comparison.current)})` : 'N/A';
      const diffLink = comparison.diff ? `[Diff](${path.basename(comparison.diff)})` : 'N/A';

      report += `| ${comparison.filename} | ${status} | ${diffPercent} | ${baselineLink} | ${currentLink} | ${diffLink} |\n`;
    }

    report += `
## Recommendations

`;

    if (comparisonResults.failed > 0) {
      report += `⚠️ **${comparisonResults.failed} screenshots have visual differences.** Please review the diff images to determine if changes are intentional or represent UI regressions.\n\n`;
    }

    if (comparisonResults.new > 0) {
      report += `📸 **${comparisonResults.new} new screenshots added to baseline.** These will be used as the new reference for future comparisons.\n\n`;
    }

    if (comparisonResults.passed > 0) {
      report += `✅ **${comparisonResults.passed} screenshots match baseline.** No visual changes detected.\n\n`;
    }

    report += `## Next Steps

1. **Review Failed Comparisons**: Check diff images for unintended UI changes
2. **Update Baselines**: If changes are intentional, they will automatically become new baselines
3. **Investigate Failures**: Look for patterns in failed comparisons (e.g., timing issues, dynamic content)
4. **Optimize Thresholds**: Adjust diff thresholds if needed for better accuracy

## Technical Details

- **Diff Threshold**: 5% (configurable)
- **Baseline Directory**: \`${this.baselineDir}\`
- **Diff Directory**: \`${this.diffDir}\`
- **Image Format**: PNG
- **Comparison Algorithm**: Pixelmatch with alpha channel support
`;

    await fs.writeFile(reportPath, report);
    console.log(`📊 Visual regression report generated: ${reportPath}`);
    return reportPath;
  }

  async cleanupOldDiffs(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    try {
      const files = await fs.readdir(this.diffDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.diffDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`🗑️ Cleaned up old diff: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old diffs:', error);
    }
  }

  async getBaselineList() {
    try {
      const files = await fs.readdir(this.baselineDir);
      return files.filter(file => file.endsWith('.png'));
    } catch {
      return [];
    }
  }

  async updateBaseline(screenshotPath, filename) {
    const baselinePath = path.join(this.baselineDir, filename);
    await fs.copyFile(screenshotPath, baselinePath);
    console.log(`📸 Updated baseline: ${filename}`);
  }

  async deleteBaseline(filename) {
    const baselinePath = path.join(this.baselineDir, filename);
    try {
      await fs.unlink(baselinePath);
      console.log(`🗑️ Deleted baseline: ${filename}`);
    } catch (error) {
      console.error(`Error deleting baseline ${filename}:`, error);
    }
  }
}

export default VisualRegressionTester;
