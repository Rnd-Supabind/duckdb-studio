import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useExecutionMode } from '@/contexts/ExecutionModeContext';
import {
    Database, FileText, Play, Activity, TrendingUp, Clock,
    AlertCircle, CheckCircle, HardDrive, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStats {
    total_files: number;
    total_workflows: number;
    total_query_executions: number;
    storage_used_mb: number;
    recent_queries: number;
    failed_queries: number;
}

interface RecentActivity {
    action: string;
    resource_type: string;
    timestamp: string;
    details?: any;
}

interface WorkflowSummary {
    id: number;
    name: string;
    last_executed: string | null;
    execution_count: number;
    status: string;
}

export default function DashboardPage() {
    const { user, token } = useAuth();
    const { mode, isServerMode } = useExecutionMode();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activity, setActivity] = useState<RecentActivity[]>([]);
    const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            if (!token) return;

            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/dashboard/stats`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    setStats(data.stats);
                    setActivity(data.recent_activity);
                    setWorkflows(data.workflows);
                }
            } catch (err) {
                console.error('Failed to fetch dashboard:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [token]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getActionLabel = (action: string) => {
        const labels: Record<string, string> = {
            'query_executed': 'Query Executed',
            'query_failed': 'Query Failed',
            'workflow_created': 'Workflow Created',
            'file_uploaded': 'File Uploaded',
            'storage_config_updated': 'Storage Updated',
        };
        return labels[action] || action;
    };

    return (
        <div className="h-full overflow-auto">
            <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Welcome back, {user?.username}! Here's your activity overview.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="border-2 border-border p-6 bg-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Files</p>
                                <p className="text-3xl font-bold mt-2">{stats?.total_files || 0}</p>
                            </div>
                            <FileText className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            Uploaded to MinIO
                        </p>
                    </div>

                    <div className="border-2 border-border p-6 bg-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Workflows</p>
                                <p className="text-3xl font-bold mt-2">{stats?.total_workflows || 0}</p>
                            </div>
                            <Play className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            Active workflows
                        </p>
                    </div>

                    <div className="border-2 border-border p-6 bg-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Queries</p>
                                <p className="text-3xl font-bold mt-2">{stats?.total_query_executions || 0}</p>
                            </div>
                            <Database className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            {stats?.recent_queries || 0} in last 24h
                        </p>
                    </div>

                    <div className="border-2 border-border p-6 bg-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Storage</p>
                                <p className="text-3xl font-bold mt-2">{stats?.storage_used_mb.toFixed(1) || '0'}</p>
                            </div>
                            <HardDrive className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            MB used
                        </p>
                    </div>
                </div>

                {/* Execution Mode Indicator */}
                <div className={cn(
                    "border-2 p-4 mb-6 flex items-center gap-3",
                    isServerMode ? "bg-green-500/10 border-green-500" : "bg-blue-500/10 border-blue-500"
                )}>
                    <Zap className={cn("w-5 h-5", isServerMode ? "text-green-500" : "text-blue-500")} />
                    <div>
                        <p className="font-bold text-sm">
                            {isServerMode ? 'Server Mode Active' : 'Client Mode Active'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {isServerMode
                                ? 'Queries run on backend DuckDB with MinIO access'
                                : 'Queries run in browser WASM DuckDB'}
                        </p>
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <div className="border-2 border-border bg-card">
                        <div className="border-b-2 border-border p-4 bg-secondary">
                            <h3 className="font-bold flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Recent Activity
                            </h3>
                        </div>
                        <div className="p-4">
                            {loading ? (
                                <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
                            ) : activity.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                            ) : (
                                <div className="space-y-3">
                                    {activity.map((item, index) => (
                                        <div key={index} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                                            <div className="mt-0.5">
                                                {item.action.includes('failed') ? (
                                                    <AlertCircle className="w-4 h-4 text-destructive" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium">{getActionLabel(item.action)}</p>
                                                <p className="text-xs text-muted-foreground truncate">{item.resource_type}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    <Clock className="w-3 h-3 inline mr-1" />
                                                    {formatDate(item.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Workflows */}
                    <div className="border-2 border-border bg-card">
                        <div className="border-b-2 border-border p-4 bg-secondary">
                            <h3 className="font-bold flex items-center gap-2">
                                <Play className="w-4 h-4" />
                                Workflows
                            </h3>
                        </div>
                        <div className="p-4">
                            {loading ? (
                                <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
                            ) : workflows.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No workflows created yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {workflows.map((wf) => (
                                        <div key={wf.id} className="border-2 border-border p-3 hover:bg-accent transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-medium text-sm">{wf.name}</p>
                                                <span className={cn(
                                                    "text-xs px-2 py-0.5 border",
                                                    wf.status === 'completed' ? "bg-green-500/10 text-green-500 border-green-500" :
                                                        wf.status === 'failed' ? "bg-red-500/10 text-red-500 border-red-500" :
                                                            "bg-gray-500/10 text-gray-500 border-gray-500"
                                                )}>
                                                    {wf.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span>{wf.execution_count} runs</span>
                                                {wf.last_executed && (
                                                    <span>Last: {new Date(wf.last_executed).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                {stats && stats.failed_queries > 0 && (
                    <div className="mt-6 border-2 border-destructive bg-destructive/10 p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <div>
                            <p className="font-bold text-sm">Attention Required</p>
                            <p className="text-xs text-muted-foreground">
                                {stats.failed_queries} queries failed. Check your query syntax or data sources.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
