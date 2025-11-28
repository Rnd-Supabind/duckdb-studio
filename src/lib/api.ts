const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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

export const apiClient = {
    // Execute query on backend
    async executeQuery(request: QueryRequest): Promise<QueryResponse> {
        const response = await fetch(`${API_BASE_URL}/execute/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Query execution failed');
        }

        return response.json();
    },

    // Get available extensions
    async getExtensions(): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/execute/extensions`);
        return response.json();
    },

    // Workflows
    async getWorkflows(): Promise<any[]> {
        const response = await fetch(`${API_BASE_URL}/workflows/`);
        return response.json();
    },

    async createWorkflow(workflow: any): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/workflows/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(workflow),
        });
        return response.json();
    },

    async deleteWorkflow(id: number): Promise<void> {
        await fetch(`${API_BASE_URL}/workflows/${id}`, {
            method: 'DELETE',
        });
    },

    // Storage
    async getStorageConfig(): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/storage/config`);
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
            },
            body: JSON.stringify(config),
        });
        return response.json();
    },

    async testStorageConnection(): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/storage/test`, {
            method: 'POST',
        });
        return response.json();
    },

    async listBuckets(): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/storage/buckets`);
        return response.json();
    },

    // Audit logs
    async getAuditLogs(): Promise<any[]> {
        const response = await fetch(`${API_BASE_URL}/audit/`);
        return response.json();
    },
};
