import ChatInterface from '@/components/ChatInterface';

export default function TestChatPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          ChatInterface Test Page
        </h1>
        
        {/* Test Harness Panel */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Test Harness Controls
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Architecture Flow Controls */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Architecture Flow</h3>
              <button 
                data-testid="start-architecture-flow"
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Start Flow
              </button>
              <button 
                data-testid="validate-service-communication"
                className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Validate Services
              </button>
            </div>
            
            {/* Request/Response Controls */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Request/Response</h3>
              <button 
                data-testid="test-request-response-flow"
                className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
              >
                Test Flow
              </button>
              <button 
                data-testid="validate-data-transformation"
                className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
              >
                Validate Data
              </button>
            </div>
            
            {/* Service Mocking Controls */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Service Mocking</h3>
              <button 
                data-testid="mock-langgraph-service"
                className="px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
              >
                Mock LangGraph
              </button>
              <button 
                data-testid="mock-crewai-service"
                className="px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
              >
                Mock CrewAI
              </button>
            </div>
            
            {/* Workflow Controls */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Workflow</h3>
              <button 
                data-testid="start-workflow"
                className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Start Workflow
              </button>
              <button 
                data-testid="test-api-communication"
                className="px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
              >
                Test API
              </button>
            </div>
          </div>
          
          {/* Test Status Display */}
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div data-testid="workflow-initialization" className="hidden">Initializing...</div>
              <div data-testid="service-communication" className="hidden">Checking...</div>
              <div data-testid="flow-execution" className="hidden">Executing...</div>
              <div data-testid="validation-results" className="hidden">Validating...</div>
            </div>
          </div>
        </div>
        
        {/* Chat Interface */}
        <ChatInterface />
      </div>
    </div>
  );
}
