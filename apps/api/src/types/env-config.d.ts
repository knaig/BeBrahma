declare module '../config/env.config.js' {
  export interface EnvConfig {
    NODE_ENV: string;
    PORT: number;
    FRONTEND_URL: string;
    API_URL: string;
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    ALLOWED_ORIGINS: string[];
    CREW_SERVICE_URL?: string;
    WORKFLOW_SERVICE_URL?: string;
    // Add any other keys used by API
  }
  export const apiConfig: EnvConfig;
}
