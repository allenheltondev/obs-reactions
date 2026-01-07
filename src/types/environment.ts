export interface EnvironmentConfig {
  VITE_MOMENTO_API_KEY: string;
  VITE_MOMENTO_TOPICS_URL: string;
  VITE_MOMENTO_CACHE_NAME: string;
  VITE_EVENT_NAME: string;
  VITE_PRIMARY_COLOR: string;
  VITE_SECONDARY_COLOR: string;
  VITE_TERTIARY_COLOR: string;
  VITE_BASE_URL?: string;
}

export const getEnvironmentConfig = (): EnvironmentConfig => {
  const config = {
    VITE_MOMENTO_API_KEY: import.meta.env.VITE_MOMENTO_API_KEY,
    VITE_MOMENTO_TOPICS_URL: import.meta.env.VITE_MOMENTO_TOPICS_URL,
    VITE_MOMENTO_CACHE_NAME: import.meta.env.VITE_MOMENTO_CACHE_NAME,
    VITE_EVENT_NAME: import.meta.env.VITE_EVENT_NAME || 'Live Event',
    VITE_PRIMARY_COLOR: import.meta.env.VITE_PRIMARY_COLOR || '#15381F',
    VITE_SECONDARY_COLOR: import.meta.env.VITE_SECONDARY_COLOR || '#05C88C',
    VITE_TERTIARY_COLOR: import.meta.env.VITE_TERTIARY_COLOR || '#C4F135',
    VITE_BASE_URL: import.meta.env.VITE_BASE_URL,
  };

  // Validate that all required environment variables are present
  const requiredVars = ['VITE_MOMENTO_API_KEY', 'VITE_MOMENTO_TOPICS_URL', 'VITE_MOMENTO_CACHE_NAME'];
  const missingVars = requiredVars
    .filter(key => !config[key as keyof EnvironmentConfig])
    .map(key => key);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return config;
};
