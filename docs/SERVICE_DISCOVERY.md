# Service Discovery Architecture

This document describes the service discovery architecture and environment configuration for the BeBrahma platform, including how service URLs are configured for different deployment environments.

## Overview

The BeBrahma platform consists of multiple microservices that communicate with each other:

- **API Service** (`apps/api`) - Main API gateway and orchestration service
- **Crew Service** (`apps/crew-service`) - AI agent orchestration and management
- **Workflow Service** (`apps/workflow-service`) - LangGraph workflow execution

## Service URL Configuration

### Environment-Aware Configuration

Service URLs are configured environment-aware through the centralized configuration in `bebrahma/env.config.js`. The system automatically detects the deployment environment and uses appropriate service URLs.

#### Local Development
```javascript
CREW_SERVICE_URL: 'http://localhost:5055'
WORKFLOW_SERVICE_URL: 'http://localhost:5056'
```

#### Staging Environment
```javascript
CREW_SERVICE_URL: 'http://crew.staging.bebrahma.local:5055'
WORKFLOW_SERVICE_URL: 'http://workflow.staging.bebrahma.local:5056'
```

#### Production Environment
```javascript
CREW_SERVICE_URL: 'http://crew.production.bebrahma.local:5055'
WORKFLOW_SERVICE_URL: 'http://workflow.production.bebrahma.local:5056'
```

### Service Discovery Namespace Pattern

The service discovery namespace follows the pattern:
```
http://{service-name}.{environment}.{project-name}.local:{port}
```

Where:
- `{service-name}`: The name of the service (crew, workflow)
- `{environment}`: The deployment environment (staging, production)
- `{project-name}`: The project name (bebrahma)
- `{port}`: The service port (5055 for crew, 5056 for workflow)

## Environment Detection

The system detects the deployment environment using the following priority order:

1. `DEPLOYMENT_ENV` environment variable
2. `NODE_ENV` environment variable
3. Default to `local`

### Environment Variables

| Variable | Description | Example Values |
|----------|-------------|----------------|
| `DEPLOYMENT_ENV` | Primary deployment environment indicator | `local`, `staging`, `production` |
| `NODE_ENV` | Node.js environment (fallback) | `development`, `staging`, `production` |
| `CREW_SERVICE_URL` | Override crew service URL | `http://custom-crew.example.com:5055` |
| `WORKFLOW_SERVICE_URL` | Override workflow service URL | `http://custom-workflow.example.com:5056` |

## Terraform Configuration

The Terraform configuration in `bebrahma/infrastructure/terraform/environments/staging/` sets environment variables for ECS service discovery:

```hcl
environment_variables = {
  CREW_SERVICE_URL = "http://crew.staging.bebrahma.local:5055"
  WORKFLOW_SERVICE_URL = "http://workflow.staging.bebrahma.local:5056"
  DEPLOYMENT_ENV = "staging"
}
```

These environment variables override the default configuration in `env.config.js`.

## Service Connectivity

### Health Check Endpoints

Each service exposes a health check endpoint:

- **API Service**: `GET /health`
- **Crew Service**: `GET /health`
- **Workflow Service**: `GET /health`

### Service Availability Checks

The API service includes built-in service availability checks:

```typescript
// Check service availability before making calls
const isCrewAvailable = await checkServiceAvailability(apiConfig.CREW_SERVICE_URL, 'Crew');
if (!isCrewAvailable) {
  return res.status(503).json({
    success: false,
    error: 'Crew service unavailable',
    retry: true
  });
}
```

### Timeout and Retry Configuration

Service calls include timeout and retry logic:

```typescript
const SERVICE_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
```

## Testing Service Connectivity

### Using the Test Script

A comprehensive test script is provided to validate service connectivity:

```bash
# Test local environment
./test-service-connectivity.sh

# Test staging environment
./test-service-connectivity.sh -e staging

# Test production environment
./test-service-connectivity.sh -e production

# Test with verbose output
./test-service-connectivity.sh -v

# Test with custom URLs
./test-service-connectivity.sh -c http://custom-crew:5055 -w http://custom-workflow:5056
```

### Test Coverage

The test script validates:

1. **API Service Health** - Main API service accessibility
2. **Crew Service Health** - Crew service connectivity
3. **Workflow Service Health** - Workflow service connectivity
4. **DNS Resolution** - Service discovery URL resolution
5. **API Integration** - External service configuration in API health check
6. **End-to-End Workflow** - Complete workflow execution test

## Troubleshooting

### Common Issues

#### Service Not Reachable
```
❌ Crew Service is not reachable (connection failed)
```

**Solutions:**
1. Check if the service is running
2. Verify network connectivity
3. Check firewall settings
4. Verify service URL configuration

