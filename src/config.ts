import 'dotenv/config';

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const config = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: parseInt(getEnv('PORT', '3001'), 10),

  LLM_PROVIDER: getEnv('LLM_PROVIDER', 'abacus'),
  ABACUS_API_KEY: getEnv('ABACUS_API_KEY'),
  ABACUS_MODEL: getEnv('ABACUS_MODEL', 'claude-3-7-sonnet-20250219'),
  ABACUS_BASE_URL: getEnv('ABACUS_BASE_URL', 'https://routellm.abacus.ai/v1/chat/completions'),
  ABACUS_TIMEOUT_MS: parseInt(getEnv('ABACUS_TIMEOUT_MS', '30000'), 10),
};
