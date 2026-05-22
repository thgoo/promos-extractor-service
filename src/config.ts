import 'dotenv/config';

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string): string | undefined {
  return process.env[key];
}

export const config = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: parseInt(getEnv('PORT', '3001'), 10),

  LLM_PROVIDER: getEnv('LLM_PROVIDER', 'openai'),

  ABACUS_API_KEY: getOptionalEnv('ABACUS_API_KEY'),
  ABACUS_MODEL: getEnv('ABACUS_MODEL', 'claude-3-7-sonnet-20250219'),
  ABACUS_TIMEOUT_MS: parseInt(getEnv('ABACUS_TIMEOUT_MS', '30000'), 10),

  OPENAI_API_KEY: getOptionalEnv('OPENAI_API_KEY'),
  OPENAI_MODEL: getEnv('OPENAI_MODEL', 'gpt-4.1-nano'),
  OPENAI_TIMEOUT_MS: parseInt(getEnv('OPENAI_TIMEOUT_MS', '30000'), 10),
};
