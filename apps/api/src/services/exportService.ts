import jsPDF from 'jspdf';
import MarkdownIt from 'markdown-it';
import archiver from 'archiver';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface ExportConfig {
  format: 'pdf' | 'markdown' | 'json' | 'csv' | 'html';
  template?: string;
  sections?: string[];
  includeImages?: boolean;
  includeTasks?: boolean;
  includeProgress?: boolean;
  includeTimeline?: boolean;
}

interface TaskExportConfig {
  format: 'csv' | 'pdf' | 'json';
  filters?: {
    status?: string[];
    priority?: string[];
    assigneeId?: string;
    dateRange?: {
      start?: string;
      end?: string;
    };
    category?: string;
  };
  includeDependencies?: boolean;
  includeProgress?: boolean;
}

interface DocumentationConfig {
  type: 'user_guide' | 'technical_docs' | 'api_docs' | 'workflow_guide';
  format: 'pdf' | 'markdown' | 'html';
  includeScreenshots?: boolean;
  includeCodeExamples?: boolean;
  template?: string;
}

interface CustomExportConfig {
  name: string;
  format: 'pdf' | 'markdown' | 'csv' | 'json' | 'html';
  template?: string;
  sections: string[];
  filters?: Record<string, any>;
  schedule?: {
    enabled: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
  };
}

interface ExportResult {
  exportId: string;
  filename: string;
  filePath: string;
  size: number;
  expiresAt: Date;
}

interface DownloadInfo {
  filename: string;
  contentType: string;
  size: number;
  filePath: string;
}

class ExportService {
  private readonly exportDir: string;
  private readonly tempDir: string;
  private readonly markdown: MarkdownIt;

