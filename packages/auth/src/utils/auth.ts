export function getSessionToken(): string | null {
  return localStorage.getItem('sessionToken');
}

export function getAuthHeaders(): Record<string, string> {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getWebSocketUrl(baseUrl: string): string {
  const token = getSessionToken();
  const url = new URL(baseUrl.replace('http://', 'ws://').replace('https://', 'wss://'));
  
  if (token) {
    url.searchParams.set('session_token', token);
  }
  
  return url.toString();
}