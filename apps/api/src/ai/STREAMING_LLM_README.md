# Enhanced Streaming LLM Service with KV Cache Management

This service implements the **StartRecentKVCache** strategy from MIT-Han-Lab's StreamingLLM research, providing efficient memory management for long-context language models.

## 🚀 Key Features

- **Attention Sink Management**: Keeps critical tokens at the start for consistent attention
- **Smart Cache Eviction**: Automatically manages memory using start+recent strategy
- **Real-time Streaming**: Stream responses with live cache updates
- **Batch Processing**: Handle multiple inputs with optimized cache usage
- **Cache Optimization**: Automatic cache tuning based on utilization

## 🏗️ Architecture

### StartRecentKVCache Strategy

The cache maintains two token pools:
- **Start Tokens** (attention sinks): Always preserved for context stability
- **Recent Tokens**: Sliding window of most recent tokens

```
[Start Tokens] [Recent Tokens]
[SYSTEM_ANCHOR, CONTEXT_START, MEMORY_HOOK, CONTEXT_END] [token1, token2, ..., tokenN]
```

### Cache Management

- **Automatic Eviction**: Removes oldest recent tokens when space is needed
- **Space Pre-allocation**: Checks available space before processing
- **Range Eviction**: Selective removal of specific token ranges
- **Utilization Monitoring**: Real-time cache performance metrics

## 📖 Usage Examples

### Basic Setup

```typescript
import { createStreamingLLMService } from './streaming-llm-core';

const service = createStreamingLLMService(process.env.OPENAI_API_KEY, {
  modelType: 'gpt-3.5-turbo',
  startSize: 4,        // Keep 4 attention sink tokens
  recentSize: 100,     // Keep 100 recent tokens
  temperature: 0.1
});
```

### Simple Processing

```typescript
const result = await service.processWithStreamingLLM(
  'Explain quantum computing',
  'Focus on practical applications'
);

console.log('Response:', result.response);
console.log('Cache Stats:', result.cacheStats);
```

### Real-time Streaming

```typescript
for await (const chunk of service.streamWithCacheManagement(input, context)) {
  if (chunk.chunk) {
    process.stdout.write(chunk.chunk); // Real-time output
  }
  
  if (chunk.isComplete) {
    console.log('\nCache Stats:', chunk.cacheStats);
    break;
  }
}
```

### Batch Processing

```typescript
const inputs = [
  'What is machine learning?',
  'How does deep learning work?',
  'Explain neural networks'
];

const batchResult = await service.batchProcess(inputs, 'Keep explanations concise');
console.log('Processed:', batchResult.responses.length, 'inputs');
```

## 🔧 Configuration Options

### StartRecentKVCacheConfig

```typescript
interface StartRecentKVCacheConfig {
  startSize: number;      // Number of attention sink tokens to preserve
  recentSize: number;     // Number of recent tokens to keep
  kSeqDim: number;        // Key sequence dimension for attention
  vSeqDim: number;        // Value sequence dimension for attention
  maxCacheSize: number;   // Maximum total cache size
}
```

### Model-Specific Dimensions

The service automatically configures dimensions based on model type:

- **LLaMA**: `kSeqDim: 2, vSeqDim: 2`
- **MPT**: `kSeqDim: 3, vSeqDim: 2`
- **GPT-NeoX**: `kSeqDim: 2, vSeqDim: 2`
- **Falcon**: `kSeqDim: 1, vSeqDim: 1`

## 📊 Cache Monitoring

### Get Cache Statistics

```typescript
const stats = service.getCacheStats();
console.log('Cache utilization:', stats.utilizationPercentage + '%');
console.log('Start tokens:', stats.startTokenCount);
console.log('Recent tokens:', stats.recentTokenCount);
```

### Monitor Cache Health

```typescript
// Check available space
const availableSpace = service.getAvailableCacheSpace();

// Check if cache is at capacity
const isAtCapacity = service.isCacheAtCapacity();

// Optimize cache if needed
if (isAtCapacity) {
  service.optimizeCacheForModel();
}
```

## 🧪 Testing

Run the test suite to verify functionality:

```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-key-here"

# Run tests
npx ts-node src/ai/streaming-llm-test.ts
```

## 🔄 Cache Lifecycle

1. **Initialization**: Creates attention sink tokens
2. **Token Addition**: Adds new tokens to recent pool
3. **Space Management**: Automatically evicts when needed
4. **Optimization**: Tunes cache based on utilization
5. **Cleanup**: Clears cache on session reset

## 🎯 Best Practices

### Cache Sizing
- **Start Size**: 4-8 tokens for attention sinks
- **Recent Size**: 100-1000 tokens based on context needs
- **Monitor**: Watch utilization to optimize sizes

### Memory Management
- **Pre-allocate**: Check space before processing large inputs
- **Batch Wisely**: Group related requests for efficiency
- **Clean Up**: Clear cache between sessions

### Performance Tuning
- **Model Matching**: Use appropriate dimensions for your model
- **Streaming**: Use streaming for long responses
- **Monitoring**: Track cache hit rates and eviction patterns

## 🔗 Integration Points

### With CrewAI
```typescript
// Use in crew orchestration
const streamingService = createStreamingLLMService(apiKey);
const crewResult = await crewOrchestrator.processWithStreaming(streamingService);
```

### With Chat Interface
```typescript
// Real-time chat with cache management
const chatStream = service.streamWithCacheManagement(userInput, chatHistory);
```

### With Decision Tracking
```typescript
// Track decisions with context preservation
const decision = await service.processWithStreamingLLM(
  decisionPrompt,
  previousDecisions
);
```

## 🚨 Error Handling

The service includes comprehensive error handling:

- **Processing Conflicts**: Prevents concurrent processing
- **Cache Overflow**: Automatic eviction and optimization
- **Memory Limits**: Graceful degradation when limits exceeded
- **Model Compatibility**: Validation of model-specific configurations

## 📈 Performance Benefits

- **Reduced Memory**: Efficient token management
- **Faster Processing**: Optimized attention computation
- **Better Context**: Preserved important tokens
- **Scalable**: Handles long conversations efficiently

## 🔮 Future Enhancements

- **Dynamic Sizing**: Adaptive cache sizes based on usage patterns
- **Multi-Model**: Support for multiple concurrent models
- **Persistent Storage**: Cache persistence across sessions
- **Advanced Eviction**: ML-based eviction strategies