  constructor() {
    this.exportDir = process.env.EXPORT_DIR || path.join(process.cwd(), 'exports');
    this.tempDir = process.env.TEMP_DIR || path.join(process.cwd(), 'temp');
    this.markdown = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });

    // Ensure directories exist
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directories:', error);
    }
  }

  async exportProject(project: any, config: ExportConfig, userId: string): Promise<ExportResult> {
    const exportId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${exportId}.${config.format}`;
    const filePath = path.join(this.exportDir, filename);

    try {
      let content: string | Buffer;

      switch (config.format) {
        case 'pdf':
          content = await this.generateProjectPDF(project, config);
          break;
        case 'markdown':
          content = await this.generateProjectMarkdown(project, config);
          break;
        case 'json':
          content = JSON.stringify(this.sanitizeProjectData(project), null, 2);
          break;
        default:
          throw new Error(`Unsupported export format: ${config.format}`);
      }

      await fs.writeFile(filePath, content);
      const stats = await fs.stat(filePath);

      // Persist export record to database
      const exportRecord = await this.persistExportRecord({
        exportId,
        userId,
        type: 'PROJECT',
        format: config.format.toUpperCase() as any,
        filename: `${project.name}-export-${timestamp}.${config.format}`, // Human-readable name
        filePath,
        size: stats.size,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        metadata: {
          projectId: project.id,
          projectName: project.name,
          sections: config.sections,
          includeTasks: config.includeTasks,
          includeProgress: config.includeProgress,
          includeTimeline: config.includeTimeline,
        },
      });

      return {
        exportId,
        filename: exportRecord.filename, // Return human-readable name
        filePath,
        size: stats.size,
        expiresAt: exportRecord.expiresAt,
      };
    } catch (error) {
      console.error('Project export error:', error);
      throw new Error('Failed to export project');
    }
  }

  async exportTasks(tasks: any[], config: ExportConfig, userId: string): Promise<ExportResult> {
    const exportId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${exportId}.${config.format}`;
    const filePath = path.join(this.exportDir, filename);

    try {
      let content: string | Buffer;

      switch (config.format) {
        case 'csv':
          content = await this.generateTasksCSV(tasks, config);
          break;
        case 'json':
          content = JSON.stringify(this.sanitizeTasksData(tasks), null, 2);
          break;
        case 'markdown':
          content = await this.generateTasksMarkdown(tasks, config);
          break;
        default:
          throw new Error(`Unsupported export format: ${config.format}`);
      }

      await fs.writeFile(filePath, content);
      const stats = await fs.stat(filePath);

      // Persist export record to database
      const exportRecord = await this.persistExportRecord({
        exportId,
        userId,
        type: 'TASKS',
        format: config.format.toUpperCase() as any,
        filename: `tasks-export-${timestamp}.${config.format}`, // Human-readable name
        filePath,
        size: stats.size,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        metadata: {
          taskCount: tasks.length,
          projectIds: [...new Set(tasks.map(t => t.projectId))],
          sections: config.sections,
          includeDependencies: config.includeDependencies,
          includeProgress: config.includeProgress,
        },
      });

      return {
        exportId,
        filename: exportRecord.filename, // Return human-readable name
        filePath,
        size: stats.size,
        expiresAt: exportRecord.expiresAt,
      };
    } catch (error) {
      console.error('Tasks export error:', error);
      throw new Error('Failed to export tasks');
    }
  }

  async exportDocumentation(project: any, config: ExportConfig, userId: string): Promise<ExportResult> {
    const exportId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${exportId}.${config.format}`;
    const filePath = path.join(this.exportDir, filename);

    try {
      let content: string | Buffer;

      switch (config.format) {
        case 'pdf':
          content = await this.generateDocumentationPDF(project, config);
          break;
        case 'markdown':
          content = await this.generateDocumentationMarkdown(project, config);
          break;
        case 'html':
          content = await this.generateDocumentationHTML(project, config);
          break;
        default:
          throw new Error(`Unsupported export format: ${config.format}`);
      }

      await fs.writeFile(filePath, content);
      const stats = await fs.stat(filePath);

      // Persist export record to database
      const exportRecord = await this.persistExportRecord({
        exportId,
        userId,
        type: 'DOCUMENTATION',
        format: config.format.toUpperCase() as any,
        filename: `${project.name}-docs-${timestamp}.${config.format}`, // Human-readable name
        filePath,
        size: stats.size,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        metadata: {
          projectId: project.id,
          projectName: project.name,
          sections: config.sections,
          includeWorkflow: config.includeWorkflow,
          includeProgress: config.includeProgress,
          includeTimeline: config.includeTimeline,
        },
      });

      return {
        exportId,
        filename: exportRecord.filename, // Return human-readable name
        filePath,
        size: stats.size,
        expiresAt: exportRecord.expiresAt,
      };
    } catch (error) {
      console.error('Documentation export error:', error);
      throw new Error('Failed to export documentation');
    }
  }

  async exportCustom(data: any, config: ExportConfig, userId: string): Promise<ExportResult> {
    const exportId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${exportId}.${config.format}`;
    const filePath = path.join(this.exportDir, filename);

    try {
      let content: string | Buffer;

      switch (config.format) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          break;
        case 'csv':
          content = await this.generateCustomCSV(data, config);
          break;
        case 'markdown':
          content = await this.generateCustomMarkdown(data, config);
          break;
        default:
          throw new Error(`Unsupported export format: ${config.format}`);
      }

      await fs.writeFile(filePath, content);
      const stats = await fs.stat(filePath);

      // Persist export record to database
      const exportRecord = await this.persistExportRecord({
        exportId,
        userId,
        type: 'CUSTOM',
        format: config.format.toUpperCase() as any,
        filename: `custom-export-${timestamp}.${config.format}`, // Human-readable name
        filePath,
        size: stats.size,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        metadata: {
          dataType: typeof data,
          dataKeys: Array.isArray(data) ? data.length : Object.keys(data),
          sections: config.sections,
          customConfig: config,
        },
      });

      return {
        exportId,
        filename: exportRecord.filename, // Return human-readable name
        filePath,
        size: stats.size,
        expiresAt: exportRecord.expiresAt,
      };
    } catch (error) {
      console.error('Custom export error:', error);
      throw new Error('Failed to export custom data');
    }
  }

  private async generateProjectPDF(project: any, config: ExportConfig): Promise<Buffer> {
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.text(project.name, 20, yPosition);
    yPosition += 15;

    // Project info
    doc.setFontSize(12);
    doc.text(`Workflow Step: ${project.workflowStep}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Progress: ${project.progress}%`, 20, yPosition);
    yPosition += 10;
    doc.text(`Created: ${new Date(project.createdAt).toLocaleDateString()}`, 20, yPosition);
    yPosition += 20;

    // Problems section
    if (project.problems?.length && config.sections?.includes('problems')) {
      doc.setFontSize(16);
      doc.text('Problems', 20, yPosition);
      yPosition += 10;
      doc.setFontSize(10);

      for (const problem of project.problems) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(problem.rawInput, 20, yPosition, { maxWidth: 170 });
        yPosition += 15;
      }
      yPosition += 10;
    }

    // Solutions section
    if (project.solutions?.length && config.sections?.includes('solutions')) {
      doc.setFontSize(16);
      doc.text('Solutions', 20, yPosition);
      yPosition += 10;
      doc.setFontSize(10);

      for (const solution of project.solutions) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`${solution.title}: ${solution.description || ''}`, 20, yPosition, { maxWidth: 170 });
        yPosition += 15;
      }
      yPosition += 10;
    }

    // Tasks section
    if (project.boards?.length && config.includeTasks) {
      doc.setFontSize(16);
      doc.text('Tasks', 20, yPosition);
      yPosition += 10;
      doc.setFontSize(10);

      for (const board of project.boards) {
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text(board.name, 20, yPosition);
        yPosition += 8;
        doc.setFontSize(10);

        for (const task of board.tasks) {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(`• ${task.title} (${task.status})`, 25, yPosition);
          yPosition += 8;
        }
        yPosition += 10;
      }
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async generateProjectMarkdown(project: any, config: ExportConfig): Promise<string> {
    let markdown = `# ${project.name}\n\n`;

    // Project metadata
    markdown += `## Project Information\n\n`;
    markdown += `- **Workflow Step:** ${project.workflowStep}\n`;
    markdown += `- **Progress:** ${project.progress}%\n`;
    markdown += `- **Created:** ${new Date(project.createdAt).toLocaleDateString()}\n`;
    markdown += `- **Last Updated:** ${new Date(project.updatedAt).toLocaleDateString()}\n\n`;

    if (project.selectedSolution) {
      markdown += `- **Selected Solution:** ${project.selectedSolution}\n\n`;
    }

    // Problems
    if (project.problems?.length && config.sections?.includes('problems')) {
      markdown += `## Problems\n\n`;
      for (const problem of project.problems) {
        markdown += `### Problem ${problem.id}\n\n`;
        markdown += `${problem.rawInput}\n\n`;
        if (problem.clarifiedProblem) {
          markdown += `**Clarified:** ${problem.clarifiedProblem}\n\n`;
        }
      }
    }

    // Solutions
    if (project.solutions?.length && config.sections?.includes('solutions')) {
      markdown += `## Solutions\n\n`;
      for (const solution of project.solutions) {
        markdown += `### ${solution.title}\n\n`;
        if (solution.description) {
          markdown += `${solution.description}\n\n`;
        }
      }
    }

    // Competitors
    if (project.competitors?.length && config.sections?.includes('competitors')) {
      markdown += `## Competitive Analysis\n\n`;
      for (const competitor of project.competitors) {
        markdown += `### ${competitor.name}\n\n`;
        if (competitor.description) {
          markdown += `${competitor.description}\n\n`;
        }
        if (competitor.strengths?.length) {
          markdown += `**Strengths:**\n`;
          for (const strength of competitor.strengths) {
            markdown += `- ${strength}\n`;
          }
          markdown += `\n`;
        }
        if (competitor.weaknesses?.length) {
          markdown += `**Weaknesses:**\n`;
          for (const weakness of competitor.weaknesses) {
            markdown += `- ${weakness}\n`;
          }
          markdown += `\n`;
        }
      }
    }

    // MVP Features
    if (project.mvpFeatures?.length && config.sections?.includes('mvp')) {
      markdown += `## MVP Features\n\n`;
      for (const feature of project.mvpFeatures) {
        markdown += `### ${feature.name}\n\n`;
        if (feature.description) {
          markdown += `${feature.description}\n\n`;
        }
        markdown += `- **Priority:** ${feature.priority}\n`;
        markdown += `- **Effort:** ${feature.effort}\n`;
        markdown += `- **Impact:** ${feature.impact}\n\n`;
        
        if (feature.userStories?.length) {
          markdown += `**User Stories:**\n`;
          for (const story of feature.userStories) {
            markdown += `- ${story}\n`;
          }
          markdown += `\n`;
        }
      }
    }

    // Tasks
    if (project.boards?.length && config.includeTasks) {
      markdown += `## Tasks\n\n`;
      for (const board of project.boards) {
        markdown += `### ${board.name}\n\n`;
        if (board.description) {
          markdown += `${board.description}\n\n`;
        }

        const tasksByStatus = {
          TODO: board.tasks.filter((t: any) => t.status === 'TODO'),
          IN_PROGRESS: board.tasks.filter((t: any) => t.status === 'IN_PROGRESS'),
          IN_REVIEW: board.tasks.filter((t: any) => t.status === 'IN_REVIEW'),
          DONE: board.tasks.filter((t: any) => t.status === 'DONE'),
          BLOCKED: board.tasks.filter((t: any) => t.status === 'BLOCKED'),
        };

        for (const [status, tasks] of Object.entries(tasksByStatus)) {
          if (tasks.length > 0) {
            markdown += `#### ${status.replace('_', ' ')}\n\n`;
            for (const task of tasks) {
              markdown += `- **${task.title}**`;
              if (task.priority) markdown += ` (${task.priority})`;
              if (task.assigneeId) markdown += ` - Assigned to: ${task.assigneeId}`;
              if (task.dueDate) markdown += ` - Due: ${new Date(task.dueDate).toLocaleDateString()}`;
              markdown += `\n`;
              if (task.description) {
                markdown += `  ${task.description}\n`;
              }
            }
            markdown += `\n`;
          }
        }
      }
    }

    return markdown;
  }

  private async generateTasksCSV(tasks: any[], config: TaskExportConfig): Promise<string> {
    const headers = [
      'ID',
      'Title',
      'Description',
      'Status',
      'Priority',
      'Category',
      'Assignee ID',
      'Estimated Hours',
      'Due Date',
      'Created At',
      'Updated At',
      'Completed At',
    ];

    if (config.includeDependencies) {
      headers.push('Dependencies', 'Dependents');
    }

    let csv = headers.join(',') + '\n';

    for (const task of tasks) {
      const row = [
        task.id,
        `"${task.title.replace(/"/g, '""')}"`,
        `"${(task.description || '').replace(/"/g, '""')}"`,
        task.status,
        task.priority,
        task.category,
        task.assigneeId || '',
        task.estimatedHours || '',
        task.dueDate ? new Date(task.dueDate).toISOString() : '',
        new Date(task.createdAt).toISOString(),
        new Date(task.updatedAt).toISOString(),
        task.completedAt ? new Date(task.completedAt).toISOString() : '',
      ];

      if (config.includeDependencies) {
        const dependencies = task.dependencies?.map((d: any) => d.dependsOn.title).join('; ') || '';
        const dependents = task.dependents?.map((d: any) => d.task.title).join('; ') || '';
        row.push(`"${dependencies}"`, `"${dependents}"`);
      }

      csv += row.join(',') + '\n';
    }

    return csv;
  }

  private async generateTasksPDF(tasks: any[], board: any, config: TaskExportConfig): Promise<Buffer> {
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.text(`${board.name} - Tasks Export`, 20, yPosition);
    yPosition += 15;

    // Board info
    doc.setFontSize(12);
    doc.text(`Board: ${board.name}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Project: ${board.project?.name || 'Unknown'}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Total Tasks: ${tasks.length}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 20;

    // Group tasks by status
    const tasksByStatus = {
      TODO: tasks.filter(t => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
      IN_REVIEW: tasks.filter(t => t.status === 'IN_REVIEW'),
      DONE: tasks.filter(t => t.status === 'DONE'),
      BLOCKED: tasks.filter(t => t.status === 'BLOCKED'),
    };

    for (const [status, statusTasks] of Object.entries(tasksByStatus)) {
      if (statusTasks.length === 0) continue;

      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.text(status.replace('_', ' '), 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      for (const task of statusTasks) {
        if (yPosition > 260) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.text(task.title, 25, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.text(`Priority: ${task.priority} | Category: ${task.category}`, 25, yPosition);
        yPosition += 6;

        if (task.assigneeId) {
          doc.text(`Assigned to: ${task.assigneeId}`, 25, yPosition);
          yPosition += 6;
        }

        if (task.dueDate) {
          doc.text(`Due: ${new Date(task.dueDate).toLocaleDateString()}`, 25, yPosition);
          yPosition += 6;
        }

        if (task.description) {
          const lines = doc.splitTextToSize(task.description, 160);
          doc.text(lines, 25, yPosition);
          yPosition += lines.length * 4;
        }

        yPosition += 5;
      }
      yPosition += 10;
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async generateDocumentationPDF(project: any, config: DocumentationConfig): Promise<Buffer> {
    const doc = new jsPDF();
    let yPosition = 20;

    // Title page
    doc.setFontSize(24);
    doc.text(`${project.name}`, 20, yPosition);
    yPosition += 15;

    doc.setFontSize(18);
    doc.text(`${config.type.replace('_', ' ').toUpperCase()}`, 20, yPosition);
    yPosition += 30;

    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Project Progress: ${project.progress}%`, 20, yPosition);

    doc.addPage();
    yPosition = 20;

    // Table of Contents
    doc.setFontSize(16);
    doc.text('Table of Contents', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(12);
    const sections = [
      'Overview',
      'Getting Started',
      'Features',
      'Workflow Guide',
      'Task Management',
      'Troubleshooting',
    ];

    for (let i = 0; i < sections.length; i++) {
      doc.text(`${i + 1}. ${sections[i]}`, 25, yPosition);
      yPosition += 8;
    }

    // Content sections
    for (const section of sections) {
      doc.addPage();
      yPosition = 20;
      
      doc.setFontSize(16);
      doc.text(section, 20, yPosition);
      yPosition += 15;

      doc.setFontSize(12);
      let content = '';

      switch (section) {
        case 'Overview':
          content = `This document provides comprehensive guidance for the ${project.name} project. The project is currently in the ${project.workflowStep} phase with ${project.progress}% completion.`;
          break;
        case 'Getting Started':
          content = 'This section covers the initial setup and configuration required to work with this project.';
          break;
        case 'Features':
          if (project.mvpFeatures?.length) {
            content = project.mvpFeatures.map((f: any) => `${f.name}: ${f.description || ''}`).join('\n\n');
          } else {
            content = 'Feature documentation will be available as the project develops.';
          }
          break;
        case 'Workflow Guide':
          content = `Current workflow step: ${project.workflowStep}\n\nThis project follows a structured development workflow with defined stages and checkpoints.`;
          break;
        case 'Task Management':
          if (project.boards?.length) {
            content = project.boards.map((b: any) => 
              `Board: ${b.name}\nTasks: ${b.tasks?.length || 0}`
            ).join('\n\n');
          } else {
            content = 'Task management information will be updated as tasks are created and managed.';
          }
          break;
        case 'Troubleshooting':
          content = 'Common issues and solutions will be documented here as they are identified during development.';
          break;
      }

      const lines = doc.splitTextToSize(content, 170);
      doc.text(lines, 20, yPosition);
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async generateDocumentationMarkdown(project: any, config: DocumentationConfig): Promise<string> {
    let markdown = `# ${project.name}\n`;
    markdown += `## ${config.type.replace('_', ' ').toUpperCase()}\n\n`;

    markdown += `*Generated on: ${new Date().toLocaleDateString()}*\n\n`;
    markdown += `**Project Progress:** ${project.progress}%\n\n`;

    markdown += `---\n\n`;

    // Table of Contents
    markdown += `## Table of Contents\n\n`;
    markdown += `1. [Overview](#overview)\n`;
    markdown += `2. [Getting Started](#getting-started)\n`;
    markdown += `3. [Features](#features)\n`;
    markdown += `4. [Workflow Guide](#workflow-guide)\n`;
    markdown += `5. [Task Management](#task-management)\n`;
    markdown += `6. [Troubleshooting](#troubleshooting)\n\n`;

    // Overview
    markdown += `## Overview\n\n`;
    markdown += `This document provides comprehensive guidance for the ${project.name} project. `;
    markdown += `The project is currently in the ${project.workflowStep} phase with ${project.progress}% completion.\n\n`;

    // Getting Started
    markdown += `## Getting Started\n\n`;
    markdown += `This section covers the initial setup and configuration required to work with this project.\n\n`;

    // Features
    markdown += `## Features\n\n`;
    if (project.mvpFeatures?.length) {
      for (const feature of project.mvpFeatures) {
        markdown += `### ${feature.name}\n\n`;
        if (feature.description) {
          markdown += `${feature.description}\n\n`;
        }
        markdown += `- **Priority:** ${feature.priority}\n`;
        markdown += `- **Effort:** ${feature.effort}\n`;
        markdown += `- **Impact:** ${feature.impact}\n\n`;
      }
    } else {
      markdown += `Feature documentation will be available as the project develops.\n\n`;
    }

    // Workflow Guide
    markdown += `## Workflow Guide\n\n`;
    markdown += `**Current workflow step:** ${project.workflowStep}\n\n`;
    markdown += `This project follows a structured development workflow with defined stages and checkpoints.\n\n`;

    // Task Management
    markdown += `## Task Management\n\n`;
    if (project.boards?.length) {
      for (const board of project.boards) {
        markdown += `### ${board.name}\n\n`;
        if (board.description) {
          markdown += `${board.description}\n\n`;
        }
        markdown += `**Total Tasks:** ${board.tasks?.length || 0}\n\n`;
        
        if (board.tasks?.length) {
          const completedTasks = board.tasks.filter((t: any) => t.status === 'DONE').length;
          const completionRate = Math.round((completedTasks / board.tasks.length) * 100);
          markdown += `**Completion Rate:** ${completionRate}%\n\n`;
        }
      }
    } else {
      markdown += `Task management information will be updated as tasks are created and managed.\n\n`;
    }

    // Troubleshooting
    markdown += `## Troubleshooting\n\n`;
    markdown += `Common issues and solutions will be documented here as they are identified during development.\n\n`;

    return markdown;
  }

  private async generateDocumentationHTML(project: any, config: DocumentationConfig): Promise<string> {
    const markdownContent = await this.generateDocumentationMarkdown(project, config);
    
    const htmlContent = this.markdown.render(markdownContent);
    
    const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name} - ${config.type.replace('_', ' ')}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3 { color: #2563eb; }
        h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        h2 { margin-top: 30px; }
        code { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f9fafb; padding: 15px; border-radius: 5px; overflow-x: auto; }
        blockquote { border-left: 4px solid #e5e7eb; margin: 0; padding-left: 16px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
        th { background: #f9fafb; font-weight: 600; }
        .toc { background: #f9fafb; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .toc ul { margin: 0; padding-left: 20px; }
    </style>
</head>
<body>
    ${htmlContent}
    <hr>
    <footer style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 14px;">
        Generated by BeBrahma Task Management System
    </footer>
</body>
</html>`;

    return fullHTML;
  }

  private async generateCustomCSV(data: any, config: ExportConfig): Promise<string> {
    const headers: string[] = [];
    const rows: string[] = [];

    if (Array.isArray(data)) {
      // For array of objects, use keys from the first object as headers
      if (data.length > 0) {
        headers.push(...Object.keys(data[0]));
      }
      for (const item of data) {
        const row = Object.values(item).map(val => `"${String(val).replace(/"/g, '""')}"`);
        rows.push(row.join(','));
      }
    } else if (typeof data === 'object' && data !== null) {
      // For a single object, use all keys
      headers.push(...Object.keys(data));
      const row = Object.values(data).map(val => `"${String(val).replace(/"/g, '""')}"`);
      rows.push(row.join(','));
    } else {
      throw new Error('Data for CSV export must be an array of objects or a single object.');
    }

    return `${headers.join(',')}\n${rows.join('\n')}`;
  }

  private async generateCustomMarkdown(data: any, config: ExportConfig): Promise<string> {
    let markdown = '';

    if (Array.isArray(data)) {
      markdown += `# Array of Objects\n\n`;
      for (const item of data) {
        markdown += `## Item\n\n`;
        markdown += `\`\`\`json\n${JSON.stringify(item, null, 2)}\`\`\`\n\n`;
      }
    } else if (typeof data === 'object' && data !== null) {
      markdown += `# Single Object\n\n`;
      markdown += `\`\`\`json\n${JSON.stringify(data, null, 2)}\`\`\`\n\n`;
    } else {
      markdown += `# Data\n\n`;
      markdown += `\`\`\`json\n${JSON.stringify(data, null, 2)}\`\`\`\n\n`;
    }

    return markdown;
  }

  private sanitizeProjectData(project: any): any {
    // Remove sensitive fields and clean up data for export
    const sanitized = {
      ...project,
      userId: undefined, // Remove user ID for privacy
      conversation: project.conversation ? {
        id: project.conversation.id,
        problem: project.conversation.problem,
        summary: project.conversation.summary,
        createdAt: project.conversation.createdAt,
      } : null,
    };

    return sanitized;
  }

  private sanitizeTasksData(tasks: any[]): any[] {
    return tasks.map(task => ({
      ...task,
      assigneeId: task.assigneeId ? '[REDACTED]' : null, // Anonymize assignee info
    }));
  }

  async getExportTemplates(filters?: { type?: string; format?: string }): Promise<any[]> {
    // In a real implementation, this would fetch from a database
    const templates = [
      {
        id: 'project-standard',
        name: 'Standard Project Export',
        type: 'project',
        format: 'pdf',
        description: 'Complete project export with all sections',
        sections: ['problems', 'solutions', 'competitors', 'mvp', 'tasks'],
      },
      {
        id: 'project-summary',
        name: 'Project Summary',
        type: 'project',
        format: 'markdown',
        description: 'Concise project overview',
        sections: ['problems', 'solutions'],
      },
      {
        id: 'tasks-kanban',
        name: 'Kanban Board Export',
        type: 'tasks',
        format: 'csv',
        description: 'Task list optimized for importing into other tools',
      },
      {
        id: 'user-guide-standard',
        name: 'Standard User Guide',
        type: 'documentation',
        format: 'pdf',
        description: 'Comprehensive user documentation',
      },
    ];

    return templates.filter(template => {
      if (filters?.type && template.type !== filters.type) return false;
      if (filters?.format && template.format !== filters.format) return false;
      return true;
    });
  }

  async createCustomExport(config: CustomExportConfig, userId: string): Promise<any> {
    // In a real implementation, this would save to database
    const customExport = {
      id: uuidv4(),
      userId,
      ...config,
      createdAt: new Date(),
      lastRun: null,
      status: 'active',
    };

    return customExport;
  }

  async getExportHistory(userId: string, options: {
    page: number;
    limit: number;
    type?: string;
    format?: string;
  }): Promise<any> {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const where: any = { userId };
      if (options.type) {
        where.type = options.type.toUpperCase();
      }
      if (options.format) {
        where.format = options.format.toUpperCase();
      }

      const total = await prisma.exportRecord.count({ where });
      const totalPages = Math.ceil(total / options.limit);
      const skip = (options.page - 1) * options.limit;

      const exports = await prisma.exportRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: options.limit,
        select: {
          exportId: true,
          type: true,
          format: true,
          filename: true,
          size: true,
          createdAt: true,
          expiresAt: true,
          metadata: true,
        },
      });

      await prisma.$disconnect();

      return {
        exports,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      console.error('Error getting export history:', error);
      return {
        exports: [],
        pagination: {
          page: options.page,
          limit: options.limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  async getDownloadInfo(exportId: string, userId: string): Promise<DownloadInfo | null> {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // Query Prisma for the export record
      const exportRecord = await prisma.exportRecord.findFirst({
        where: {
          exportId,
          userId,
        },
      });

      if (!exportRecord) {
        await prisma.$disconnect();
        return null;
      }

      // Check if file still exists
      const stats = await fs.stat(exportRecord.filePath);
      
      // Determine content type based on format
      const contentTypeMap: { [key: string]: string } = {
        'PDF': 'application/pdf',
        'MARKDOWN': 'text/markdown',
        'JSON': 'application/json',
        'CSV': 'text/csv',
        'HTML': 'text/html',
      };

      const contentType = contentTypeMap[exportRecord.format] || 'application/octet-stream';

      await prisma.$disconnect();
      
      return {
        filename: exportRecord.filename,
        contentType,
        size: stats.size,
        filePath: exportRecord.filePath,
      };
    } catch (error) {
      console.error('Error getting download info:', error);
      return null;
    }
  }

  async streamFile(filePath: string, response: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const stream = fs.createReadStream(filePath);
      
      stream.on('error', (error: any) => {
        console.error('File streaming error:', error);
        reject(new Error('Failed to stream file'));
      });
      
      stream.on('end', () => {
        resolve();
      });
      
      stream.pipe(response);
    });
  }

  async deleteExport(exportId: string, userId: string): Promise<boolean> {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // Get the export record
      const exportRecord = await prisma.exportRecord.findFirst({
        where: {
          exportId,
          userId,
        },
      });

      if (!exportRecord) {
        await prisma.$disconnect();
        return false;
      }

      // Delete the file
      try {
        await fs.unlink(exportRecord.filePath);
      } catch (fileError) {
        console.warn('File not found for deletion:', exportRecord.filePath);
      }

      // Delete the database record
      await prisma.exportRecord.delete({
        where: { exportId },
      });

      await prisma.$disconnect();
      return true;
    } catch (error) {
      console.error('Error deleting export:', error);
      return false;
    }
  }

  async getExportProgress(exportId: string, userId: string): Promise<any> {
    // In a real implementation, this would check progress from database/cache
    return {
      exportId,
      status: 'completed',
      progress: 100,
      message: 'Export completed successfully',
    };
  }

  async shareExport(exportId: string, userId: string, options: {
    recipients: string[];
    message?: string;
    expiresIn: string;
  }): Promise<any> {
    // In a real implementation, this would create share links and send notifications
    return {
      shareId: uuidv4(),
      shareUrl: `${process.env.API_BASE_URL}/api/export/shared/${exportId}`,
      recipients: options.recipients,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
    };
  }

  private async persistExportRecord(recordData: {
    exportId: string;
    userId: string;
    type: string;
    format: string;
    filename: string;
    filePath: string;
    size: number;
    expiresAt: Date;
    metadata?: any;
  }): Promise<any> {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const record = await prisma.exportRecord.create({
        data: {
          exportId: recordData.exportId,
          userId: recordData.userId,
          type: recordData.type as any,
          format: recordData.format as any,
          filename: recordData.filename,
          filePath: recordData.filePath,
          size: recordData.size,
          expiresAt: recordData.expiresAt,
          metadata: recordData.metadata || {},
        },
      });

      await prisma.$disconnect();
      return record;
    } catch (error) {
      console.error('Failed to persist export record:', error);
      // Don't throw here - we still want to return the export result
      // The record can be created later if needed
      return {
        exportId: recordData.exportId,
        filename: recordData.filename,
        expiresAt: recordData.expiresAt,
      };
    }
  }

  private async generateTasksMarkdown(tasks: any[], config: ExportConfig): Promise<string> {
    let markdown = `# Tasks Export\n\n`;
    markdown += `Generated on: ${new Date().toLocaleDateString()}\n`;
    markdown += `Total tasks: ${tasks.length}\n\n`;

    if (config.sections?.includes('summary')) {
      markdown += `## Summary\n\n`;
      const statusCounts = tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      markdown += `| Status | Count |\n`;
      markdown += `|--------|-------|\n`;
      Object.entries(statusCounts).forEach(([status, count]) => {
        markdown += `| ${status} | ${count} |\n`;
      });
      markdown += `\n`;
    }

    if (config.sections?.includes('tasks')) {
      markdown += `## Tasks\n\n`;
      tasks.forEach((task, index) => {
        markdown += `### ${index + 1}. ${task.title}\n\n`;
        markdown += `- **Status**: ${task.status}\n`;
        markdown += `- **Priority**: ${task.priority || 'Not set'}\n`;
        markdown += `- **Assignee**: ${task.assigneeId || 'Unassigned'}\n`;
        if (task.description) {
          markdown += `- **Description**: ${task.description}\n`;
        }
        if (task.dueDate) {
          markdown += `- **Due Date**: ${new Date(task.dueDate).toLocaleDateString()}\n`;
        }
        markdown += `\n`;
      });
    }

    if (config.sections?.includes('dependencies') && config.includeDependencies) {
      markdown += `## Dependencies\n\n`;
      const tasksWithDeps = tasks.filter(task => 
        task.dependencies?.length > 0 || task.dependents?.length > 0
      );

      if (tasksWithDeps.length === 0) {
        markdown += `No dependencies found.\n\n`;
      } else {
        tasksWithDeps.forEach(task => {
          markdown += `### ${task.title}\n\n`;
          if (task.dependencies?.length > 0) {
            markdown += `**Depends on:**\n`;
            task.dependencies.forEach((dep: any) => {
              markdown += `- ${dep.dependsOn.title} (${dep.dependsOn.status})\n`;
            });
            markdown += `\n`;
          }
          if (task.dependents?.length > 0) {
            markdown += `**Required by:**\n`;
            task.dependents.forEach((dep: any) => {
              markdown += `- ${dep.task.title} (${dep.task.status})\n`;
            });
            markdown += `\n`;
          }
        });
      }
    }

    if (config.sections?.includes('progress') && config.includeProgress) {
      markdown += `## Progress\n\n`;
      const completedTasks = tasks.filter(task => task.status === 'DONE').length;
      const progressPercentage = Math.round((completedTasks / tasks.length) * 100);
      markdown += `- **Completed**: ${completedTasks}/${tasks.length} (${progressPercentage}%)\n`;
      markdown += `- **In Progress**: ${tasks.filter(task => task.status === 'IN_PROGRESS').length}\n`;
      markdown += `- **Blocked**: ${tasks.filter(task => task.status === 'BLOCKED').length}\n`;
      markdown += `- **Pending**: ${tasks.filter(task => task.status === 'TODO').length}\n\n`;
    }

    return markdown;
  }
}

export const exportService = new ExportService();