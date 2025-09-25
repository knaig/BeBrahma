# 🧪 CrewAI Conversation Testing Framework

This framework automatically tests your CrewAI interface for conversation continuity, context retention, and response relevance.

## 🎯 What It Tests

### **1. 🧠 Context Retention**
- Does the AI remember previous conversation context?
- Can it build upon earlier responses?
- Does it maintain business context across turns?

### **2. 🎯 Response Relevance**
- Are responses directly relevant to user questions?
- Do they address the business domain appropriately?
- Are follow-up responses contextual?

### **3. 🔗 Conversation Continuity**
- Does the conversation flow naturally?
- Can the AI handle multi-turn discussions?
- Does it maintain session state properly?

### **4. 💡 Business Insight Quality**
- Are responses providing valuable business advice?
- Is the analysis depth appropriate?
- Are recommendations actionable?

### **5. 🔍 Response Coherence**
- Are responses logically structured?
- Is the information well-organized?
- Are explanations clear and understandable?

## 🚀 How to Use

### **1. Install Dependencies**
```bash
cd apps/api
npm install
```

### **2. Set Environment Variables**
```bash
# In your .env.local file
OPENAI_API_KEY=your_openai_api_key_here
API_ENDPOINT=http://localhost:3001  # Optional, defaults to localhost:3001
```

### **3. Run All Tests**
```bash
npm run test:conversation
```

### **4. Run Specific Test Suite**
```bash
npm run test:conversation -- --suite "Business Strategy"
npm run test:conversation -- --suite "Context Continuity"
```

## 📋 Available Test Suites

### **🏢 Business Strategy**
- SaaS company planning
- Mobile app market validation
- Strategic business considerations

### **🔬 Market Research**
- Geographic market analysis
- Market entry challenges
- Local market understanding

### **💰 Financial Analysis**
- Financial modeling
- Customer lifetime value
- Cash flow projections

### **🏆 Competitive Intelligence**
- Competitive analysis methodology
- Market gap identification
- Pricing strategy analysis

### **🔄 Context Continuity**
- Multi-turn business discussions
- Context maintenance
- Conversation flow

## 📊 Test Results

### **Metrics (1-10 Scale)**
- **Context Retention**: How well the AI remembers conversation history
- **Relevance**: How relevant responses are to user questions
- **Coherence**: How logically structured responses are
- **Business Insight**: Quality of business advice provided
- **Continuity**: How well conversation flow is maintained

### **Pass/Fail Criteria**
- **Pass Threshold**: 7.0/10 average score
- **Excellent**: 8.0+ average score
- **Good**: 7.0-7.9 average score
- **Needs Improvement**: Below 7.0

## 📄 Generated Reports

After running tests, detailed reports are saved to:
```
apps/api/test-results/conversation-evaluation-{timestamp}.json
```

### **Report Contents**
- Test suite results
- Individual test metrics
- Performance analysis
- Improvement recommendations
- Timestamp and summary statistics

## 🔧 Customization

### **Adding New Test Cases**
Edit `test-runner.ts` to add new test scenarios:

```typescript
private getCustomTests(): ConversationTest[] {
  return [
    {
      id: 'custom_1',
      initialPrompt: 'Your initial prompt here',
      followUpPrompts: [
        'Follow-up question 1',
        'Follow-up question 2'
      ],
      expectedContexts: [
        'Expected context 1',
        'Expected context 2'
      ],
      expectedRelevance: [
        'Expected focus 1',
        'Expected focus 2'
      ],
      businessDomain: 'Your Domain',
      complexity: 'medium' // 'simple', 'medium', or 'complex'
    }
  ];
}
```

### **Modifying Evaluation Criteria**
Edit `conversation-evaluator.ts` to adjust evaluation metrics:

```typescript
// Example: Add new evaluation criteria
private async evaluateCustomMetric(response: string): Promise<number> {
  // Your custom evaluation logic
  return score;
}
```

## 🐛 Troubleshooting

### **Common Issues**

1. **API Connection Failed**
   - Ensure your API server is running on port 3001
   - Check firewall and network settings

2. **OpenAI API Errors**
   - Verify your API key is valid
   - Check API usage limits and billing

3. **Test Failures**
   - Review the detailed error messages
   - Check API response format
   - Verify test case expectations

### **Debug Mode**
Add more verbose logging by modifying the test runner:

```typescript
// In conversation-evaluator.ts
console.log('🔍 Debug: Full API response:', data);
```

## 📈 Performance Optimization

### **Test Execution Time**
- **Simple tests**: ~30 seconds each
- **Medium tests**: ~1-2 minutes each  
- **Complex tests**: ~3-5 minutes each

### **Reducing Test Time**
- Use `--suite` to run specific test suites
- Focus on critical business scenarios
- Run tests during off-peak hours

## 🔮 Future Enhancements

### **Planned Features**
- **Real-time Monitoring**: Live conversation quality tracking
- **A/B Testing**: Compare different AI configurations
- **Performance Benchmarking**: Track improvements over time
- **Custom Metrics**: Add domain-specific evaluation criteria
- **Integration Testing**: Test with real user scenarios

### **Advanced Testing**
- **Stress Testing**: High-volume conversation testing
- **Edge Case Testing**: Unusual or complex scenarios
- **Multi-language Testing**: Test conversation quality in different languages
- **Accessibility Testing**: Ensure responses are accessible to all users

## 📚 Additional Resources

- [LangChain Evaluation Documentation](https://js.langchain.com/docs/guides/evaluation/)
- [AI Testing Best Practices](https://github.com/langchain-ai/langchainjs/tree/main/langchain/src/evaluation)
- [Conversation AI Testing Guide](https://www.truera.com/blog/evaluating-llm-conversations)

---

**Happy Testing! 🧪✨**