#### DNS Resolution Failed
```
❌ Crew Service DNS resolution failed
```

**Solutions:**
1. Verify service discovery configuration
2. Check ECS service registration
3. Verify namespace configuration
4. Check DNS resolver settings

#### Invalid Service URL
```
❌ Invalid Crew Service URL: http://invalid-url
```

**Solutions:**
1. Check environment variable configuration
2. Verify URL format
3. Check Terraform environment variable settings

### Debugging Steps

1. **Check Environment Variables**
   ```bash
   echo $DEPLOYMENT_ENV
   echo $CREW_SERVICE_URL
   echo $WORKFLOW_SERVICE_URL
   ```

2. **Test Service URLs Manually**
   ```bash
   curl -v http://crew.staging.bebrahma.local:5055/health
   curl -v http://workflow.staging.bebrahma.local:5056/health
   ```

3. **Check API Health Endpoint**
   ```bash
   curl -v http://localhost:3001/health
   ```

4. **Review Service Logs**
   ```bash
   # Check API service logs
   docker logs bebrahma-api

   # Check crew service logs
   docker logs bebrahma-crew-service

   # Check workflow service logs
   docker logs bebrahma-workflow-service
   ```

### Environment-Specific Troubleshooting

#### Local Development
- Ensure all services are running locally
- Check port conflicts
- Verify Docker Compose configuration

#### Staging Environment
- Verify ECS service registration
- Check service discovery namespace
- Verify Terraform environment variables
- Check ECS task health

#### Production Environment
- Verify production service discovery
- Check load balancer configuration
- Verify security group settings
- Check monitoring and alerting

## Configuration Examples

### Local Development Setup

```bash
# .env.local
DEPLOYMENT_ENV=local
CREW_SERVICE_URL=http://localhost:5055
WORKFLOW_SERVICE_URL=http://localhost:5056
```

### Staging Environment Setup

```bash
# Set by Terraform
DEPLOYMENT_ENV=staging
CREW_SERVICE_URL=http://crew.staging.bebrahma.local:5055
WORKFLOW_SERVICE_URL=http://workflow.staging.bebrahma.local:5056
```

### Production Environment Setup

```bash
# Set by Terraform
DEPLOYMENT_ENV=production
CREW_SERVICE_URL=http://crew.production.bebrahma.local:5055
WORKFLOW_SERVICE_URL=http://workflow.production.bebrahma.local:5056
```

## Monitoring and Observability

### Health Check Monitoring

The API service health endpoint provides comprehensive service status:

```json
{
  "status": "healthy",
  "services": {
    "external": {
      "crew": {
        "url": "http://crew.staging.bebrahma.local:5055",
        "configured": true
      },
      "workflow": {
        "url": "http://workflow.staging.bebrahma.local:5056",
        "configured": true
      }
    }
  }
}
```

### Service Discovery Monitoring

Monitor service discovery health through:

1. **ECS Service Health** - Check ECS service status
2. **DNS Resolution** - Monitor DNS resolution success
3. **Service Response Times** - Track service response times
4. **Error Rates** - Monitor service error rates

## Best Practices

### Service Configuration
1. Always use environment-aware configuration
2. Provide fallback URLs for development
3. Validate service URLs during startup
4. Include service availability checks

### Error Handling
1. Implement timeout and retry logic
2. Provide informative error messages
3. Include retry indicators in responses
4. Log service connectivity issues

### Testing
1. Test service connectivity in all environments
2. Include end-to-end workflow tests
3. Validate DNS resolution for service discovery
4. Test error scenarios and fallback behavior

### Monitoring
1. Monitor service health endpoints
2. Track service response times
3. Alert on service connectivity failures
4. Monitor DNS resolution success rates

## Security Considerations

### Service Communication
1. Use HTTPS in production environments
2. Implement service authentication
3. Use network security groups
4. Monitor service communication

### Environment Isolation
1. Separate service discovery namespaces
2. Use environment-specific configurations
3. Implement proper access controls
4. Monitor cross-environment access

## Future Enhancements

### Planned Improvements
1. **Service Mesh Integration** - Implement Istio or similar
2. **Advanced Load Balancing** - Add intelligent load balancing
3. **Circuit Breaker Pattern** - Implement circuit breakers
4. **Service Registry** - Add service registry and discovery
5. **Health Check Aggregation** - Centralized health monitoring

### Configuration Management
1. **Dynamic Configuration** - Runtime configuration updates
2. **Configuration Validation** - Enhanced validation rules
3. **Configuration Templates** - Environment-specific templates
4. **Configuration Versioning** - Track configuration changes
