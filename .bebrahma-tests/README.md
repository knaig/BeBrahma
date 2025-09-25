# BeBrahma AI-Driven Browser Testing & Founder Evaluation Harness

## Overview

This is a comprehensive AI-driven browser testing and founder evaluation system built using Playwright MCP and Augment Agents. It provides automated testing of BeBrahma's user flows with AI-powered evaluation and reporting.

## Features

- **Automated Browser Testing**: Uses Playwright MCP for browser automation
- **AI-Powered Evaluation**: Simulates founder personas and evaluates user experience
- **Comprehensive Reporting**: Generates detailed markdown reports with screenshots and analysis
- **Multiple Personas**: Tests different user types (indie-marketer, technical-tinkerer, nontechnical-solo)
- **Evidence Capture**: Screenshots, traces, and HAR files for debugging

## Quick Start

1. **Install dependencies**:
   ```bash
   npm run beb:install
   ```

2. **Verify setup**:
   ```bash
   npm run beb:verify
   ```

3. **Run single persona test**:
   ```bash
   npm run beb:run
   ```

4. **Run all personas**:
   ```bash
   npm run beb:run:all
   ```

5. **View traces** (if available):
   ```bash
   npm run beb:trace:view
   ```

## Project Structure

```
.bebrahma-tests/
├── augment-runner.mjs          # Main test runner
├── personas.yaml               # Test personas configuration
├── founder-evaluator.prompt    # AI evaluation prompt
├── executor.task.md            # Test execution plan
├── playwright.config.ts        # Playwright configuration
└── README.md                   # This file

scripts/
├── verify-setup.mjs            # Setup verification
├── scenario-generator.mjs      # Run all personas
└── compile-report.mjs          # Report compilation utilities

reports/                        # Generated test reports
├── index.md                    # Summary of all runs
└── <timestamp>/                # Individual test run results
    ├── FounderReport.md        # Detailed evaluation report
    ├── artifacts.json          # Test execution artifacts
    └── *.png                   # Screenshots

.cursor/
└── mcp.json                    # MCP server configuration

.env                            # Test configuration (credentials, URLs)
```

## Configuration

### Environment Variables (.env)

```bash
# BeBrahma Testing Configuration
BEBRAHMA_URL=http://localhost:3000
BEBRAHMA_TEST_EMAIL=test@example.com
BEBRAHMA_TEST_PASSWORD=testpassword123
```

### Personas (personas.yaml)

The system tests three different user personas:

1. **indie-marketer**: Focuses on quick problem validation and GTM brief generation
2. **technical-tinkerer**: Explores advanced options and exports
3. **nontechnical-solo**: Tests one-pass clarity with minimal configuration

## Test Execution Flow

1. **Setup**: Creates timestamped report directory
2. **Persona Loading**: Loads persona configuration and task
3. **Browser Automation**: 
   - Navigates to BeBrahma URL
   - Handles authentication
   - Creates new project
   - Progresses through workflow
   - Generates GTM prompts
   - Exports artifacts
4. **Evidence Capture**: Takes screenshots at each major step
5. **AI Evaluation**: Simulates founder evaluation with rubric scoring
6. **Report Generation**: Creates comprehensive markdown report

## Reports

Each test run generates:

- **FounderReport.md**: Detailed evaluation with scores, blockers, and recommendations
- **artifacts.json**: Complete execution log with timestamps and results
- **Screenshots**: Visual evidence of each step
- **Index Report**: Summary of all test runs

### Report Structure

- **Summary**: Overall assessment
- **Rubric Scores**: 7-point evaluation (1-5 scale)
- **Step-by-Step Notes**: Detailed execution log
- **Screenshots**: Visual evidence
- **Top 5 Blockers**: Critical issues to fix
- **Top 5 Quick Wins**: Easy improvements
- **Verdict**: ship | fix then ship | rethink

## Evaluation Rubric

1. **Onboarding clarity** (1-5)
2. **Problem capture quality** (1-5)
3. **Idea quality vs inputs** (1-5)
4. **Flow friction** (1-5)
5. **Copy clarity and guidance** (1-5)
6. **Artifacts produced** (1-5)
7. **Would I pay for this?** (1-5)

## Integration with Cursor

The system is designed to work seamlessly with Cursor's MCP integration:

- **MCP Configuration**: `.cursor/mcp.json` configures Playwright MCP server
- **AI Evaluation**: Uses Cursor's AI capabilities for founder evaluation
- **Report Viewing**: Reports are optimized for Cursor's markdown preview

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**:
   - Ensure `.env` file exists in project root
   - Check file permissions
   - Verify variable names match exactly

2. **Playwright Browsers Missing**:
   ```bash
   npm run beb:install
   ```

3. **MCP Connection Issues**:
   - Restart Cursor
   - Check `.cursor/mcp.json` configuration
   - Verify `@playwright/mcp` package is installed

4. **Test Failures**:
   - Check BeBrahma URL is accessible
   - Verify test credentials are correct
   - Review generated artifacts.json for detailed error logs

### Debug Mode

Run with headful mode to see browser actions:
```bash
HEADFUL=1 npm run beb:run
```

## Development

### Adding New Personas

1. Edit `.bebrahma-tests/personas.yaml`
2. Add new persona with `id`, `goal`, and `task`
3. Run tests to validate

### Modifying Test Flow

1. Edit `.bebrahma-tests/executor.task.md` for high-level changes
2. Modify `.bebrahma-tests/augment-runner.mjs` for implementation details
3. Update evaluation criteria in `.bebrahma-tests/founder-evaluator.prompt`

### Customizing Reports

1. Modify report generation in `augment-runner.mjs`
2. Use `scripts/compile-report.mjs` for additional report processing
3. Update `scripts/scenario-generator.mjs` for summary report changes

## Future Enhancements

- **Real MCP Integration**: Replace simulation with actual MCP calls
- **Real AI Evaluation**: Connect to actual LLM for evaluation
- **Performance Metrics**: Add timing and performance analysis
- **Visual Regression**: Compare screenshots across runs
- **CI/CD Integration**: Automated testing in deployment pipeline
- **Multi-Environment**: Support for staging, production testing

## Support

For issues or questions:
1. Check the generated reports for detailed error information
2. Review the verification script output
3. Examine artifacts.json for execution details
4. Test individual components using the verification script
