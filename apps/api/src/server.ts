import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

// Load unified env config (supports root .env and .env.local)
import { apiConfig as config } from '../../../bebrahma/env.config.js';

// Import routes
import conversationRoutes from './routes/conversation';
import chatRoutes from './routes/chat';
import aiRoutes from './routes/ai';
import adminRoutes from './routes/admin';
import saasRoutes from './routes/saas';
import uxEnhancedRoutes from './routes/ux-enhanced';
import billingRoutes from './routes/billing';
import userRoutes from './routes/user';
import agentRoutes from './routes/agents';
import activityRoutes from './routes/activity';
import projectsRoutes from './routes/projects';
import tasksRoutes from './routes/tasks';
import exportRoutes from './routes/export';
import docsRoutes from './routes/docs';
import analyticsRoutes from './routes/analytics';
import feedbackRoutes from './routes/feedback';

// Import middleware
import { generalRateLimit } from './middleware/rateLimit';

// Import WebSocket manager
import { webSocketManager } from './websocket/index';

const app = express();

// Middleware
app.use(cors({
  origin: config.ALLOWED_ORIGINS,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiting
app.use(generalRateLimit);

// Health check endpoint
app.get('/health', async (_req, res) => {
  // Quick reachability checks for external services
  let crewReachable = false;
  let workflowReachable = false;
  
  try {
    crewReachable = await checkServiceReachability(config.CREW_SERVICE_URL, 'Crew');
  } catch (error) {
    // Service check failed
  }
  
  try {
    workflowReachable = await checkServiceReachability(config.WORKFLOW_SERVICE_URL, 'Workflow');
  } catch (error) {
    // Service check failed
  }

  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    port: config.PORT,
    apiUrl: config.API_URL,
    frontendUrl: config.FRONTEND_URL,
      services: {
        llm: {
          openai: Boolean(config.OPENAI_API_KEY),
          anthropic: Boolean(config.ANTHROPIC_API_KEY),
        },
        billing: {
          stripe: Boolean(process.env.STRIPE_SECRET_KEY),
          razorpay: Boolean(process.env.RAZORPAY_KEY_ID),
        },
        auth: {
          clerk: Boolean(process.env.CLERK_SECRET_KEY),
        },
        database: {
          connected: Boolean(process.env.DATABASE_URL),
        },
        websocket: {
          healthy: webSocketManager.isHealthy(),
        },
        activity: {
          tracking: true,
        },
        external: {
          crew: {
            url: config.CREW_SERVICE_URL,
            configured: Boolean(config.CREW_SERVICE_URL),
            reachable: crewReachable,
          },
          workflow: {
            url: config.WORKFLOW_SERVICE_URL,
            configured: Boolean(config.WORKFLOW_SERVICE_URL),
            reachable: workflowReachable,
          },
        },
      }
  });
});

// API routes
app.use('/api/conversation', conversationRoutes);
app.use('/api', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/saas', saasRoutes);
app.use('/api/ux-enhanced', uxEnhancedRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/user', userRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api', projectsRoutes);
app.use('/api', tasksRoutes);
app.use('/api', exportRoutes);
app.use('/api', docsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/feedback', feedbackRoutes);

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  return res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (_req, res) => {
  return res.status(404).json({ error: 'Route not found' });
});

const PORT = config.PORT;

// Create HTTP server to support both Express and WebSocket
const server = createServer(app);

// Initialize WebSocket server
try {
  webSocketManager.initialize(server);
  console.log('✅ WebSocket server initialized');
} catch (error) {
  console.error('❌ Failed to initialize WebSocket server:', error);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  webSocketManager.shutdown();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  webSocketManager.shutdown();
  server.close(() => {
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 BeBrahma AI API Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${config.FRONTEND_URL}`);
  console.log(`🔑 OpenAI API: ${config.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🔑 Anthropic API: ${config.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  console.log(`🔧 API URL: ${config.API_URL}`);
  console.log(`🌐 Allowed Origins: ${config.ALLOWED_ORIGINS.join(', ')}`);
  console.log(`🛰️ CREW_SERVICE_URL: ${config.CREW_SERVICE_URL}`);
  console.log(`⚙️ WORKFLOW_SERVICE_URL: ${config.WORKFLOW_SERVICE_URL}`);
  console.log(`🔌 WebSocket URL: ws://localhost:${PORT}/ws`);
  
  // Validate service URLs during startup
  validateServiceUrls().catch(error => {
    console.error('Error during service validation:', error);
  });
});

// Service reachability check function
async function checkServiceReachability(url: string, serviceName: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Service URL validation function
async function validateServiceUrls() {
  console.log('\n🔍 Validating service connectivity...');
  
  // Validate crew service URL
  try {
    const crewUrl = new URL(config.CREW_SERVICE_URL);
    console.log(`✅ Crew Service URL valid: ${crewUrl.href}`);
    
    // Check reachability
    const crewReachable = await checkServiceReachability(config.CREW_SERVICE_URL, 'Crew');
    console.log(`📡 Crew Service reachable: ${crewReachable}`);
  } catch (error) {
    console.error(`❌ Invalid Crew Service URL: ${config.CREW_SERVICE_URL}`);
  }
  
  // Validate workflow service URL
  try {
    const workflowUrl = new URL(config.WORKFLOW_SERVICE_URL);
    console.log(`✅ Workflow Service URL valid: ${workflowUrl.href}`);
    
    // Check reachability
    const workflowReachable = await checkServiceReachability(config.WORKFLOW_SERVICE_URL, 'Workflow');
    console.log(`📡 Workflow Service reachable: ${workflowReachable}`);
  } catch (error) {
    console.error(`❌ Invalid Workflow Service URL: ${config.WORKFLOW_SERVICE_URL}`);
  }
  
  // Check if we're in a deployment environment
  const deploymentEnv = config.DEPLOYMENT_ENV || config.NODE_ENV;
  if (deploymentEnv === 'staging' || deploymentEnv === 'production') {
    console.log(`🌐 Deployment Environment: ${deploymentEnv}`);
    console.log(`📡 Service Discovery: ECS service discovery URLs configured`);
  } else {
    console.log(`🏠 Development Environment: Using localhost URLs`);
  }
  
  console.log('🔍 Service validation complete\n');
}

export default app;
