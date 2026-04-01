const API_BASE = '/api';

/**
 * Utility for making API calls to the backend.
 */
class ApiClient {
    constructor() {
        this.token = localStorage.getItem('sbt_admin_token');
        this.apiKey = 'sbt-admin-key-dev';
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('sbt_admin_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('sbt_admin_token');
    }

    isAuthenticated() {
        return !!this.token;
    }

    async _fetch(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        if (this.apiKey) {
            headers['x-api-key'] = this.apiKey;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Request failed with status ${response.status}`);
        }

        return data;
    }

    // ── Auth ──
    async login(username, password) {
        const data = await this._fetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        this.setToken(data.token);
        return data;
    }

    logout() {
        this.clearToken();
    }

    // ── Credentials (Public) ──
    async verifyCredential(tokenId) {
        return this._fetch(`/credentials/verify/${tokenId}`);
    }

    async getCredentialsByHolder(address) {
        return this._fetch(`/credentials/holder/${address}`);
    }

    // ── Credentials (Admin) ──
    async issueCredential(data) {
        return this._fetch('/credentials/issue', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async revokeCredential(tokenId) {
        return this._fetch(`/credentials/revoke/${tokenId}`, {
            method: 'POST',
        });
    }

    async reissueCredential(tokenId, data) {
        return this._fetch(`/credentials/reissue/${tokenId}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getAllCredentials(page = 1, limit = 20) {
        return this._fetch(`/credentials/all?page=${page}&limit=${limit}`);
    }
}

export const api = new ApiClient();
export default api;
