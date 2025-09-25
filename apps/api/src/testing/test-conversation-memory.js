#!/usr/bin/env node

/**
 * Test script for conversation memory system
 * Run with: node test-conversation-memory.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const TEST_USER_ID = 'test-user-123';
const TEST_SESSION_ID = 'test-session-456';
const TEST_PROBLEM = 'I need help with business strategy planning';

async function testConversationMemory() {
  console.log('🧪 Testing Conversation Memory System\n');

  try {
    // Test 1: Initialize session
    console.log('1️⃣ Initializing session...');
    const initResponse = await axios.post(`${BASE_URL}/conversation/sessions`, {
      userId: TEST_USER_ID,
      sessionId: TEST_SESSION_ID,
      problem: TEST_PROBLEM
    });
    
    if (initResponse.data.success) {
      console.log('✅ Session initialized successfully');
      console.log(`   Session ID: ${initResponse.data.data.sessionId}`);
      console.log(`   Problem: ${initResponse.data.data.problem}`);
    } else {
      console.log('❌ Failed to initialize session');
      return;
    }

    // Test 2: Save first message
    console.log('\n2️⃣ Saving first message...');
    const message1Response = await axios.post(`${BASE_URL}/conversation/sessions/${TEST_SESSION_ID}/messages`, {
      content: 'Hello! I\'m starting a new SaaS business and need help with market research.',
      sender: 'user',
      userId: TEST_USER_ID,
      problem: TEST_PROBLEM
    });
    
    if (message1Response.data.success) {
      console.log('✅ First message saved successfully');
      console.log(`   Message ID: ${message1Response.data.data.id}`);
    } else {
      console.log('❌ Failed to save first message');
      return;
    }

    // Test 3: Save second message
    console.log('\n3️⃣ Saving second message...');
    const message2Response = await axios.post(`${BASE_URL}/conversation/sessions/${TEST_SESSION_ID}/messages`, {
      content: 'I want to understand my target market and competitive landscape.',
      sender: 'user',
      userId: TEST_USER_ID,
      problem: TEST_PROBLEM
    });
    
    if (message2Response.data.success) {
      console.log('✅ Second message saved successfully');
      console.log(`   Message ID: ${message2Response.data.data.id}`);
    } else {
      console.log('❌ Failed to save second message');
      return;
    }

    // Test 4: Get conversation context
    console.log('\n4️⃣ Getting conversation context...');
    const contextResponse = await axios.get(`${BASE_URL}/conversation/sessions/${TEST_SESSION_ID}/context`);
    
    if (contextResponse.data.success) {
      console.log('✅ Context retrieved successfully');
      const context = contextResponse.data.data;
      console.log(`   Chat History Length: ${context.chatHistory.length} characters`);
      console.log(`   Summary Length: ${context.summary.length} characters`);
      console.log(`   Insights Count: ${context.insights.length}`);
      console.log(`   Current Session: ${context.currentSession ? 'Active' : 'Inactive'}`);
    } else {
      console.log('❌ Failed to get context');
      return;
    }

    // Test 5: Get memory buffer
    console.log('\n5️⃣ Getting memory buffer...');
    const bufferResponse = await axios.get(`${BASE_URL}/conversation/sessions/${TEST_SESSION_ID}/buffer?limit=10`);
    
    if (bufferResponse.data.success) {
      console.log('✅ Memory buffer retrieved successfully');
      const messages = bufferResponse.data.data;
      console.log(`   Message Count: ${messages.length}`);
      messages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.sender}: ${msg.content.substring(0, 50)}...`);
      });
    } else {
      console.log('❌ Failed to get memory buffer');
      return;
    }

    // Test 6: Get session status
    console.log('\n6️⃣ Getting session status...');
    const statusResponse = await axios.get(`${BASE_URL}/conversation/sessions/${TEST_SESSION_ID}/status`);
    
    if (statusResponse.data.success) {
      console.log('✅ Session status retrieved successfully');
      const status = statusResponse.data.data;
      console.log(`   Is Active: ${status.isActive}`);
      console.log(`   Session ID: ${status.sessionId}`);
      console.log(`   Message Count: ${status.messageCount}`);
      console.log(`   Last Activity: ${status.lastActivity}`);
    } else {
      console.log('❌ Failed to get session status');
      return;
    }

    // Test 7: Get conversation summary
    console.log('\n7️⃣ Getting conversation summary...');
    const summaryResponse = await axios.get(`${BASE_URL}/conversation/sessions/${TEST_SESSION_ID}/summary`);
    
    if (summaryResponse.data.success) {
      console.log('✅ Summary retrieved successfully');
      const summary = summaryResponse.data.data;
      console.log(`   Summary Length: ${summary.length} characters`);
      console.log(`   Summary Preview: ${summary.substring(0, 100)}...`);
    } else {
      console.log('❌ Failed to get summary');
      return;
    }

    console.log('\n🎉 All tests passed! Conversation memory system is working correctly.');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Session initialization');
    console.log('   ✅ Message saving');
    console.log('   ✅ Context retrieval');
    console.log('   ✅ Memory buffer access');
    console.log('   ✅ Session status checking');
    console.log('   ✅ Summary generation');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Run the test
testConversationMemory();
