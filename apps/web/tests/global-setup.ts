import { WebSocketTestServer } from './ws-server';

let wsServer: WebSocketTestServer;

async function globalSetup() {
  console.log('Starting global test setup...');
  
  // Start WebSocket test server
  try {
    wsServer = new WebSocketTestServer(7071);
    await wsServer.start();
    console.log('WebSocket test server started successfully');
    
    // Set environment variable for tests
    process.env.TEST_WS_URL = 'ws://localhost:7071/ws';
  } catch (error) {
    console.error('Failed to start WebSocket test server:', error);
    throw error;
  }
  
  console.log('Global test setup completed');
}

export default globalSetup;
