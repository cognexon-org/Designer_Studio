const TOKEN_KEY = 'pt360_designer_token';
const API_KEY = 'pt360_api_base';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return (window.localStorage.getItem(API_KEY) || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  }
  return (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function setApiBase(value: string): void {
  window.localStorage.setItem(API_KEY, value.replace(/\/$/, ''));
}
