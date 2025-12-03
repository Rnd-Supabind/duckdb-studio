const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const withAuthHeaders = (headers: HeadersInit = {}): HeadersInit => {
    if (typeof window === 'undefined') return headers;
    const token = localStorage.getItem('auth_token');
    if (!token) return headers;
    return {
        ...headers,
        Authorization: `Bearer ${token}`,
    };
};

interface QueryRequest {
    query: string;
    extensions?: string[];
}

interface QueryResponse {
    columns: string[];
    rows: any[][];
    execution_time_ms: number;
    rows_affected: number;
}

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    storage_used_bytes: number;
    storage_limit_gb: number;
}

export const apiClient = {
    // Execute query on backend
    async signup(data: any) {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Signup failed');
        }
        return response.json();
    },

    async login(data: { username: string; password: string }) {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }
        return response.json();
    },

    async getCurrentUser(token?: string): Promise<UserProfile> {
        const headers = token ? { Authorization: `Bearer ${token}` } : withAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers,
        });
        if (!response.ok) {
            throw new Error('Failed to load current user profile');
        }
        return response.json();
    },

    async updateCurrentUser(email: string): Promise<UserProfile> {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...withAuthHeaders(),
            },
            body: JSON.stringify({ email }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to update profile');
        }
        return response.json();
    },

    async changePassword(current_password: string, new_password: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/users/me/password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...withAuthHeaders(),
            },
            body: JSON.stringify({ current_password, new_password }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to update password');
        }
    },

    async executeQuery(params: { query: string }): Promise<QueryResponse> {
        const response = await fetch(`${API_BASE_URL}/execute/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...withAuthHeaders(),
            },
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Query execution failed');
        }

        return response.json();
    },

    // Get available extensions
    async getExtensions(): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/execute/extensions`, {
            headers: withAuthHeaders(),
        });
        return response.json();
    },

    // Get available templates
    async getTemplates(): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/workflows/templates`, {
            headers: withAuthHeaders(),
        });
        return response.json();
    },

    // Workflows
    async getWorkflows(): Promise<any[]> {
        const response = await fetch(`${API_BASE_URL}/workflows/`, {
            headers: withAuthHeaders(),
        });
        return response.json();
    },

    async createWorkflow(workflow: any): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/workflows/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...withAuthHeaders(),
            },
            body: JSON.stringify(workflow),
        });
        return response.json();
    },

    async deleteWorkflow(id: number): Promise<void> {
        await fetch(`${API_BASE_URL}/workflows/${id}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        });
    },

    async updateWorkflow(id: number, data: any): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/workflows/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...withAuthHeaders(),
            },
            body: JSON.stringify(data),
        });
        return response.json();
    },

    async runWorkflow(id: number): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/workflows/${id}/run`, {
            method: 'POST',
            headers: withAuthHeaders(),
        });
        return response.json();
    },

    async toggleWorkflowStatus(id: number, status: 'active' | 'paused'): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/workflows/${id}/status?status=${status}`, {
            method: 'PATCH',
            headers: withAuthHeaders(),
        });
        return response.json();
    },

    async getWorkflowExecutions(id: number): Promise<any[]> {
        const response = await fetch(`${API_BASE_URL}/workflows/${id}/executions`, {
            headers: withAuthHeaders(),
        });
        return response.json();
    },

    async getWorkflowExecutionSteps(workflowId: number, executionId: number): Promise<any[]> {
        const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/executions/${executionId}/steps`, {
            headers: withAuthHeaders(),
        });
        return response.json();
    },

    // Storage
    async getStorageConfig(): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/storage/config`, {
            headers: withAuthHeaders(),
        });
        if (response.status === 404) {
            return null;
        }
        return response.json();
    },

    async saveStorageConfig(config: any): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/storage/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...withAuthHeaders(),
            },
            body: JSON.stringify(config),
        });
        return response.json();
    },

    async testStorageConnection(): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/storage/test`, {
            method: 'POST',
            headers: withAuthHeaders(),
        });
        return response.json();
    },

    async listBuckets(): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/storage/buckets`, {
            headers: withAuthHeaders(),
        });
        return response.json();
    },

    async getFiles(folder?: string): Promise<any> {
        const url = folder
            ? `${API_BASE_URL}/storage/files?folder=${folder}`
            : `${API_BASE_URL}/storage/files`;
        const response = await fetch(url, {
            headers: withAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch files');
        }
        return response.json();
    },

    // Audit logs
    async getAuditLogs(): Promise<any[]> {
        const response = await fetch(`${API_BASE_URL}/audit/`, {
            headers: withAuthHeaders(),
        });
        return response.json();
    },

    // Integrations
    async getIntegrations(): Promise<any[]> {
        const response = await fetch(`${API_BASE_URL}/integrations/`, { headers: withAuthHeaders() });
        if (!response.ok) throw new Error('Failed to list integrations');
        return response.json();
    },

    async createIntegration(data: any): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/integrations/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...withAuthHeaders(),
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to create integration');
        }
        return response.json();
    },

    async updateIntegration(id: number, data: any): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/integrations/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...withAuthHeaders(),
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update integration');
        return response.json();
    },

    async deleteIntegration(id: number): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/integrations/${id}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete integration');
        return response.json();
    },

    async testIntegration(data: any): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/integrations/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...withAuthHeaders(),
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Integration test failed');
        }
        return response.json();
    },
};

export const api = {
    async get(endpoint: string) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: withAuthHeaders(),
        });
        if (!response.ok) throw new Error('API request failed');
        return response.json();
    },
    async post(endpoint: string, data: any) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...withAuthHeaders(),
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('API request failed');
        return response.json();
    },
    async put(endpoint: string, data: any) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...withAuthHeaders(),
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('API request failed');
        return response.json();
    },
    async delete(endpoint: string) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        });
        if (!response.ok) throw new Error('API request failed');
        return response.json();
    }
};
