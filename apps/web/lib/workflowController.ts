// Stub implementation of workflow controller
// TODO: Replace with actual implementation

interface WorkflowStep {
    id: string;
    name: string;
    status: 'pending' | 'active' | 'completed' | 'approved';
    description?: string;
    estimatedDuration?: number;
    requiredData?: string[];
}

interface WorkflowState {
    currentStepId: string | null;
    conversationStatus?: 'active' | 'paused' | 'complete';
    progress: number;
}

class WorkflowController {
    private state: WorkflowState = {
        currentStepId: null,
        progress: 0
    };

    private steps: WorkflowStep[] = [
        { id: 'PROBLEM_CAPTURE', name: 'Problem Capture', status: 'pending', description: 'Capture the problem', estimatedDuration: 15 },
        { id: 'PROBLEM_CLARIFICATION', name: 'Problem Clarification', status: 'pending', description: 'Clarify the problem', estimatedDuration: 10 },
        { id: 'SOLUTION_BRAINSTORM', name: 'Solution Brainstorm', status: 'pending', description: 'Brainstorm solutions', estimatedDuration: 20 }
    ];

    private listeners: Array<(state: WorkflowState) => void> = [];

    subscribe(listener: (state: WorkflowState) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    getCurrentState() {
        return this.state;
    }

    getCurrentStep() {
        if (!this.state.currentStepId) return null;
        return this.steps.find(s => s.id === this.state.currentStepId) || null;
    }

    getAllSteps() {
        return this.steps;
    }

    getAllAgents() {
        return [
            { id: 'agent1', name: 'Business Analyst', status: 'active', title: 'Business Analyst', avatar: '👔', personality: 'Analytical', expertise: ['Business', 'Strategy'] },
            { id: 'agent2', name: 'Market Researcher', status: 'active', title: 'Market Researcher', avatar: '📊', personality: 'Data-driven', expertise: ['Market Research', 'Analytics'] }
        ];
    }

    getAgentsForStep(stepId: string) {
        return this.getAllAgents();
    }

    startStep(stepId: string) {
        this.state.currentStepId = stepId;
        const step = this.steps.find(s => s.id === stepId);
        if (step) {
            step.status = 'active';
        }
        this.notifyListeners();
    }

    completeStep(stepId: string) {
        const step = this.steps.find(s => s.id === stepId);
        if (step) {
            step.status = 'completed';
        }
        this.notifyListeners();
    }

    approveStep(stepId: string) {
        const step = this.steps.find(s => s.id === stepId);
        if (step) {
            step.status = 'approved';
        }
        this.notifyListeners();
    }

    canCompleteStep(stepId: string) {
        const step = this.steps.find(s => s.id === stepId);
        return step?.status === 'active';
    }

    moveToNextStep() {
        const currentIndex = this.steps.findIndex(s => s.id === this.state.currentStepId);
        if (currentIndex >= 0 && currentIndex < this.steps.length - 1) {
            this.startStep(this.steps[currentIndex + 1].id);
            return true;
        }
        return false;
    }

    resetWorkflow() {
        this.state = { currentStepId: null, progress: 0 };
        this.steps.forEach(s => s.status = 'pending');
        this.notifyListeners();
    }

    getProgress() {
        const completed = this.steps.filter(s => s.status === 'approved' || s.status === 'completed').length;
        return Math.round((completed / this.steps.length) * 100);
    }

    resumeConversation() {
        this.state.conversationStatus = 'active';
        this.notifyListeners();
    }

    pauseConversation() {
        this.state.conversationStatus = 'paused';
        this.notifyListeners();
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

export const workflowController = new WorkflowController();
