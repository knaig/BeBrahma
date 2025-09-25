import MarkdownIt from 'markdown-it';
import jsPDF from 'jspdf';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

interface UserGuideConfig {
  format: 'pdf' | 'html' | 'markdown';
  includeScreenshots?: boolean;
  includeWorkflow?: boolean;
  includeTutorials?: boolean;
  customSections?: string[];
}

interface DeveloperResourcesConfig {
  format: 'pdf' | 'html' | 'markdown';
  includeApiExamples?: boolean;
  includeWebhookDocs?: boolean;
  includeSDKReference?: boolean;
  apiVersion?: string;
}

interface CustomDocumentationConfig {
  type: 'user_guide' | 'api_reference' | 'workflow_docs' | 'integration_guide';
  format: 'pdf' | 'html' | 'markdown';
  template?: string;
  sections?: string[];
  customContent?: any;
  project?: any;
}

interface DocumentationTemplate {
  id: string;
  name: string;
  type: string;
  format: string;
  description: string;
  sections: string[];
  variables?: string[];
}

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
    description: string;
  }[];
  breaking: boolean;
}

class DocumentationService {
  private readonly markdown: MarkdownIt;
  private readonly templates: DocumentationTemplate[];
  private readonly changelog: ChangelogEntry[];

  constructor() {
    this.markdown = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });

    this.templates = this.initializeTemplates();
    this.changelog = this.initializeChangelog();
  }

  private initializeTemplates(): DocumentationTemplate[] {
    return [
      {
        id: 'user-guide-standard',
        name: 'Standard User Guide',
        type: 'user_guide',
        format: 'pdf',
        description: 'Comprehensive user guide with screenshots and tutorials',
        sections: ['overview', 'getting-started', 'features', 'tutorials', 'troubleshooting'],
        variables: ['project_name', 'version', 'features'],
      },
      {
        id: 'user-guide-quick',
        name: 'Quick Start Guide',
        type: 'user_guide',
        format: 'markdown',
        description: 'Concise getting started guide',
        sections: ['overview', 'getting-started', 'key-features'],
        variables: ['project_name', 'setup_steps'],
      },
      {
        id: 'api-reference-full',
        name: 'Complete API Reference',
        type: 'api_reference',
        format: 'html',
        description: 'Full API documentation with examples',
        sections: ['authentication', 'endpoints', 'examples', 'errors'],
        variables: ['api_version', 'base_url'],
      },
      {
        id: 'workflow-guide-standard',
        name: 'Workflow Documentation',
        type: 'workflow_docs',
        format: 'pdf',
        description: 'Process and workflow documentation',
        sections: ['workflow-overview', 'stages', 'decisions', 'best-practices'],
        variables: ['workflow_steps', 'decision_points'],
      },
      {
        id: 'integration-guide-standard',
        name: 'Integration Guide',
        type: 'integration_guide',
        format: 'markdown',
        description: 'Third-party integration documentation',
        sections: ['prerequisites', 'setup', 'configuration', 'examples', 'troubleshooting'],
        variables: ['integrations', 'api_keys'],
      },
    ];
  }

  private initializeChangelog(): ChangelogEntry[] {
    return [
      {
        version: '1.2.0',
        date: '2024-01-15',
        changes: [
          { type: 'added', description: 'Kanban board functionality with drag-and-drop support' },
          { type: 'added', description: 'Task dependency management with cycle detection' },
          { type: 'added', description: 'Project progress analytics and burndown charts' },
          { type: 'added', description: 'Export functionality for projects and tasks' },
          { type: 'changed', description: 'Improved WebSocket real-time updates performance' },
          { type: 'fixed', description: 'Task position ordering in drag-and-drop operations' },
        ],
        breaking: false,
      },
      {
        version: '1.1.0',
        date: '2023-12-01',
        changes: [
          { type: 'added', description: 'Auto-generated API documentation with Swagger UI' },
          { type: 'added', description: 'User guide generation for projects' },
          { type: 'changed', description: 'Enhanced task filtering and search capabilities' },
          { type: 'deprecated', description: 'Legacy task dependency string format (use TaskDependency model)' },
          { type: 'fixed', description: 'Authentication middleware error handling' },
        ],
        breaking: true,
      },
      {
        version: '1.0.0',
        date: '2023-10-01',
        changes: [
          { type: 'added', description: 'Initial release with project and task management' },
          { type: 'added', description: 'User authentication with Clerk integration' },
          { type: 'added', description: 'Real-time collaboration with WebSocket support' },
          { type: 'added', description: 'Comprehensive API with full CRUD operations' },
        ],
        breaking: false,
      },
    ];
  }

  async generateUserGuide(project: any, config: UserGuideConfig): Promise<{ content: string | Buffer }> {
    switch (config.format) {
      case 'pdf':
        return { content: await this.generateUserGuidePDF(project, config) };
      case 'html':
        return { content: await this.generateUserGuideHTML(project, config) };
      case 'markdown':
        return { content: await this.generateUserGuideMarkdown(project, config) };
      default:
        throw new Error(`Unsupported format: ${config.format}`);
    }
  }

  async generateDeveloperResources(config: DeveloperResourcesConfig): Promise<{ content: string | Buffer }> {
    switch (config.format) {
      case 'pdf':
        return { content: await this.generateDeveloperResourcesPDF(config) };
      case 'html':
        return { content: await this.generateDeveloperResourcesHTML(config) };
      case 'markdown':
        return { content: await this.generateDeveloperResourcesMarkdown(config) };
      default:
        throw new Error(`Unsupported format: ${config.format}`);
    }
  }

  async generateCustomDocumentation(config: CustomDocumentationConfig, userId: string): Promise<{ content: string | Buffer }> {
    const template = this.templates.find(t => t.type === config.type);
    
    switch (config.format) {
      case 'pdf':
        return { content: await this.generateCustomPDF(config, template) };
      case 'html':
        return { content: await this.generateCustomHTML(config, template) };
      case 'markdown':
        return { content: await this.generateCustomMarkdown(config, template) };
      default:
        throw new Error(`Unsupported format: ${config.format}`);
    }
  }

  private async generateUserGuideMarkdown(project: any, config: UserGuideConfig): Promise<string> {
    let markdown = `# ${project.name} - User Guide\n\n`;
    
    markdown += `*Generated on: ${new Date().toLocaleDateString()}*\n\n`;
    
    // Overview section
    if (!config.customSections || config.customSections.includes('overview')) {
      markdown += `## Overview\n\n`;
      markdown += `Welcome to ${project.name}! This comprehensive guide will help you understand and effectively use all features of the project.\n\n`;
      markdown += `**Project Status:** ${project.workflowStep} (${project.progress}% complete)\n\n`;
    }

    // Getting Started section
    if (!config.customSections || config.customSections.includes('getting-started')) {
      markdown += `## Getting Started\n\n`;
      markdown += `### Prerequisites\n\n`;
      markdown += `Before you begin, ensure you have:\n\n`;
      markdown += `- Access to the project workspace\n`;
      markdown += `- Appropriate permissions for your role\n`;
      markdown += `- Basic understanding of task management concepts\n\n`;
      
      markdown += `### First Steps\n\n`;
      markdown += `1. **Access the Project**: Navigate to the project dashboard\n`;
      markdown += `2. **Understand the Layout**: Familiarize yourself with the interface\n`;
      markdown += `3. **Review Current Status**: Check the project progress and active tasks\n\n`;
    }

    // Features section
    if ((!config.customSections || config.customSections.includes('features')) && project.mvpFeatures?.length) {
      markdown += `## Features\n\n`;
      markdown += `${project.name} includes the following key features:\n\n`;
      
      for (const feature of project.mvpFeatures) {
        markdown += `### ${feature.name}\n\n`;
        if (feature.description) {
          markdown += `${feature.description}\n\n`;
        }
        markdown += `- **Priority Level:** ${feature.priority}\n`;
        markdown += `- **Implementation Effort:** ${feature.effort}\n`;
        markdown += `- **Business Impact:** ${feature.impact}\n\n`;
        
        if (feature.userStories?.length) {
          markdown += `**User Stories:**\n`;
          for (const story of feature.userStories) {
            markdown += `- ${story}\n`;
          }
          markdown += `\n`;
        }
        
        if (feature.acceptanceCriteria?.length) {
          markdown += `**Acceptance Criteria:**\n`;
          for (const criteria of feature.acceptanceCriteria) {
            markdown += `- ${criteria}\n`;
          }
          markdown += `\n`;
        }
      }
    }

    // Workflow section
    if (config.includeWorkflow && (!config.customSections || config.customSections.includes('workflow'))) {
      markdown += `## Workflow Guide\n\n`;
      markdown += `### Current Phase: ${project.workflowStep}\n\n`;
      
      const workflowSteps = [
        'PROBLEM_CAPTURE',
        'PROBLEM_CLARIFICATION',
        'SOLUTION_BRAINSTORM',
        'COMPETITOR_ANALYSIS',
        'SCA_ANALYSIS',
        'MVP_PLANNING',
        'TASK_GENERATION'
      ];
      
      markdown += `### Workflow Stages\n\n`;
      for (let i = 0; i < workflowSteps.length; i++) {
        const step = workflowSteps[i];
        const isCurrentStep = step === project.workflowStep;
        const isCompletedStep = workflowSteps.indexOf(project.workflowStep) > i;
        
        markdown += `${i + 1}. **${step.replace(/_/g, ' ')}**`;
        if (isCurrentStep) {
          markdown += ` ← *Current Phase*`;
        } else if (isCompletedStep) {
          markdown += ` ✓ *Completed*`;
        }
        markdown += `\n`;
      }
      markdown += `\n`;
    }

    // Task Management section
    if (project.boards?.length && (!config.customSections || config.customSections.includes('tasks'))) {
      markdown += `## Task Management\n\n`;
      markdown += `This project uses Kanban boards to organize and track work progress.\n\n`;
      
      for (const board of project.boards) {
        markdown += `### ${board.name}\n\n`;
        if (board.description) {
          markdown += `${board.description}\n\n`;
        }
        
        const tasks = board.tasks || [];
        const tasksByStatus = {
          'TODO': tasks.filter((t: any) => t.status === 'TODO'),
          'IN_PROGRESS': tasks.filter((t: any) => t.status === 'IN_PROGRESS'),
          'IN_REVIEW': tasks.filter((t: any) => t.status === 'IN_REVIEW'),
          'DONE': tasks.filter((t: any) => t.status === 'DONE'),
          'BLOCKED': tasks.filter((t: any) => t.status === 'BLOCKED'),
        };
        
        markdown += `**Task Summary:**\n`;
        markdown += `- Total Tasks: ${tasks.length}\n`;
        for (const [status, statusTasks] of Object.entries(tasksByStatus)) {
          markdown += `- ${status.replace('_', ' ')}: ${statusTasks.length}\n`;
        }
        markdown += `\n`;
        
        if (tasks.length > 0) {
          const completionRate = Math.round((tasksByStatus.DONE.length / tasks.length) * 100);
          markdown += `**Completion Rate:** ${completionRate}%\n\n`;
        }
      }
    }

    // Tutorials section
    if (config.includeTutorials && (!config.customSections || config.customSections.includes('tutorials'))) {
      markdown += `## Tutorials\n\n`;
      markdown += `### How to Create a New Task\n\n`;
      markdown += `1. Navigate to the project board\n`;
      markdown += `2. Click the "Add Task" button\n`;
      markdown += `3. Fill in the task details:\n`;
      markdown += `   - Title (required)\n`;
      markdown += `   - Description (optional)\n`;
      markdown += `   - Priority level\n`;
      markdown += `   - Category\n`;
      markdown += `   - Due date (optional)\n`;
      markdown += `4. Click "Create Task" to add it to the board\n\n`;
      
      markdown += `### How to Move Tasks Between Columns\n\n`;
      markdown += `1. Click and hold on a task card\n`;
      markdown += `2. Drag the task to the desired column\n`;
      markdown += `3. Release to drop the task in its new position\n`;
      markdown += `4. The task status will automatically update\n\n`;
      
      markdown += `### How to Set Task Dependencies\n\n`;
      markdown += `1. Open a task by clicking on it\n`;
      markdown += `2. Navigate to the "Dependencies" section\n`;
      markdown += `3. Click "Add Dependency"\n`;
      markdown += `4. Select the task that must be completed first\n`;
      markdown += `5. Choose the dependency type (Blocks, Related, Subtask)\n`;
      markdown += `6. Save the dependency relationship\n\n`;
    }

    // Troubleshooting section
    if (!config.customSections || config.customSections.includes('troubleshooting')) {
      markdown += `## Troubleshooting\n\n`;
      markdown += `### Common Issues\n\n`;
      markdown += `**Tasks not saving:**\n`;
      markdown += `- Check your internet connection\n`;
      markdown += `- Ensure all required fields are filled\n`;
      markdown += `- Try refreshing the page\n\n`;
      
      markdown += `**Drag and drop not working:**\n`;
      markdown += `- Ensure you have edit permissions\n`;
      markdown += `- Try using a different browser\n`;
      markdown += `- Clear your browser cache\n\n`;
      
      markdown += `**Real-time updates not appearing:**\n`;
      markdown += `- Check if WebSocket connection is active\n`;
      markdown += `- Refresh the page to sync latest changes\n`;
      markdown += `- Contact support if issues persist\n\n`;
      
      markdown += `### Getting Help\n\n`;
      markdown += `If you need additional assistance:\n\n`;
      markdown += `- Check the FAQ section\n`;
      markdown += `- Contact your project administrator\n`;
      markdown += `- Submit a support ticket through the help desk\n\n`;
    }

    markdown += `---\n\n`;
    markdown += `*This user guide was automatically generated from project data. For the most up-to-date information, please refer to the live project dashboard.*\n`;

    return markdown;
  }

  private async generateUserGuidePDF(project: any, config: UserGuideConfig): Promise<Buffer> {
    const markdownContent = await this.generateUserGuideMarkdown(project, config);
    
    const doc = new jsPDF();
    let yPosition = 20;

    // Title page
    doc.setFontSize(24);
    doc.text(`${project.name}`, 20, yPosition);
    yPosition += 10;
    doc.setFontSize(18);
    doc.text('User Guide', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Project Status: ${project.workflowStep}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Progress: ${project.progress}%`, 20, yPosition);

    // Convert markdown sections to PDF
    const sections = markdownContent.split('## ');
    
    for (let i = 1; i < sections.length; i++) {
      doc.addPage();
      yPosition = 20;
      
      const section = sections[i];
      const lines = section.split('\n');
      const title = lines[0];
      
      doc.setFontSize(16);
      doc.text(title, 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      for (let j = 1; j < lines.length && yPosition < 280; j++) {
        const line = lines[j].replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
        if (line.trim()) {
          const wrappedLines = doc.splitTextToSize(line, 170);
          doc.text(wrappedLines, 20, yPosition);
          yPosition += wrappedLines.length * 6;
        } else {
          yPosition += 4;
        }
      }
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async generateUserGuideHTML(project: any, config: UserGuideConfig): Promise<string> {
    const markdownContent = await this.generateUserGuideMarkdown(project, config);
    const htmlContent = this.markdown.render(markdownContent);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name} - User Guide</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1000px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
            background: #fafafa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #2563eb; border-bottom: 3px solid #e5e7eb; padding-bottom: 15px; }
        h2 { color: #1e40af; margin-top: 40px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
        h3 { color: #3730a3; margin-top: 30px; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: 'Monaco', 'Courier New', monospace; }
        pre { background: #1f2937; color: #f9fafb; padding: 20px; border-radius: 6px; overflow-x: auto; }
        blockquote { border-left: 4px solid #3b82f6; margin: 0; padding-left: 20px; background: #eff6ff; padding: 15px 20px; border-radius: 4px; }
        ul, ol { margin: 15px 0; padding-left: 25px; }
        li { margin: 8px 0; }
        .toc { background: #f8fafc; padding: 25px; border-radius: 6px; margin: 25px 0; border: 1px solid #e5e7eb; }
        .toc h3 { margin-top: 0; color: #374151; }
        .toc ul { margin: 10px 0; }
        .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        .warning { background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #ef4444; margin: 20px 0; }
        .success { background: #f0fdf4; padding: 15px; border-radius: 6px; border-left: 4px solid #22c55e; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #d1d5db; padding: 12px; text-align: left; }
        th { background: #f9fafb; font-weight: 600; }
        .footer { margin-top: 60px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        ${htmlContent}
        <div class="footer">
            Generated by BeBrahma Task Management System<br>
            <em>This documentation is automatically updated based on project changes</em>
        </div>
    </div>
</body>
</html>`;
  }

  private async generateDeveloperResourcesMarkdown(config: DeveloperResourcesConfig): Promise<string> {
    let markdown = `# BeBrahma API - Developer Resources\n\n`;
    markdown += `*Generated on: ${new Date().toLocaleDateString()}*\n`;
    markdown += `*API Version: ${config.apiVersion || '1.0.0'}*\n\n`;

    // Introduction
    markdown += `## Introduction\n\n`;
    markdown += `Welcome to the BeBrahma Task Management API documentation. This comprehensive guide provides everything you need to integrate with our platform.\n\n`;

    // Authentication
    markdown += `## Authentication\n\n`;
    markdown += `BeBrahma API uses bearer token authentication with Clerk integration.\n\n`;
    markdown += `### Getting Started\n\n`;
    markdown += `1. Obtain your API token from the dashboard\n`;
    markdown += `2. Include the token in your request headers\n`;
    markdown += `3. All API requests must be made over HTTPS\n\n`;
    
    if (config.includeApiExamples) {
      markdown += `### Example Request\n\n`;
      markdown += `\`\`\`bash\n`;
      markdown += `curl -H "Authorization: Bearer YOUR_TOKEN" \\\n`;
      markdown += `     -H "Content-Type: application/json" \\\n`;
      markdown += `     https://api.bebrahma.com/api/projects\n`;
      markdown += `\`\`\`\n\n`;
    }

    // API Endpoints
    markdown += `## API Endpoints\n\n`;
    markdown += `Base URL: \`https://api.bebrahma.com\`\n\n`;

    // Projects API
    markdown += `### Projects\n\n`;
    markdown += `| Method | Endpoint | Description |\n`;
    markdown += `|--------|----------|-------------|\n`;
    markdown += `| GET | /api/projects | List all projects |\n`;
    markdown += `| POST | /api/projects | Create a new project |\n`;
    markdown += `| GET | /api/projects/{id} | Get project details |\n`;
    markdown += `| PUT | /api/projects/{id} | Update a project |\n`;
    markdown += `| DELETE | /api/projects/{id} | Delete a project |\n\n`;

    if (config.includeApiExamples) {
      markdown += `#### Create Project Example\n\n`;
      markdown += `\`\`\`javascript\n`;
      markdown += `const response = await fetch('https://api.bebrahma.com/api/projects', {\n`;
      markdown += `  method: 'POST',\n`;
      markdown += `  headers: {\n`;
      markdown += `    'Authorization': 'Bearer YOUR_TOKEN',\n`;
      markdown += `    'Content-Type': 'application/json'\n`;
      markdown += `  },\n`;
      markdown += `  body: JSON.stringify({\n`;
      markdown += `    name: 'My New Project',\n`;
      markdown += `    selectedSolution: 'MVP Development'\n`;
      markdown += `  })\n`;
      markdown += `});\n\n`;
      markdown += `const project = await response.json();\n`;
      markdown += `console.log(project);\n`;
      markdown += `\`\`\`\n\n`;
    }

    // Tasks API
    markdown += `### Tasks\n\n`;
    markdown += `| Method | Endpoint | Description |\n`;
    markdown += `|--------|----------|-------------|\n`;
    markdown += `| GET | /api/tasks/board/{boardId} | Get tasks by board |\n`;
    markdown += `| POST | /api/tasks | Create a new task |\n`;
    markdown += `| PUT | /api/tasks/{id} | Update a task |\n`;
    markdown += `| DELETE | /api/tasks/{id} | Delete a task |\n`;
    markdown += `| PUT | /api/tasks/reorder | Bulk reorder tasks |\n\n`;

    // WebSocket Integration
    if (config.includeWebhookDocs) {
      markdown += `### Real-time Updates\n\n`;
      markdown += `BeBrahma supports real-time updates via WebSocket connections.\n\n`;
      markdown += `#### Connection\n\n`;
      markdown += `\`\`\`javascript\n`;
      markdown += `const ws = new WebSocket('wss://api.bebrahma.com/ws');\n\n`;
      markdown += `ws.onopen = () => {\n`;
      markdown += `  // Subscribe to project updates\n`;
      markdown += `  ws.send(JSON.stringify({\n`;
      markdown += `    type: 'subscribe',\n`;
      markdown += `    channel: 'project_updates',\n`;
      markdown += `    projectId: 'your-project-id'\n`;
      markdown += `  }));\n`;
      markdown += `};\n\n`;
      markdown += `ws.onmessage = (event) => {\n`;
      markdown += `  const message = JSON.parse(event.data);\n`;
      markdown += `  console.log('Received update:', message);\n`;
      markdown += `};\n`;
      markdown += `\`\`\`\n\n`;

      markdown += `#### Event Types\n\n`;
      markdown += `- \`task_created\` - New task added\n`;
      markdown += `- \`task_updated\` - Task modified\n`;
      markdown += `- \`task_deleted\` - Task removed\n`;
      markdown += `- \`project_updated\` - Project settings changed\n`;
      markdown += `- \`board_updated\` - Board structure modified\n\n`;
    }

    // Error Handling
    markdown += `## Error Handling\n\n`;
    markdown += `The API uses conventional HTTP status codes and returns error details in JSON format.\n\n`;
    markdown += `### Error Response Format\n\n`;
    markdown += `\`\`\`json\n`;
    markdown += `{\n`;
    markdown += `  "success": false,\n`;
    markdown += `  "error": "Error message description",\n`;
    markdown += `  "details": "Additional error information"\n`;
    markdown += `}\n`;
    markdown += `\`\`\`\n\n`;

    markdown += `### HTTP Status Codes\n\n`;
    markdown += `| Code | Meaning |\n`;
    markdown += `|------|----------|\n`;
    markdown += `| 200 | Success |\n`;
    markdown += `| 201 | Created |\n`;
    markdown += `| 400 | Bad Request |\n`;
    markdown += `| 401 | Unauthorized |\n`;
    markdown += `| 403 | Forbidden |\n`;
    markdown += `| 404 | Not Found |\n`;
    markdown += `| 500 | Internal Server Error |\n\n`;

    // Rate Limiting
    markdown += `## Rate Limiting\n\n`;
    markdown += `API requests are rate-limited to ensure fair usage:\n\n`;
    markdown += `- **Standard tier**: 100 requests per minute\n`;
    markdown += `- **Premium tier**: 1000 requests per minute\n`;
    markdown += `- **Enterprise tier**: Custom limits\n\n`;

    markdown += `Rate limit headers are included in all responses:\n\n`;
    markdown += `\`\`\`\n`;
    markdown += `X-RateLimit-Limit: 100\n`;
    markdown += `X-RateLimit-Remaining: 87\n`;
    markdown += `X-RateLimit-Reset: 1640995200\n`;
    markdown += `\`\`\`\n\n`;

    // SDKs and Libraries
    if (config.includeSDKReference) {
      markdown += `## SDKs and Libraries\n\n`;
      markdown += `Official SDKs are available for popular programming languages:\n\n`;
      markdown += `### JavaScript/TypeScript\n\n`;
      markdown += `\`\`\`bash\n`;
      markdown += `npm install @bebrahma/sdk\n`;
      markdown += `\`\`\`\n\n`;
      markdown += `\`\`\`javascript\n`;
      markdown += `import { BeBrahmaClient } from '@bebrahma/sdk';\n\n`;
      markdown += `const client = new BeBrahmaClient({\n`;
      markdown += `  apiKey: 'your-api-key',\n`;
      markdown += `  baseUrl: 'https://api.bebrahma.com'\n`;
      markdown += `});\n\n`;
      markdown += `const projects = await client.projects.list();\n`;
      markdown += `\`\`\`\n\n`;

      markdown += `### Python\n\n`;
      markdown += `\`\`\`bash\n`;
      markdown += `pip install bebrahma-sdk\n`;
      markdown += `\`\`\`\n\n`;
      markdown += `\`\`\`python\n`;
      markdown += `from bebrahma import BeBrahmaClient\n\n`;
      markdown += `client = BeBrahmaClient(api_key='your-api-key')\n`;
      markdown += `projects = client.projects.list()\n`;
      markdown += `\`\`\`\n\n`;
    }

    // Examples and Tutorials
    markdown += `## Examples and Tutorials\n\n`;
    markdown += `### Complete Integration Example\n\n`;
    markdown += `Here's a complete example showing how to create a project and add tasks:\n\n`;
    markdown += `\`\`\`javascript\n`;
    markdown += `async function createProjectWithTasks() {\n`;
    markdown += `  const apiKey = 'your-api-key';\n`;
    markdown += `  const baseUrl = 'https://api.bebrahma.com';\n\n`;
    markdown += `  // Create project\n`;
    markdown += `  const projectResponse = await fetch('$\{baseUrl}/api/projects', {\n`;
    markdown += `    method: 'POST',\n`;
    markdown += `    headers: {\n`;
    markdown += `      'Authorization': 'Bearer $\{apiKey}',\n`;
    markdown += `      'Content-Type': 'application/json'\n`;
    markdown += `    },\n`;
    markdown += `    body: JSON.stringify({\n`;
    markdown += `      name: 'Sample Project',\n`;
    markdown += `      selectedSolution: 'MVP Development'\n`;
    markdown += `    })\n`;
    markdown += `  });\n\n`;
    markdown += `  const project = await projectResponse.json();\n`;
    markdown += `  console.log('Created project:', project.project.id);\n\n`;
    markdown += `  // Create tasks\n`;
    markdown += `  const tasks = [\n`;
    markdown += `    { title: 'Setup project structure', priority: 'High', category: 'Development' },\n`;
    markdown += `    { title: 'Design user interface', priority: 'Medium', category: 'Design' },\n`;
    markdown += `    { title: 'Implement core features', priority: 'High', category: 'Development' }\n`;
    markdown += `  ];\n\n`;
    markdown += `  for (const task of tasks) {\n`;
    markdown += `    const taskResponse = await fetch('$\{baseUrl}/api/tasks', {\n`;
    markdown += `      method: 'POST',\n`;
    markdown += `      headers: {\n`;
    markdown += `        'Authorization': 'Bearer $\{apiKey}',\n`;
    markdown += `        'Content-Type': 'application/json'\n`;
    markdown += `      },\n`;
    markdown += `      body: JSON.stringify({\n`;
    markdown += `        ...task,\n`;
    markdown += `        projectId: project.project.id\n`;
    markdown += `      })\n`;
    markdown += `    });\n\n`;
    markdown += `    const createdTask = await taskResponse.json();\n`;
    markdown += `    console.log('Created task:', createdTask.task.title);\n`;
    markdown += `  }\n`;
    markdown += `}\n\n`;
    markdown += `createProjectWithTasks().catch(console.error);\n`;
    markdown += `\`\`\`\n\n`;

    // Best Practices
    markdown += `## Best Practices\n\n`;
    markdown += `### Performance Optimization\n\n`;
    markdown += `- Use pagination for large data sets\n`;
    markdown += `- Implement request debouncing for real-time features\n`;
    markdown += `- Cache responses when appropriate\n`;
    markdown += `- Use WebSocket connections for real-time updates instead of polling\n\n`;

    markdown += `### Security Considerations\n\n`;
    markdown += `- Never expose API keys in client-side code\n`;
    markdown += `- Use environment variables for configuration\n`;
    markdown += `- Implement proper error handling to avoid information leakage\n`;
    markdown += `- Validate all input data before sending to the API\n\n`;

    markdown += `### Error Handling Best Practices\n\n`;
    markdown += `- Always check response status codes\n`;
    markdown += `- Implement retry logic with exponential backoff\n`;
    markdown += `- Log errors appropriately for debugging\n`;
    markdown += `- Provide user-friendly error messages\n\n`;

    // Support and Resources
    markdown += `## Support and Resources\n\n`;
    markdown += `### Getting Help\n\n`;
    markdown += `- **Documentation**: [https://docs.bebrahma.com](https://docs.bebrahma.com)\n`;
    markdown += `- **API Status**: [https://status.bebrahma.com](https://status.bebrahma.com)\n`;
    markdown += `- **Support Email**: support@bebrahma.com\n`;
    markdown += `- **Community Forum**: [https://community.bebrahma.com](https://community.bebrahma.com)\n\n`;

    markdown += `### Additional Resources\n\n`;
    markdown += `- **Changelog**: Track API updates and changes\n`;
    markdown += `- **Postman Collection**: Pre-built API requests for testing\n`;
    markdown += `- **OpenAPI Specification**: Machine-readable API documentation\n`;
    markdown += `- **Example Applications**: Sample integrations and use cases\n\n`;

    return markdown;
  }

  private async generateDeveloperResourcesPDF(config: DeveloperResourcesConfig): Promise<Buffer> {
    const markdownContent = await this.generateDeveloperResourcesMarkdown(config);
    
    const doc = new jsPDF();
    let yPosition = 20;

    // Title page
    doc.setFontSize(24);
    doc.text('BeBrahma API', 20, yPosition);
    yPosition += 15;
    doc.setFontSize(18);
    doc.text('Developer Resources', 20, yPosition);
    yPosition += 30;

    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 8;
    doc.text(`API Version: ${config.apiVersion || '1.0.0'}`, 20, yPosition);

    // Convert markdown to PDF (simplified)
    const sections = markdownContent.split('## ');
    
    for (let i = 1; i < sections.length && i < 10; i++) {
      doc.addPage();
      yPosition = 20;
      
      const section = sections[i];
      const lines = section.split('\n');
      const title = lines[0];
      
      doc.setFontSize(16);
      doc.text(title, 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      for (let j = 1; j < lines.length && yPosition < 280; j++) {
        const line = lines[j]
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`([^`]+)`/g, '$1');
        
        if (line.trim() && !line.startsWith('```')) {
          const wrappedLines = doc.splitTextToSize(line, 170);
          doc.text(wrappedLines, 20, yPosition);
          yPosition += wrappedLines.length * 6;
        } else if (line.trim() === '') {
          yPosition += 4;
        }
      }
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async generateDeveloperResourcesHTML(config: DeveloperResourcesConfig): Promise<string> {
    const markdownContent = await this.generateDeveloperResourcesMarkdown(config);
    const htmlContent = this.markdown.render(markdownContent);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BeBrahma API - Developer Resources</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
            background: #fafafa;
        }
        .container {
            background: white;
            padding: 50px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        h1 { color: #1e40af; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
        h2 { color: #1e40af; margin-top: 50px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        h3 { color: #3730a3; margin-top: 35px; }
        code { 
            background: #f1f5f9; 
            padding: 3px 8px; 
            border-radius: 4px; 
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            color: #e11d48;
        }
        pre { 
            background: #0f172a; 
            color: #f8fafc; 
            padding: 25px; 
            border-radius: 8px; 
            overflow-x: auto;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
        }
        pre code {
            background: transparent;
            color: inherit;
            padding: 0;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 25px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        th, td { 
            border: none;
            padding: 15px 20px; 
            text-align: left; 
        }
        th { 
            background: #3b82f6; 
            color: white;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
        }
        tr:nth-child(even) td { background: #f8fafc; }
        .method-get { color: #059669; font-weight: bold; }
        .method-post { color: #dc2626; font-weight: bold; }
        .method-put { color: #d97706; font-weight: bold; }
        .method-delete { color: #be185d; font-weight: bold; }
        .highlight { 
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 5px solid #f59e0b; 
            margin: 25px 0; 
        }
        .warning { 
            background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 5px solid #ef4444; 
            margin: 25px 0; 
        }
        .success { 
            background: linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%); 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 5px solid #22c55e; 
            margin: 25px 0; 
        }
        .sidebar {
            position: fixed;
            top: 0;
            right: -300px;
            width: 280px;
            height: 100vh;
            background: #1e293b;
            color: white;
            padding: 20px;
            transition: right 0.3s ease;
            overflow-y: auto;
            z-index: 1000;
        }
        .sidebar.open { right: 0; }
        .sidebar h3 { color: #94a3b8; margin-top: 0; }
        .sidebar ul { list-style: none; padding: 0; margin: 0; }
        .sidebar li { margin: 8px 0; }
        .sidebar a { color: #cbd5e1; text-decoration: none; padding: 5px 10px; display: block; border-radius: 4px; }
        .sidebar a:hover { background: #334155; color: white; }
        .menu-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 6px;
            cursor: pointer;
            z-index: 1001;
        }
        .footer { 
            margin-top: 80px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 14px; 
            border-top: 2px solid #e5e7eb; 
            padding-top: 30px; 
        }
    </style>
</head>
<body>
    <button class="menu-toggle" onclick="toggleSidebar()">Menu</button>
    <div class="sidebar" id="sidebar">
        <h3>Navigation</h3>
        <ul>
            <li><a href="#introduction">Introduction</a></li>
            <li><a href="#authentication">Authentication</a></li>
            <li><a href="#api-endpoints">API Endpoints</a></li>
            <li><a href="#real-time-updates">Real-time Updates</a></li>
            <li><a href="#error-handling">Error Handling</a></li>
            <li><a href="#rate-limiting">Rate Limiting</a></li>
            <li><a href="#examples-and-tutorials">Examples</a></li>
            <li><a href="#best-practices">Best Practices</a></li>
            <li><a href="#support-and-resources">Support</a></li>
        </ul>
    </div>
    <div class="container">
        ${htmlContent}
        <div class="footer">
            Generated by BeBrahma Documentation System<br>
            <em>For the latest updates, visit our developer portal</em>
        </div>
    </div>
    <script>
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('open');
        }
        
        // Close sidebar when clicking outside
        document.addEventListener('click', function(event) {
            const sidebar = document.getElementById('sidebar');
            const toggle = document.querySelector('.menu-toggle');
            
            if (!sidebar.contains(event.target) && !toggle.contains(event.target)) {
                sidebar.classList.remove('open');
            }
        });
        
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    document.getElementById('sidebar').classList.remove('open');
                }
            });
        });
    </script>
</body>
</html>`;
  }

  private async generateCustomMarkdown(config: CustomDocumentationConfig, template?: DocumentationTemplate): Promise<string> {
    let markdown = `# ${config.project?.name || 'Documentation'}\n\n`;
    
    if (template) {
      markdown += `*Generated using template: ${template.name}*\n`;
    }
    markdown += `*Generated on: ${new Date().toLocaleDateString()}*\n\n`;

    // Add custom content based on type
    switch (config.type) {
      case 'user_guide':
        if (config.project) {
          return this.generateUserGuideMarkdown(config.project, {
            format: 'markdown',
            includeScreenshots: true,
            includeWorkflow: true,
            includeTutorials: true,
            customSections: config.sections,
          });
        }
        break;
      case 'api_reference':
        return this.generateDeveloperResourcesMarkdown({
          format: 'markdown',
          includeApiExamples: true,
          includeWebhookDocs: true,
          includeSDKReference: true,
        });
      case 'workflow_docs':
        markdown += this.generateWorkflowDocumentation(config.project);
        break;
      case 'integration_guide':
        markdown += this.generateIntegrationGuide();
        break;
    }

    return markdown;
  }

  private async generateCustomPDF(config: CustomDocumentationConfig, template?: DocumentationTemplate): Promise<Buffer> {
    const markdownContent = await this.generateCustomMarkdown(config, template);
    
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.text(config.project?.name || 'Documentation', 20, yPosition);
    yPosition += 15;

    // Convert markdown to PDF (simplified)
    const lines = markdownContent.split('\n');
    
    doc.setFontSize(12);
    for (const line of lines) {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      
      const cleanLine = line.replace(/[#*`]/g, '').trim();
      if (cleanLine) {
        const wrappedLines = doc.splitTextToSize(cleanLine, 170);
        doc.text(wrappedLines, 20, yPosition);
        yPosition += wrappedLines.length * 6 + 2;
      } else {
        yPosition += 4;
      }
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async generateCustomHTML(config: CustomDocumentationConfig, template?: DocumentationTemplate): Promise<string> {
    const markdownContent = await this.generateCustomMarkdown(config, template);
    const htmlContent = this.markdown.render(markdownContent);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.project?.name || 'Documentation'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
        }
        h1, h2, h3 { color: #2563eb; }
        h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        code { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f9fafb; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .footer { margin-top: 60px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    ${htmlContent}
    <div class="footer">
        Generated by BeBrahma Documentation System
    </div>
</body>
</html>`;
  }

  private generateWorkflowDocumentation(project: any): string {
    let content = `## Workflow Overview\n\n`;
    
    if (project) {
      content += `Current project "${project.name}" is in the ${project.workflowStep} phase.\n\n`;
      
      content += `### Workflow Stages\n\n`;
      const stages = [
        'PROBLEM_CAPTURE',
        'PROBLEM_CLARIFICATION',
        'SOLUTION_BRAINSTORM',
        'COMPETITOR_ANALYSIS',
        'SCA_ANALYSIS',
        'MVP_PLANNING',
        'TASK_GENERATION'
      ];
      
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const isCurrentStage = stage === project.workflowStep;
        content += `${i + 1}. **${stage.replace(/_/g, ' ')}**${isCurrentStage ? ' *(Current)*' : ''}\n`;
      }
      content += `\n`;
    }
    
    content += `### Process Guidelines\n\n`;
    content += `1. Each stage must be completed before moving to the next\n`;
    content += `2. Stakeholder approval is required at key checkpoints\n`;
    content += `3. All decisions should be documented with rationale\n`;
    content += `4. Regular progress reviews ensure alignment with objectives\n\n`;
    
    return content;
  }

  private generateIntegrationGuide(): string {
    let content = `## Integration Guide\n\n`;
    
    content += `### Prerequisites\n\n`;
    content += `- Active BeBrahma account\n`;
    content += `- API access credentials\n`;
    content += `- Development environment setup\n\n`;
    
    content += `### Step 1: Authentication Setup\n\n`;
    content += `Configure your application with the BeBrahma API credentials.\n\n`;
    
    content += `### Step 2: Install SDK\n\n`;
    content += `Choose your preferred programming language and install the appropriate SDK.\n\n`;
    
    content += `### Step 3: Basic Integration\n\n`;
    content += `Start with basic operations like creating projects and managing tasks.\n\n`;
    
    content += `### Step 4: Advanced Features\n\n`;
    content += `Implement real-time updates, webhooks, and custom workflows.\n\n`;
    
    return content;
  }

  async getDocumentationTemplates(filters?: { type?: string; format?: string }): Promise<DocumentationTemplate[]> {
    return this.templates.filter(template => {
      if (filters?.type && template.type !== filters.type) return false;
      if (filters?.format && template.format !== filters.format) return false;
      return true;
    });
  }

  async getChangelog(options?: { version?: string; limit?: number }): Promise<ChangelogEntry[]> {
    let changelog = [...this.changelog];
    
    if (options?.version) {
      changelog = changelog.filter(entry => entry.version === options.version);
    }
    
    if (options?.limit) {
      changelog = changelog.slice(0, options.limit);
    }
    
    return changelog;
  }

  async getDocumentationStats(userId: string): Promise<any> {
    // In a real implementation, this would query from database
    return {
      documentsGenerated: 0,
      templatesUsed: 0,
      lastGenerated: null,
      popularTemplates: [],
      totalDownloads: 0,
    };
  }
}

export const documentationService = new DocumentationService();