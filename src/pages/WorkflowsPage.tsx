import { useEffect, useState } from 'react';
import { Play, Plus, Clock, CheckCircle, AlertCircle, Settings, Trash2, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { WorkflowBuilderDialog } from '@/components/workflows/WorkflowBuilderDialog';
import { WorkflowLogsDialog } from '@/components/workflows/WorkflowLogsDialog';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Workflow {
  id: number;
  name: string;
  description: string;
  schedule: string;
  status: 'active' | 'paused' | 'error';
  lastRun?: string;
  nextRun?: string;
  type?: 'sql' | 'javascript';
  content?: string;
  // Extended fields for edit
  source_type?: string;
  source_config?: string;
  destination_type?: string;
  destination_config?: string;
  template_id?: number;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Logs
  const [logsOpen, setLogsOpen] = useState(false);
  const [selectedWorkflowLogs, setSelectedWorkflowLogs] = useState<any[]>([]);
  const [selectedWorkflowName, setSelectedWorkflowName] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);

  // Delete Confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getWorkflows();
      const mapped: Workflow[] = data.map((w: any) => ({
        id: w.id,
        name: w.name,
        description: w.description || '',
        schedule: w.schedule,
        status: (w.status || 'paused') as Workflow['status'],
        lastRun: w.last_run,
        nextRun: w.next_run,
        type: 'sql',
        content: w.query,
        source_type: w.source_type,
        source_config: w.source_config,
        destination_type: w.destination_type,
        destination_config: w.destination_config,
        template_id: w.template_id,
      }));
      setWorkflows(mapped);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const getStatusIcon = (status: Workflow['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-chart-2" />;
      case 'paused':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: Workflow['status']) => {
    const variants = {
      active: 'bg-chart-2/20 text-chart-2 border-chart-2',
      paused: 'bg-muted text-muted-foreground border-muted-foreground',
      error: 'bg-destructive/20 text-destructive border-destructive',
    };
    return (
      <Badge variant="outline" className={cn('font-mono text-xs', variants[status])}>
        {status}
      </Badge>
    );
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await apiClient.deleteWorkflow(deleteId);
      setWorkflows((prev) => prev.filter((w) => w.id !== deleteId));
      toast.success('Workflow deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete workflow');
    } finally {
      setDeleteId(null);
    }
  };

  const handleRun = async (id: number) => {
    try {
      await apiClient.runWorkflow(id);
      toast.success('Workflow run started');
      loadWorkflows();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to run workflow');
    }
  };

  const openEdit = (workflow: Workflow) => {
    setEditingId(workflow.id);
    setBuilderOpen(true);
  };

  const handleToggleStatus = async (workflow: Workflow) => {
    const newStatus = workflow.status === 'active' ? 'paused' : 'active';
    try {
      await apiClient.toggleWorkflowStatus(workflow.id, newStatus);
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, status: newStatus } : w));
      toast.success(`Workflow ${newStatus}`);
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  const loadLogs = async (id: number, name: string) => {
    setSelectedWorkflowName(name);
    setLogsOpen(true);
    setLogsLoading(true);
    try {
      const data = await apiClient.getWorkflowExecutions(id);
      setSelectedWorkflowLogs(data);
    } catch (err: any) {
      toast.error('Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="border-b-2 border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule and automate your ETL pipelines
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open('http://localhost:8088', '_blank')}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              Temporal Dashboard
            </Button>
            <Button className="gap-2" onClick={() => {
              setEditingId(null);
              setBuilderOpen(true);
            }}>
              <Plus className="w-4 h-4" />
              New Workflow
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        <div className="border-2 border-border bg-secondary/30 p-4 mb-6">
          <p className="text-sm">
            <strong>Note:</strong> Backend workflows require the DuckDB CLI engine running in Docker.
            Configure your Docker environment in Settings → Versioning.
          </p>
        </div>

        {loading ? (
          <div className="border-2 border-border p-8 text-center text-sm text-muted-foreground">
            Loading workflows...
          </div>
        ) : workflows.length === 0 ? (
          <div className="border-2 border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No workflows yet. Click "New Workflow" to create your first scheduled ETL.
          </div>
        ) : (
          <div className="grid gap-4">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="border-2 border-border p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-1 h-6 w-6"
                      onClick={() => handleToggleStatus(workflow)}
                      title={workflow.status === 'active' ? 'Pause workflow' : 'Activate workflow'}
                    >
                      {getStatusIcon(workflow.status)}
                    </Button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{workflow.name}</h3>
                        {getStatusBadge(workflow.status)}
                        <Badge variant="outline" className="font-mono text-xs">
                          {workflow.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {workflow.description}
                      </p>
                      <div className="flex gap-4 mt-3 text-xs text-muted-foreground font-mono">
                        <span>Schedule: {workflow.schedule}</span>
                        {workflow.lastRun && (
                          <span>Last: {new Date(workflow.lastRun).toLocaleString()}</span>
                        )}
                        {workflow.nextRun && (
                          <span>Next: {new Date(workflow.nextRun).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Run now"
                      onClick={() => handleRun(workflow.id)}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDeleteClick(workflow.id)}
                      title="Delete workflow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Edit workflow"
                      onClick={() => openEdit(workflow)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {/* Logs Section */}
                <div className="mt-4 pt-4 border-t border-border/50">
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-xs text-muted-foreground"
                    onClick={() => loadLogs(workflow.id, workflow.name)}
                  >
                    View Execution History
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <WorkflowBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        workflowId={editingId || undefined}
        onWorkflowCreated={loadWorkflows}
      />

      <WorkflowLogsDialog
        open={logsOpen}
        onOpenChange={setLogsOpen}
        workflowName={selectedWorkflowName}
        logs={selectedWorkflowLogs}
        loading={logsLoading}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the workflow and its execution history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
