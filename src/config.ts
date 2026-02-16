// API Configuration
const getApiUrl = (): string => {
  // Check if we're on Stackblitz
  if (
    typeof window !== 'undefined' &&
    window.location.hostname.includes('stackblitz')
  ) {
    // DIN RAILWAY URL HER (uden /health i slutningen!)
    return 'https://trbotbackend-production.up.railway.app';
  }

  // Local development fallback
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    return 'http://localhost:3001';
  }

  // Default - ERSTAT OGSÅ DENNE MED DIN RAILWAY URL
  return 'https://trbotbackend-production.up.railway.app';
};

export const config = {
  apiUrl: getApiUrl(),
};
