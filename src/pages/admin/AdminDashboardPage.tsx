import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Users, Workflow, Activity, HardDrive, TrendingUp, AlertCircle,
    CheckCircle, Clock, Database, Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SystemStats {
    total_users: number;
    total_workflows: number;
    total_executions: number;
    total_storage_mb: number;
    executions_last_24h: number;
    failed_executions_last_24h: number;
    active_users_last_week: number;
}

interface TopUser {
    id: number;
    username: string;
    email: string;
    workflow_count: number;
    execution_count: number;
    storage_mb: number;
}

interface RecentExecution {
    id: number;
    workflow_name: string;
    username: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    rows_affected: number | null;
}

export default function AdminDashboardPage() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [topUsers, setTopUsers] = useState<TopUser[]>([]);
    const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is admin
        if (!user || user.role !== 'ADMIN') {
            toast.error('Admin access required');
            navigate('/');
            return;
        }

        fetchAdminStats();
    }, [user, navigate, token]);

    const fetchAdminStats = async () => {
        if (!token) return;

        try {
            const response = await fetch('/api/v1/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data.stats);
                setTopUsers(data.top_users);
                setRecentExecutions(data.recent_executions);
            } else {
                toast.error('Failed to load admin stats');
            }
        } catch (err) {
            console.error('Failed to fetch admin stats:', err);
            toast.error('Failed to load admin stats');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Loading admin dashboard...</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto">
            <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        System-wide monitoring and user management
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="border-2 border-border p-6 bg-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                                <p className="text-3xl font-bold mt-2">{stats?.total_users || 0}</p>
                            </div>
                            <Users className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            {stats?.active_users_last_week || 0} active last week
                        </p>
                    </div>

                    <div className="border-2 border-border p-6 bg-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Workflows</p>
                                <p className="text-3xl font-bold mt-2">{stats?.total_workflows || 0}</p>
                            </div>
                            <Workflow className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            Across all users
                        </p>
                    </div>

                    <div className="border-2 border-border p-6 bg-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Executions</p>
                                <p className="text-3xl font-bold mt-2">{stats?.total_executions || 0}</p>
                            </div>
                            <Play className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            {stats?.executions_last_24h || 0} in last 24h
                        </p>
                    </div>

                    <div className="border-2 border-border p-6 bg-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Storage</p>
                                <p className="text-3xl font-bold mt-2">{stats?.total_storage_mb.toFixed(1) || '0'}</p>
                            </div>
                            <HardDrive className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            MB used system-wide
                        </p>
                    </div>
                </div>

                {/* Error Alert */}
                {stats && stats.failed_executions_last_24h > 0 && (
                    <div className="mb-6 border-2 border-destructive bg-destructive/10 p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <div>
                            <p className="font-bold text-sm">System Issues Detected</p>
                            <p className="text-xs text-muted-foreground">
                                {stats.failed_executions_last_24h} workflow executions failed in the last 24 hours
                            </p>
                        </div>
                    </div>
                )}

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Users */}
                    <div className="border-2 border-border bg-card">
                        <div className="border-b-2 border-border p-4 bg-secondary">
                            <h3 className="font-bold flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Top Users by Activity
                            </h3>
                        </div>
                        <div className="p-4">
                            {topUsers.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No users yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {topUsers.map((user) => (
                                        <div key={user.id} className="border-2 border-border p-3 hover:bg-accent transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <p className="font-medium text-sm">{user.username}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                                <Users className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div>
                                                    <p className="text-muted-foreground">Workflows</p>
                                                    <p className="font-bold">{user.workflow_count}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Executions</p>
                                                    <p className="font-bold">{user.execution_count}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Storage</p>
                                                    <p className="font-bold">{user.storage_mb.toFixed(1)} MB</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Executions */}
                    <div className="border-2 border-border bg-card">
                        <div className="border-b-2 border-border p-4 bg-secondary">
                            <h3 className="font-bold flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Recent Workflow Executions
                            </h3>
                        </div>
                        <div className="p-4 max-h-[500px] overflow-y-auto">
                            {recentExecutions.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No executions yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {recentExecutions.map((exec) => (
                                        <div key={exec.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                                            <div className="mt-0.5">
                                                {exec.status === 'success' ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : exec.status === 'failed' ? (
                                                    <AlertCircle className="w-4 h-4 text-destructive" />
                                                ) : (
                                                    <Clock className="w-4 h-4 text-yellow-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{exec.workflow_name}</p>
                                                <p className="text-xs text-muted-foreground">by {exec.username}</p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                    <span className={cn(
                                                        "px-2 py-0.5 border",
                                                        exec.status === 'success' ? "bg-green-500/10 text-green-500 border-green-500" :
                                                            exec.status === 'failed' ? "bg-red-500/10 text-red-500 border-red-500" :
                                                                "bg-yellow-500/10 text-yellow-500 border-yellow-500"
                                                    )}>
                                                        {exec.status}
                                                    </span>
                                                    {exec.rows_affected !== null && (
                                                        <span>{exec.rows_affected} rows</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatDate(exec.started_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* User Management Link */}
                <div className="mt-6 border-2 border-border p-4 bg-card">
                    <h3 className="font-bold mb-2">Quick Actions</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate('/admin/users')}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        >
                            Manage Users
                        </button>
                        <button
                            onClick={() => navigate('/admin/activity')}
                            className="px-4 py-2 border-2 border-border rounded hover:bg-accent"
                        >
                            View All Activity
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
