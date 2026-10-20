const TOKEN_KEY = 'syncspace_auth_token';
const USER_KEY = 'syncspace_auth_user';

export const authService = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getAuthHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  },

  async register(data) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Registration failed');
    this.setSession(result.token, result.user);
    return result;
  },

  async login(data) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Login failed');
    this.setSession(result.token, result.user);
    return result;
  },

  async getMe() {
    const token = this.getToken();
    if (!token) return null;
    const res = await fetch('/api/auth/me', {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) {
      this.clearSession();
      return null;
    }
    const result = await res.json();
    return result.user;
  }
};
