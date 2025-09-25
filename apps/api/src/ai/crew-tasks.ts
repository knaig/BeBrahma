export interface SimpleTask {
  id: string;
  description: string;
  expectedOutput: string;
  agentRole: string;
  context: string;
}

export class CrewTaskFactory {
  static createProblemCaptureTask(problem: string): SimpleTask {
    return {
      id: 'problem-capture',
      description: `Analyze and structure the business problem: "${problem}"`,
      expectedOutput: `A structured problem statement including:\n        - Problem definition and scope\n        - Target market and audience\n        - Pain points and urgency\n        - Market size and opportunity\n        - Initial risk assessment`,
      agentRole: 'Strategic Business Leader',
      context: `You are working with a team of experts to analyze a business opportunity.\n        Focus on understanding the core problem and validating the market opportunity.`
    };
  }

  static createProblemClarificationTask(_problemData: any): SimpleTask {
    return {
      id: 'problem-clarification',
      description: `Clarify and validate the problem statement with deeper analysis`,
      expectedOutput: `Refined problem analysis including:\n        - Customer segment validation\n        - Value proposition refinement\n        - Risk identification and mitigation\n        - Market fit assessment\n        - Go/no-go recommendation`,
      agentRole: 'Risk Guardian & Market Expert',
      context: `Build upon the initial problem analysis to provide deeper insights and validation.\n        Challenge assumptions and identify potential pitfalls.`
    };
  }

  static createSolutionBrainstormTask(_problemData: any): SimpleTask {
    return {
      id: 'solution-brainstorm',
      description: `Generate and evaluate potential solutions to the validated problem`,
      expectedOutput: `Solution analysis including:\n        - Multiple solution approaches\n        - Technical feasibility assessment\n        - Business model options\n        - Implementation complexity\n        - Recommended solution with rationale`,
      agentRole: 'Solution Architect & Business Model Expert',
      context: `Work collaboratively to generate innovative solutions while maintaining practical feasibility.\n        Consider both technical and business aspects.`
    };
  }

  static createCompetitorAnalysisTask(_solutionData: any): SimpleTask {
    return {
      id: 'competitor-analysis',
      description: `Analyze competitive landscape and identify market positioning opportunities`,
      expectedOutput: `Competitive analysis including:\n        - Direct and indirect competitors\n        - Competitive advantages and gaps\n        - Market positioning strategy\n        - Differentiation opportunities\n        - Competitive risk assessment`,
      agentRole: 'Market Strategist & Competitive Intelligence',
      context: `Analyze the competitive landscape to identify opportunities for differentiation and\n        sustainable competitive advantages.`
    };
  }

  static createSCAAnalysisTask(_competitiveData: any): SimpleTask {
    return {
      id: 'sca-analysis',
      description: `Evaluate sustainable competitive advantages and resource requirements`,
      expectedOutput: `SCA analysis including:\n        - Sustainable competitive advantages\n        - Resource requirements and availability\n        - Barriers to entry\n        - Long-term sustainability\n        - Resource allocation recommendations`,
      agentRole: 'Strategic Leader & Resource Analyst',
      context: `Assess the long-term sustainability of competitive advantages and identify\n        resource requirements for success.`
    };
  }

  static createMVPPlanningTask(_scaData: any): SimpleTask {
    return {
      id: 'mvp-planning',
      description: `Design MVP features, timeline, and resource allocation`,
      expectedOutput: `MVP plan including:\n        - Core MVP features and scope\n        - Development timeline and milestones\n        - Resource requirements and allocation\n        - Success metrics and validation\n        - Risk mitigation strategies`,
      agentRole: 'Technical Architect & Product Manager',
      context: `Design a practical MVP that can be built quickly while validating key assumptions.\n        Focus on learning and iteration.`
    };
  }

  static createTaskGenerationTask(_mvpData: any): SimpleTask {
    return {
      id: 'task-generation',
      description: `Break down MVP development into actionable tasks with dependencies`,
      expectedOutput: `Task breakdown including:\n        - Detailed task list with descriptions\n        - Task dependencies and critical path\n        - Effort estimates and resource allocation\n        - Timeline and milestones\n        - Risk mitigation and contingency plans`,
      agentRole: 'Project Manager & Implementation Specialist',
      context: `Create a detailed, actionable plan that can be executed by a development team.\n        Focus on practical implementation.`
    };
  }

  static getTasksForStep(stepId: string, context: any): SimpleTask[] {
    const taskMap: Record<string, (context: any) => SimpleTask> = {
      'PROBLEM_CAPTURE': () => this.createProblemCaptureTask(context.problem),
      'PROBLEM_CLARIFICATION': () => this.createProblemClarificationTask(context.problemData),
      'SOLUTION_BRAINSTORM': () => this.createSolutionBrainstormTask(context.problemData),
      'COMPETITOR_ANALYSIS': () => this.createCompetitorAnalysisTask(context.solutionData),
      'SCA_ANALYSIS': () => this.createSCAAnalysisTask(context.competitiveData),
      'MVP_PLANNING': () => this.createMVPPlanningTask(context.scaData),
      'TASK_GENERATION': () => this.createTaskGenerationTask(context.mvpData)
    };

    const taskCreator = taskMap[stepId];
    if (!taskCreator) {
      throw new Error(`No task creator found for step: ${stepId}`);
    }

    return [taskCreator(context)];
  }

  static createCollaborativeTask(stepId: string, context: any): SimpleTask {
    const tasks = this.getTasksForStep(stepId, context);
    return tasks[0];
  }
}
