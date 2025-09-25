import express from 'express';
import { createStreamingLLMService } from '../ai/streaming-llm-core';

const router = express.Router();

// Initialize StreamingLLM service
const streamingService = createStreamingLLMService(process.env['OPENAI_API_KEY'] || '', {
  modelType: 'gpt-3.5-turbo',
  startSize: 4,
  recentSize: 100
});

// Enhanced AI analysis with StreamingLLM
router.post('/analyze', async (_req, res) => {
  try {
    const { prompt, context, stream = false } = _req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: prompt' 
      });
    }
    
    if (stream) {
      // Return streaming response using our enhanced service
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      
      // Use the streaming method with cache management
      for await (const chunk of streamingService.streamWithCacheManagement(prompt, context)) {
        if (chunk.chunk) {
          res.write(chunk.chunk);
        }
        
        if (chunk.isComplete) {
          res.end();
          return; // Explicit return
        }
      }
      
      // Fallback return for streaming
      return res.end();
      
    } else {
      // Non-streaming response for compatibility
      const result = await streamingService.processWithStreamingLLM(prompt, context);
      
      return res.json({ 
        success: true, 
        analysis: result.response,
        cacheStats: result.cacheStats,
        message: 'Analysis completed successfully' 
      });
    }
    

    
  } catch (error) {
    console.error('AI analysis error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'AI analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enhanced streaming chat endpoint
router.post('/chat/stream', async (_req, res) => {
  try {
    const { message, sessionContext, stream = true } = _req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: message' 
      });
    }

    if (stream) {
      // Use our enhanced streaming service
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Stream with cache management
      for await (const chunk of streamingService.streamWithCacheManagement(message, sessionContext?.summary)) {
        if (chunk.chunk) {
          res.write(chunk.chunk);
        }
        
        if (chunk.isComplete) {
          res.end();
          return; // Explicit return
        }
      }
      
      // Fallback return for streaming
      return res.end();
      
    } else {
      // Fallback to non-streaming
      const result = await streamingService.processWithStreamingLLM(message, sessionContext?.summary);
      
      return res.json({ 
        success: true, 
        response: result.response,
        cacheStats: result.cacheStats,
        message: 'Chat response completed' 
      });
    }
    
  } catch (error) {
    console.error('Streaming chat error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Streaming chat failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate session summary using StreamingLLM
router.post('/summarize', async (_req, res) => {
  try {
    const { messages } = _req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing or invalid messages array' 
      });
    }

    // Extract message content for summarization
    const messageContent = messages.map(msg => 
      `${msg.sender}: ${msg.content}`
    );

    // Generate summary using our enhanced service
    const result = await streamingService.processWithStreamingLLM(
      `Summarize the following conversation: ${messageContent.join('\n')}`,
      'Focus on key insights and decisions made'
    );
    
    const summary = result.response;
    
    return res.json({ 
      success: true, 
      summary,
      message: 'Session summary generated successfully' 
    });
    
  } catch (error) {
    console.error('Summary generation error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Summary generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Problem Clarification endpoint
router.post('/clarify-problem', async (_req, res) => {
  try {
    const { problem, projectId, projectName, context } = _req.body;
    
    if (!problem) {
      return res.status(400).json({ error: 'Problem statement is required' });
    }

    const prompt = `You are an AI startup consultant helping to clarify and structure a problem statement.

**Original Problem Statement:**
${problem}

**Your Task:**
Analyze this problem statement and provide a clear, structured clarification that includes:

1. **Core Problem:** What is the fundamental issue being addressed?
2. **Target Audience:** Who experiences this problem?
3. **Pain Points:** What are the specific frustrations and challenges?
4. **Current Solutions:** What alternatives exist today?
5. **Market Opportunity:** Why is this problem worth solving?
6. **Next Steps:** What should the founder focus on next?

**Format your response as:**
**Clarified Problem Statement:**
[Clear, specific problem description]

**Key Components Identified:**
• **Core Issue:** [Main problem]
• **Target Users:** [Who experiences this]
• **Pain Points:** [Specific frustrations]
• **Current Solutions:** [Existing alternatives]
• **Opportunity:** [What's missing]

**Next Steps:**
[Actionable next steps for the founder]

Keep your analysis focused, practical, and startup-oriented.`;

    const result = await streamingService.processWithStreamingLLM(prompt, context);

    const clarifiedProblem = result.response;

    res.json({
      success: true,
      clarifiedProblem,
      originalProblem: problem,
      projectId,
      projectName
    });

  } catch (error) {
    console.error('Error in problem clarification:', error);
    return res.status(500).json({ 
      error: 'Failed to clarify problem statement',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// SCA Analysis endpoint
router.post('/sca-analysis', async (_req, res) => {
  try {
    const { projectId, projectName, context } = _req.body;
    
    const prompt = `You are an AI startup consultant helping to identify sustainable competitive advantages (SCAs).

**Project:** ${projectName || 'Startup Project'}

**Your Task:**
Analyze this startup project and identify potential sustainable competitive advantages across different categories:

1. **Technical Advantages:** Unique technology, architecture, or technical capabilities
2. **Business Model Advantages:** Revenue model, pricing strategy, or operational efficiency
3. **Network Effects:** User base, ecosystem, or platform effects
4. **Brand Advantages:** Reputation, trust, or market positioning
5. **Regulatory Advantages:** Compliance, licenses, or regulatory barriers
6. **Resource-Based Advantages:** Team, partnerships, or proprietary assets

**Format your response as a JSON array of SCA factors:**
[
  {
    "id": "unique_id",
    "category": "TECHNICAL|BUSINESS_MODEL|NETWORK_EFFECTS|BRAND|REGULATORY|RESOURCE_BASED",
    "factor": "Specific competitive advantage",
    "description": "Detailed explanation of this advantage",
    "strength": "LOW|MEDIUM|HIGH",
    "sustainability": "SHORT_TERM|MEDIUM_TERM|LONG_TERM",
    "evidence": "Supporting evidence or reasoning",
    "actionItems": ["Action 1", "Action 2", "Action 3"]
  }
]

Focus on realistic, achievable advantages that can be sustained over time.`;

    const result = await streamingService.processWithStreamingLLM(prompt, context);
    
    // Try to parse the response as JSON, fallback to text if needed
    let scaFactors;
    try {
      scaFactors = JSON.parse(result.response);
    } catch (parseError) {
      // If parsing fails, create a structured response from the text
      scaFactors = [{
        id: 'fallback_1',
        category: 'TECHNICAL',
        factor: 'AI-Powered Analysis',
        description: result.response,
        strength: 'MEDIUM',
        sustainability: 'MEDIUM_TERM',
        evidence: 'AI-generated analysis of competitive advantages',
        actionItems: ['Validate with market research', 'Develop implementation plan']
      }];
    }

    res.json({
      success: true,
      scaFactors,
      projectId,
      projectName
    });

  } catch (error) {
    console.error('Error in SCA analysis:', error);
    res.status(500).json({ 
      error: 'Failed to generate SCA analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// MVP Planning endpoint
router.post('/mvp-planning', async (_req, res) => {
  try {
    const { projectId, projectName, scaFactors, context } = _req.body;
    
    const prompt = `You are an AI startup consultant helping to create an MVP plan.

**Project:** ${projectName || 'Startup Project'}

**SCA Factors:** ${JSON.stringify(scaFactors || [])}

**Your Task:**
Create a comprehensive MVP plan with prioritized features based on the SCA analysis. Focus on:
1. Core value proposition features
2. Technical feasibility
3. Market validation potential
4. Resource requirements

**Format your response as a JSON array of MVP features:**
[
  {
    "id": "unique_id",
    "name": "Feature name",
    "description": "Detailed description",
    "priority": "MUST_HAVE|SHOULD_HAVE|COULD_HAVE|WONT_HAVE",
    "effort": "LOW|MEDIUM|HIGH",
    "impact": "LOW|MEDIUM|HIGH",
    "scaAlignment": ["SCA factor 1", "SCA factor 2"],
    "userStories": ["As a user, I want...", "As a user, I need..."],
    "acceptanceCriteria": ["Criteria 1", "Criteria 2"],
    "estimatedTime": "2-3 weeks",
    "estimatedCost": "$5,000 - $10,000"
  }
]

Prioritize features that align with identified competitive advantages.`;

    const result = await streamingService.processWithStreamingLLM(prompt, context);
    
    // Try to parse the response as JSON, fallback to structured response if needed
    let mvpFeatures;
    try {
      mvpFeatures = JSON.parse(result.response);
    } catch (parseError) {
      // If parsing fails, create a structured response from the text
      mvpFeatures = [{
        id: 'fallback_1',
        name: 'Core MVP Feature',
        description: result.response,
        priority: 'MUST_HAVE',
        effort: 'MEDIUM',
        impact: 'HIGH',
        scaAlignment: ['Core Value Proposition'],
        userStories: ['As a user, I want to access the core functionality'],
        acceptanceCriteria: ['Feature is functional', 'User can complete main task'],
        estimatedTime: '2-3 weeks',
        estimatedCost: '$5,000 - $10,000'
      }];
    }

    res.json({
      success: true,
      mvpFeatures,
      projectId,
      projectName
    });

  } catch (error) {
    console.error('Error in MVP planning:', error);
    res.status(500).json({ 
      error: 'Failed to generate MVP plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'ai-streaming-api',
    streaming: true,
    attentionSinks: true,
    timestamp: new Date().toISOString()
  });
});

export default router;
