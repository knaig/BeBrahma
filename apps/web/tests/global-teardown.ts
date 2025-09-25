import { WebSocketTestServer } from './ws-server';

async function globalTeardown() {
  console.log('Starting global test teardown...');
  
  // Stop WebSocket test server
  try {
    // Note: In a real implementation, you would store the server instance
    // in a way that allows access from teardown. For now, we'll create
    // a new instance to stop it.
    const wsServer = new WebSocketTestServer(7071);
    await wsServer.stop();
    console.log('WebSocket test server stopped successfully');
  } catch (error) {
    console.error('Failed to stop WebSocket test server:', error);
  }
  
  console.log('Global test teardown completed');
}

export default globalTeardown;
