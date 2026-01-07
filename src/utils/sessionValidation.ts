export const isValidSessionId = (sessionId: string | undefined): sessionId is string => {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }

  if (sessionId.length < 3 || sessionId.length > 64) {
    return false;
  }

  const validFormat = /^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  if (!validFormat.test(sessionId)) {
    return false;
  }

  return true;
};

export const validateSessionId = (sessionId: string | undefined): string => {
  if (!isValidSessionId(sessionId)) {
    throw new Error('Invalid session identifier. Session IDs must be 3-64 characters long and contain only letters, numbers, hyphens, and underscores.');
  }

  return sessionId;
};

export const getSessionValidationErrorMessage = (sessionId: string | undefined): string => {
  if (!sessionId) {
    return 'Session ID is required. Please provide a valid session identifier in the URL.';
  }

  if (sessionId.length < 3) {
    return 'Session ID is too short. It must be at least 3 characters long.';
  }

  if (sessionId.length > 64) {
    return 'Session ID is too long. It must be no more than 64 characters long.';
  }

  return 'Session ID contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed.';
};
