#!/bin/bash

echo "🧪 BeBrahma API Testing Script"
echo "================================"

# Get the latest task
TASK_ARN=$(aws ecs list-tasks --cluster bebrahma-staging-cluster --service-name bebrahma-staging-api --region us-east-1 --query 'taskArns[0]' --output text)

if [ "$TASK_ARN" = "None" ] || [ -z "$TASK_ARN" ]; then
    echo "❌ No running tasks found"
    exit 1
fi

echo "📋 Task ARN: $TASK_ARN"

# Get task status
STATUS=$(aws ecs describe-tasks --cluster bebrahma-staging-cluster --tasks $TASK_ARN --region us-east-1 --query 'tasks[0].lastStatus' --output text)
echo "📊 Task Status: $STATUS"

if [ "$STATUS" != "RUNNING" ]; then
    echo "❌ Task is not running yet"
    exit 1
fi

# Get network interface
ENI=$(aws ecs describe-tasks --cluster bebrahma-staging-cluster --tasks $TASK_ARN --region us-east-1 --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)

if [ -z "$ENI" ] || [ "$ENI" = "None" ]; then
    echo "❌ No network interface found"
    exit 1
fi

# Get private IP
PRIVATE_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI --region us-east-1 --query 'NetworkInterfaces[0].PrivateIpAddress' --output text)

echo "🌐 Private IP: $PRIVATE_IP"
echo "🔗 API URL: http://$PRIVATE_IP:4000"

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -f http://$PRIVATE_IP:4000/health && echo "✅ Health check passed" || echo "❌ Health check failed"

# Test API endpoint
echo "🔍 Testing API endpoint..."
curl -f http://$PRIVATE_IP:4000/api/health && echo "✅ API endpoint working" || echo "❌ API endpoint failed"

echo "🎉 Testing complete!"
