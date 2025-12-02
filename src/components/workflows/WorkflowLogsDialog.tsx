import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { apiClient } from '@/lib/api';

interface ExecutionStep {
    id: number;
    step_number: number;
    step_name: string;
    status: 'success' | 'failed' | 'running';
    started_at: string;
    completed_at?: string;
    error_message?: string;
    output_data?: string;
}

interface LogEntry {
    id: number;
    status: 'success' | 'failed' | 'running';
    started_at: string;
    completed_at?: string;
    error_message?: string;
    rows_affected?: number;
    workflow_id: number;
}

interface WorkflowLogsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workflowName: string;
    logs: LogEntry[];
    loading: boolean;
}

export function WorkflowLogsDialog({
    open,
    onOpenChange,
    workflowName,
    logs,
    loading
}: WorkflowLogsDialogProps) {
    const [expandedExecution, setExpandedExecution] = useState<number | null>(null);
    const [executionSteps, setExecutionSteps] = useState<Record<number, ExecutionStep[]>>({});
    const [loadingSteps, setLoadingSteps] = useState<Record<number, boolean>>({});

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
            default: return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    const formatDuration = (start: string, end?: string) => {
        if (!end) return 'Running...';
        const duration = new Date(end).getTime() - new Date(start).getTime();
        return `${(duration / 1000).toFixed(2)}s`;
    };

    const getStepLabel = (stepName: string) => {
        const labels: Record<string, string> = {
            'fetch_source': '1. Fetch Source Data',
            'transform': '2. Transform Data',
            'save_destination': '3. Save to Destination'
        };
        return labels[stepName] || stepName;
    };

    const toggleExpand = async (log: LogEntry) => {
        if (expandedExecution === log.id) {
            setExpandedExecution(null);
        } else {
            setExpandedExecution(log.id);

            // Load steps if not already loaded
            if (!executionSteps[log.id]) {
                setLoadingSteps(prev => ({ ...prev, [log.id]: true }));
                try {
                    const steps = await apiClient.getWorkflowExecutionSteps(log.workflow_id, log.id);
                    setExecutionSteps(prev => ({ ...prev, [log.id]: steps }));
                } catch (err) {
                    console.error('Failed to load steps:', err);
                } finally {
                    setLoadingSteps(prev => ({ ...prev, [log.id]: false }));
                }
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Execution History: {workflowName}</DialogTitle>
                    <DialogDescription>
                        View the step-by-step execution logs for this workflow.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                            Loading logs...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            No execution history found.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {logs.map((log) => (
                                <div key={log.id} className="border rounded-lg bg-card">
                                    <div
                                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                                        onClick={() => toggleExpand(log)}
                                    >
                                        <div className="flex items-center space-x-3 flex-1">
                                            {expandedExecution === log.id ?
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" /> :
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            }
                                            {getStatusIcon(log.status)}
                                            <span className="font-medium text-sm">
                                                {new Date(log.started_at).toLocaleString()}
                                            </span>
                                            <Badge variant={log.status === 'success' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                                                {log.status}
                                            </Badge>
                                        </div>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            Duration: {formatDuration(log.started_at, log.completed_at)}
                                        </span>
                                    </div>

                                    {expandedExecution === log.id && (
                                        <div className="border-t p-3 bg-muted/30">
                                            {loadingSteps[log.id] ? (
                                                <div className="flex items-center justify-center py-4">
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    Loading steps...
                                                </div>
                                            ) : executionSteps[log.id]?.length > 0 ? (
                                                <div className="space-y-2">
                                                    <div className="text-xs font-semibold text-muted-foreground mb-2">Execution Steps:</div>
                                                    {executionSteps[log.id].map((step) => (
                                                        <div key={step.id} className="flex items-start space-x-2 p-2 rounded bg-background">
                                                            {getStatusIcon(step.status)}
                                                            <div className="flex-1">
                                                                <div className="text-sm font-medium">{getStepLabel(step.step_name)}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {formatDuration(step.started_at, step.completed_at)}
                                                                </div>
                                                                {step.error_message && (
                                                                    <div className="text-xs text-red-500 mt-1 font-mono bg-red-500/10 p-1 rounded">
                                                                        {step.error_message}
                                                                    </div>
                                                                )}
                                                                {step.output_data && (
                                                                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                                                                        {JSON.parse(step.output_data).row_count !== undefined &&
                                                                            `Rows: ${JSON.parse(step.output_data).row_count}`
                                                                        }
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-muted-foreground text-center py-4">
                                                    No step details available
                                                </div>
                                            )}

                                            {log.error_message && (
                                                <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded font-mono mt-2">
                                                    Error: {log.error_message}
                                                </div>
                                            )}

                                            {log.rows_affected !== null && (
                                                <div className="text-xs text-muted-foreground mt-2">
                                                    Total rows affected: {log.rows_affected}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
