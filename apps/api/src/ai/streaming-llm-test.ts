import { 
  createStreamingLLMService,
  exampleStreamingUsage 
} from './streaming-llm-core';

/**
 * Test the enhanced StreamingLLM service with KV cache management
 */
async function testStreamingLLMService() {
  // You would get this from environment variables in production
  const apiKey = process.env['OPENAI_API_KEY'] || 'your-api-key-here';
  
  if (apiKey === 'your-api-key-here') {
    console.log('Please set OPENAI_API_KEY environment variable');
    return;
  }

  console.log('🚀 Testing Enhanced StreamingLLM Service...\n');

  // Create service with custom cache configuration
  const service = createStreamingLLMService(apiKey, {
    modelType: 'gpt-3.5-turbo',
    startSize: 4,        // Keep 4 attention sink tokens
    recentSize: 50       // Keep 50 recent tokens
  });

  try {
    // Test 1: Basic processing with cache management
    console.log('📝 Test 1: Basic Processing');
    const result1 = await service.processWithStreamingLLM(
      'Explain quantum computing in simple terms',
      'Focus on practical applications'
    );
    
    console.log('Response:', result1.response.substring(0, 100) + '...');
    console.log('Cache Stats:', result1.cacheStats);
    console.log('---\n');

    // Test 2: Streaming with real-time cache updates
    console.log('🌊 Test 2: Streaming Response');
    await exampleStreamingUsage(
      service,
      'What are the benefits of streaming LLMs?',
      'Consider both technical and user experience aspects'
    );

    // Test 3: Batch processing
    console.log('\n📦 Test 3: Batch Processing');
    const batchInputs = [
      'What is machine learning?',
      'How does deep learning work?',
      'Explain neural networks'
    ];
    
    const batchResult = await service.batchProcess(batchInputs, 'Keep explanations concise');
    console.log(`Processed ${batchResult.responses.length} inputs`);
    console.log('Total tokens processed:', batchResult.totalTokensProcessed);
    console.log('Final cache stats:', batchResult.cacheStats);

    // Test 4: Cache optimization
    console.log('\n⚡ Test 4: Cache Optimization');
    console.log('Available cache space:', service.getAvailableCacheSpace());
    console.log('Cache at capacity:', service.isCacheAtCapacity());
    
    if (service.isCacheAtCapacity()) {
      console.log('Optimizing cache...');
      service.optimizeCacheForModel();
      console.log('Cache optimized. New stats:', service.getCacheStats());
    }

    // Test 5: Cache state inspection
    console.log('\n🔍 Test 5: Cache State Inspection');
    const cacheState = service.getCacheState();
    console.log('Start tokens (attention sinks):', cacheState.startTokens.length);
    console.log('Recent tokens:', cacheState.recentTokens.length);
    console.log('Total tokens:', cacheState.totalTokens);
    console.log('Cache utilization:', (cacheState.cacheUtilization * 100).toFixed(2) + '%');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    // Clean up
    service.clearCache();
    console.log('\n🧹 Cache cleared');
  }
}

/**
 * Test specific cache eviction scenarios
 */
async function testCacheEviction() {
  console.log('\n🧪 Testing Cache Eviction Scenarios...\n');

  const apiKey = process.env['OPENAI_API_KEY'] || 'your-api-key-here';
  if (apiKey === 'your-api-key-here') {
    console.log('Please set OPENAI_API_KEY environment variable');
    return;
  }

  const service = createStreamingLLMService(apiKey, {
    startSize: 2,        // Small start size for testing
    recentSize: 10       // Small recent size for testing
  });

  try {
    // Fill cache with test data
    for (let i = 0; i < 15; i++) {
      service['kvCache'].addToken(`test_token_${i}`, i, 0.5);
    }

    console.log('Initial cache state:', service.getCacheStats());

    // Test eviction for space
    console.log('\nTesting eviction for space...');
    service['kvCache'].evictForSpace(5);
    console.log('After eviction for space:', service.getCacheStats());

    // Test range eviction
    console.log('\nTesting range eviction...');
    service['kvCache'].evictRange(2, 5);
    console.log('After range eviction:', service.getCacheStats());

  } catch (error) {
    console.error('Error during eviction testing:', error);
  } finally {
    service.clearCache();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testStreamingLLMService()
    .then(() => testCacheEviction())
    .then(() => console.log('\n✅ All tests completed!'))
    .catch(console.error);
}

export { testStreamingLLMService, testCacheEviction };
