// Unified environment configuration for BeBrahma services
// This file loads from root .env and .env.local files

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from root .env files
// Go up from apps/api/src/config to project root
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../.env.local') });

/**
 * API Service Configuration
 */
const apiConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.API_PORT || process.env.PORT || '4000', 10),
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001',
    API_URL: process.env.API_URL || 'http://localhost:3000',

    // AI Provider API Keys
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

    // CORS Configuration
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3001', 'http://localhost:3000'],

    // Microservices URLs
    CREW_SERVICE_URL: process.env.CREW_SERVICE_URL || 'http://localhost:5055',
    WORKFLOW_SERVICE_URL: process.env.WORKFLOW_SERVICE_URL || 'http://localhost:5056',
};

/**
 * Crew Service Configuration
 */
const crewConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.CREW_SERVICE_PORT || '3002', 10),
    API_URL: process.env.API_URL || 'http://localhost:3000',

    // AI Provider API Keys
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
};

/**
 * Workflow Service Configuration
 */
const workflowConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.WORKFLOW_SERVICE_PORT || '3003', 10),
    API_URL: process.env.API_URL || 'http://localhost:3000',

    // AI Provider API Keys
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
};

// Log configuration on load (only in development)
if (apiConfig.NODE_ENV === 'development') {
    console.log('📋 Environment Configuration Loaded:');
    console.log('  - NODE_ENV:', apiConfig.NODE_ENV);
    console.log('  - API Port:', apiConfig.PORT);
    console.log('  - Frontend URL:', apiConfig.FRONTEND_URL);
    console.log('  - Crew Service:', crewConfig.PORT);
    console.log('  - Workflow Service:', workflowConfig.PORT);
    console.log('  - OpenAI API Key:', apiConfig.OPENAI_API_KEY ? '✓ Set' : '✗ Not set');
    console.log('  - Anthropic API Key:', apiConfig.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Not set');
}

module.exports = {
    apiConfig,
    crewConfig,
    workflowConfig
};
