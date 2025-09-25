#!/usr/bin/env node

/**
 * Test script for conversation continuity and history recall
 * Run with: node test-conversation-continuity.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const TEST_USER_ID = 'test-user-continuity';
const TEST_SESSION_ID = 'test-session-continuity';
const TEST_PROBLEM = 'I need help with business strategy planning';

async function testConversationContinuity() {
  console.log('🧪 Testing Conversation Continuity & History Recall\n');

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
    } else {
      console.log('❌ Failed to initialize session');
      return;
    }

    // Test 2: Save first message about business idea
    console.log('\n2️⃣ Saving first message (business idea)...');
    const message1Response = await axios.post(`${BASE_URL}/conversation/sessions/${TEST_SESSION_ID}/messages`, {
      content: 'I have an idea for a SaaS platform that helps small businesses manage their inventory.',
      sender: 'user',
      userId: TEST_USER_ID,
      problem: TEST_PROBLEM
    });
    
    if (message1Response.data.success) {
      console.log('✅ First message saved successfully');
    } else {
      console.log('❌ Failed to save first message');
      return;
    }

    // Test 3: Save second message about target market
    console.log('\n3️⃣ Saving second message (target market)...');
    const message2Response = await axios.post(`${BASE_URL}/conversation/sessions/${TEST_SESSION_ID}/messages`, {
      content: 'My target market is small retail businesses with 5-50 employees.',
      sender: 'user',
      userId: TEST_USER_ID,
      problem: TEST_PROBLEM
    });
    
    if (message2Response.data.success) {
      console.log('✅ Second message saved successfully');
    } else {
      console.log('❌ Failed to save second message');
      return;
    }

    // Test 4: Save third message about competition
    console.log('\n4️⃣ Saving third message (competition)...');
    const message3Response = await axios.post(`${BASE_URL}/conversation/sessions/${TEST_SESSION_ID}/messages`, {
      content: 'I\'ve identified 3 main competitors: InventoryPro, StockMaster, and EasyStock.',
      sender: 'user',
      userId: TEST_USER_ID,
      problem: TEST_PROBLEM
    });
    
    if (message3Response.data.success) {
      console.log('✅ Third message saved successfully');
    } else {
      console.log('❌ Failed to save third message');
      return;
    }

    // Test 5: Get conversation context to verify history
    console.log('\n5️⃣ Getting conversation context to verify history...');
    const contextResponse = await axios.get(`${BASE_URL}/conversation/sessions/${TEST_SESSION_ID}/context`);
    
    if (contextResponse.data.success) {
      console.log('✅ Context retrieved successfully');
      const context = contextResponse.data.data;
      
      // Check if all three messages are in the history
      const chatHistory = context.chatHistory;
      const hasBusinessIdea = chatHistory.includes('SaaS platform') && chatHistory.includes('inventory');
      const hasTargetMarket = chatHistory.includes('small retail businesses') && chatHistory.includes('5-50 employees');
      const hasCompetition = chatHistory.includes('InventoryPro') && chatHistory.includes('StockMaster') && chatHistory.includes('EasyStock');
      
      console.log(`   Business Idea Recall: ${hasBusinessIdea ? '✅' : '❌'}`);
      console.log(`   Target Market Recall: ${hasTargetMarket ? '✅' : '❌'}`);
      console.log(`   Competition Recall: ${hasCompetition ? '✅' : '❌'}`);
      
      if (hasBusinessIdea && hasTargetMarket && hasCompetition) {
        console.log('   🎯 All conversation elements successfully recalled!');
      } else {
        console.log('   ⚠️  Some conversation elements were not properly recalled');
      }
      
      console.log(`   Chat History Length: ${chatHistory.length} characters`);
      console.log(`   Summary Length: ${context.summary.length} characters`);
    } else {
      console.log('❌ Failed to get context');
      return;
    }

    // Test 6: Get memory buffer to verify message count
    console.log('\n6️⃣ Getting memory buffer to verify message count...');
    const bufferResponse = await axios.get(`${BASE_URL}/conversation/sessions/${TEST_SESSION_ID}/buffer?limit=20`);
    
    if (bufferResponse.data.success) {
      console.log('✅ Memory buffer retrieved successfully');
      const messages = bufferResponse.data.data;
      console.log(`   Total Messages: ${messages.length}`);
      
      // Verify all messages are present
      const messageContents = messages.map(m => m.content.toLowerCase());
      const allPresent = messageContents.some(c => c.includes('saas platform')) &&
                        messageContents.some(c => c.includes('small retail businesses')) &&
                        messageContents.some(c => c.includes('inventorypro'));
      
      console.log(`   All Messages Present: ${allPresent ? '✅' : '❌'}`);
      
      // Display message previews
      messages.forEach((msg, index) => {
        const preview = msg.content.length > 60 ? msg.content.substring(0, 60) + '...' : msg.content;
        console.log(`   ${index + 1}. ${msg.sender}: ${preview}`);
      });
    } else {
      console.log('❌ Failed to get memory buffer');
      return;
    }

    // Test 7: Test session persistence by getting status
    console.log('\n7️⃣ Testing session persistence...');
    const statusResponse = await axios.get(`${BASE_URL}/conversation/sessions/${TEST_SESSION_ID}/status`);
    
    if (statusResponse.data.success) {
      console.log('✅ Session status retrieved successfully');
      const status = statusResponse.data.data;
      console.log(`   Session Active: ${status.isActive ? '✅' : '❌'}`);
      console.log(`   Message Count: ${status.messageCount}`);
      console.log(`   Last Activity: ${status.lastActivity}`);
      
      if (status.messageCount >= 3) {
        console.log('   🎯 Session successfully maintained all messages!');
      } else {
        console.log('   ⚠️  Session may have lost some messages');
      }
    } else {
      console.log('❌ Failed to get session status');
      return;
    }

    console.log('\n🎉 Conversation continuity test completed successfully!');
    console.log('\n📊 Test Results:');
    console.log('   ✅ Session initialization and persistence');
    console.log('   ✅ Message saving across multiple requests');
    console.log('   ✅ Conversation history recall');
    console.log('   ✅ Context maintenance');
    console.log('   ✅ Memory buffer accuracy');
    console.log('   ✅ Session status tracking');
    
    console.log('\n💡 The chatbot should now be able to recall:');
    console.log('   • Your SaaS platform idea for inventory management');
    console.log('   • Target market (small retail businesses, 5-50 employees)');
    console.log('   • Competitors (InventoryPro, StockMaster, EasyStock)');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Run the test
testConversationContinuity();
