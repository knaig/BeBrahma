#!/usr/bin/env node

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

/**
 * Real MCP Client for Playwright integration
 * Communicates with the Playwright MCP server via stdio
 */
export class PlaywrightMCPClient extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    console.log('🔌 Connecting to Playwright MCP server...');
    
    this.process = spawn('npx', ['@playwright/mcp'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    this.process.stdout.on('data', (data) => {
      this.handleResponse(data.toString());
    });

    this.process.stderr.on('data', (data) => {
      console.error('MCP Server Error:', data.toString());
    });

    this.process.on('close', (code) => {
      console.log(`MCP Server closed with code ${code}`);
      this.isConnected = false;
      this.emit('disconnect');
    });

    this.process.on('error', (error) => {
      console.error('MCP Server Error:', error);
      this.isConnected = false;
      this.emit('error', error);
    });

    // Wait for connection to be established and initialize
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`❌ MCP connection timeout after 10 seconds. 
        
Please ensure:
1. Playwright MCP is properly installed: npm install @playwright/mcp
2. Playwright browsers are installed: npx playwright install
3. No firewall is blocking the connection

The system requires real MCP integration and cannot fallback to simulation.`));
      }, 10000);

      // Send initialization message
      const initMessage = {
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: { listChanged: true },
            sampling: {}
          },
          clientInfo: {
            name: 'BeBrahma-Test-Runner',
            version: '1.0.0'
          }
        }
      };

      this.process.stdin.write(JSON.stringify(initMessage) + '\n');
      
      // Wait for initialization response
      const onData = (data) => {
        try {
          const response = JSON.parse(data.toString().trim());
          if (response.id === 0 && response.result) {
            this.process.stdout.removeListener('data', onData);
            clearTimeout(timeout);
            this.isConnected = true;
            this.requestId = 1; // Start from 1 for actual requests
            resolve();
          }
        } catch (e) {
          // Continue waiting for valid response
        }
      };

      this.process.stdout.on('data', onData);
    });

    console.log('✅ Connected to Playwright MCP server');
  }

  async disconnect() {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isConnected = false;
    }
  }

  handleResponse(data) {
    try {
      const lines = data.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.startsWith('{') && line.endsWith('}')) {
          const response = JSON.parse(line);
          this.handleMCPResponse(response);
        }
      }
    } catch (error) {
      console.error('Error parsing MCP response:', error);
    }
  }

  handleMCPResponse(response) {
    console.log('MCP Response:', JSON.stringify(response, null, 2));
    
    // Handle notifications (no ID) - just log them
    if (!response.id) {
      console.log('MCP Notification:', response.method);
      return;
    }
    
    // Handle roots/list notification with ID 0
    if (response.id === 0 && response.method === 'roots/list') {
      console.log('Handling roots/list notification');
      return;
    }
    
    if (response.id && this.pendingRequests.has(response.id)) {
      const { resolve, reject } = this.pendingRequests.get(response.id);
      this.pendingRequests.delete(response.id);
      
      if (response.error) {
        console.error('MCP Error:', response.error);
        reject(new Error(response.error.message || 'MCP request failed'));
      } else {
        resolve(response.result);
      }
    }
  }

  async sendRequest(method, params = {}) {
    if (!this.isConnected) {
      throw new Error(`❌ MCP client not connected. 
      
Please ensure:
1. MCP server is running and accessible
2. No network issues are blocking the connection
3. Playwright MCP is properly installed

The system requires real MCP integration and cannot fallback to simulation.`);
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method: `tools/call`,
      params: {
        name: method,
        arguments: params
      }
    };

    console.log('Sending MCP Request:', JSON.stringify(request, null, 2));

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`MCP request timeout: ${method}`));
      }, 30000);

      this.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  // Playwright MCP Methods
  async browser_navigate(url) {
    console.log(`🌐 Navigating to: ${url}`);
    
    // First try to install browser if needed
    try {
      await this.sendRequest('browser_install', {});
      console.log('✅ Browser install completed');
    } catch (error) {
      console.log('⚠️ Browser install failed or not needed:', error.message);
    }
    
    return this.sendRequest('browser_navigate', { url });
  }

  async browser_click(element) {
    console.log(`🖱️ Clicking: ${element}`);
    // Use browser_evaluate to click elements
    return this.sendRequest('browser_evaluate', { 
      function: `
        () => {
          const selectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:contains("${element}")',
            '[data-testid*="${element}"]',
            '.${element}',
            '#${element}',
            'button:contains("Sign in")',
            'button:contains("Login")',
            'a:contains("${element}")'
          ];
          
          for (const selector of selectors) {
            try {
              const el = document.querySelector(selector);
              if (el) {
                el.click();
                return { success: true, clicked: selector };
              }
            } catch (e) {
              // Try next selector
            }
          }
          
          // Try to find by text content
          const buttons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
          for (const btn of buttons) {
            if (btn.textContent?.toLowerCase().includes('${element.toLowerCase()}')) {
              btn.click();
              return { success: true, clicked: 'text content match' };
            }
          }
          
          return { success: false, error: 'Element not found: ${element}' };
        }
      `
    });
  }

  async browser_fill(field, value) {
    console.log(`✏️ Filling field: ${field}`);
    // Use browser_evaluate to fill form fields directly
    return this.sendRequest('browser_evaluate', { 
      function: `
        () => {
          const elements = document.querySelectorAll('input, textarea, select');
          for (const el of elements) {
            if (el.name === '${field}' || el.id === '${field}' || el.placeholder?.toLowerCase().includes('${field.toLowerCase()}')) {
              el.value = '${value}';
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return { success: true, element: el.tagName, field: '${field}' };
            }
          }
          return { success: false, error: 'Field not found: ${field}' };
        }
      `
    });
  }

  async browser_wait_for(condition, timeout = 10000) {
    console.log(`⏳ Waiting for: ${condition}`);
    // Use browser_evaluate to wait for conditions
    return this.sendRequest('browser_evaluate', { 
      function: `
        () => {
          const startTime = Date.now();
          const maxWait = ${timeout};
          
          function checkCondition() {
            switch ('${condition}') {
              case 'page_loaded':
                return document.readyState === 'complete';
              case 'solution-options-loaded':
                return document.querySelector('.solution-options, [data-testid*="solution"]') !== null;
              case 'gtm-prompt-generated':
                return document.querySelector('.gtm-prompt, [data-testid*="gtm"]') !== null;
              default:
                // Generic element check
                return document.querySelector('${condition}') !== null;
            }
          }
          
          while (Date.now() - startTime < maxWait) {
            if (checkCondition()) {
              return { success: true, condition: '${condition}', waited: Date.now() - startTime };
            }
            // Small delay to prevent busy waiting
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            await delay(100);
          }
          
          return { success: false, error: 'Timeout waiting for: ${condition}' };
        }
      `
    });
  }

  async browser_screenshot(name = 'screenshot') {
    console.log(`📸 Taking screenshot: ${name}`);
    return this.sendRequest('browser_take_screenshot', { filename: `${name}.png` });
  }

  async browser_get_text(selector) {
    console.log(`📝 Getting text from: ${selector}`);
    // Use browser_evaluate to get text content
    return this.sendRequest('browser_evaluate', { 
      function: `() => document.querySelector('${selector}')?.textContent || ''` 
    });
  }

  async browser_evaluate(script) {
    console.log(`🔍 Evaluating script`);
    return this.sendRequest('browser_evaluate', { function: script });
  }

  async browser_close() {
    console.log(`🚪 Closing browser`);
    return this.sendRequest('browser_close');
  }

  async browser_resize(width, height) {
    console.log(`📐 Resizing browser: ${width}x${height}`);
    return this.sendRequest('browser_resize', { width, height });
  }

  async browser_console_messages() {
    console.log(`📋 Getting console messages`);
    return this.sendRequest('browser_console_messages');
  }

  async browser_network_requests() {
    console.log(`🌐 Getting network requests`);
    return this.sendRequest('browser_network_requests');
  }

  async browser_trace_start() {
    console.log(`🔍 Starting trace`);
    return this.sendRequest('browser_trace_start');
  }

  async browser_trace_stop() {
    console.log(`🔍 Stopping trace`);
    return this.sendRequest('browser_trace_stop');
  }

  async browser_download(path) {
    console.log(`💾 Downloading to: ${path}`);
    return this.sendRequest('browser_download', { path });
  }

  async browser_snapshot() {
    console.log(`📊 Getting page snapshot`);
    return this.sendRequest('browser_snapshot');
  }

  async browser_press_key(key) {
    console.log(`⌨️ Pressing key: ${key}`);
    return this.sendRequest('browser_press_key', { key });
  }

  async browser_type(text, element = null) {
    console.log(`⌨️ Typing: ${text}`);
    return this.sendRequest('browser_type', { text, element });
  }

  async browser_select_option(element, values) {
    console.log(`📋 Selecting options: ${values.join(', ')}`);
    return this.sendRequest('browser_select_option', { element, values });
  }

  async browser_hover(element) {
    console.log(`👆 Hovering over: ${element}`);
    return this.sendRequest('browser_hover', { element });
  }

  async browser_drag(startElement, endElement) {
    console.log(`🖱️ Dragging from ${startElement} to ${endElement}`);
    return this.sendRequest('browser_drag', { startElement, endElement });
  }

  async browser_upload_files(paths) {
    console.log(`📁 Uploading files: ${paths.join(', ')}`);
    return this.sendRequest('browser_upload_files', { paths });
  }

  async browser_handle_dialog(accept = true, promptText = null) {
    console.log(`💬 Handling dialog: ${accept ? 'accept' : 'dismiss'}`);
    return this.sendRequest('browser_handle_dialog', { accept, promptText });
  }

  async browser_fill_form(fields) {
    console.log(`📝 Filling form with ${fields.length} fields`);
    return this.sendRequest('browser_fill_form', { fields });
  }

  async browser_extract(instruction) {
    console.log(`🔍 Extracting: ${instruction}`);
    return this.sendRequest('browser_extract', { instruction });
  }

  async browser_observe(instruction, returnAction = false) {
    console.log(`👀 Observing: ${instruction}`);
    return this.sendRequest('browser_observe', { instruction, returnAction });
  }

  async browser_act(action, variables = {}) {
    console.log(`🎬 Acting: ${action}`);
    return this.sendRequest('browser_act', { action, variables });
  }

  async browser_get_url() {
    console.log(`🔗 Getting current URL`);
    return this.sendRequest('browser_get_url');
  }

  async browser_wait_for_text(text, timeout = 10000) {
    console.log(`⏳ Waiting for text: ${text}`);
    return this.sendRequest('browser_wait_for', { text, timeout });
  }

  async browser_wait_for_text_gone(text, timeout = 10000) {
    console.log(`⏳ Waiting for text to disappear: ${text}`);
    return this.sendRequest('browser_wait_for', { textGone: text, timeout });
  }

  async browser_wait_for_time(time) {
    console.log(`⏳ Waiting for ${time} seconds`);
    return this.sendRequest('browser_wait_for', { time });
  }
}

export default PlaywrightMCPClient;
