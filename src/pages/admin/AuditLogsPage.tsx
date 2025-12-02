import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, Filter } from 'lucide-react';

interface AuditLog {
    id: number;
    user_id: number;
    action: string;
    resource_type: string;
    resource_id: string;
    details: any;
    ip_address: string;
    timestamp: string;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    const fetchAuditLogs = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/v1/audit/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8">Loading...</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Activity className="w-8 h-8" />
                    <h1 className="text-3xl font-bold">Audit Logs</h1>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                    <Filter className="w-4 h-4" />
                    Filter
                </button>
            </div>

            <div className="bg-card rounded-lg border">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted">
                            <tr>
                                <th className="px-4 py-3 text-left">Timestamp</th>
                                <th className="px-4 py-3 text-left">User ID</th>
                                <th className="px-4 py-3 text-left">Action</th>
                                <th className="px-4 py-3 text-left">Resource</th>
                                <th className="px-4 py-3 text-left">IP Address</th>
                                <th className="px-4 py-3 text-left">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                        No audit logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="border-t">
                                        <td className="px-4 py-3 text-sm">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">{log.user_id}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {log.resource_type} / {log.resource_id}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {log.ip_address || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                                            {JSON.stringify(log.details)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
