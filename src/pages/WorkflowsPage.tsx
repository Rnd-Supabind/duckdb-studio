import { useState } from 'react';
import { Play, Plus, Clock, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Workflow {
  id: string;
  name: string;
  description: string;
  schedule: string;
  status: 'active' | 'paused' | 'error';
  lastRun?: string;
  nextRun?: string;
}

const mockWorkflows: Workflow[] = [
  {
    id: '1',
    name: 'Daily Sales ETL',
    description: 'Ingest sales data from S3, transform, and export to reports bucket',
    schedule: '0 6 * * *',
    status: 'active',
    lastRun: '2024-01-15T06:00:00Z',
    nextRun: '2024-01-16T06:00:00Z',
  },
  {
    id: '2',
    name: 'Weekly Analytics',
    description: 'Aggregate weekly metrics and generate summary reports',
    schedule: '0 0 * * 1',
    status: 'paused',
    lastRun: '2024-01-08T00:00:00Z',
  },
];

export default function WorkflowsPage() {
  const [workflows] = useState<Workflow[]>(mockWorkflows);

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
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Workflow
          </Button>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        <div className="border-2 border-border bg-secondary/30 p-4 mb-6">
          <p className="text-sm">
            <strong>Note:</strong> Backend workflows require the DuckDB CLI engine running in Docker.
            Configure your Docker environment in Settings → Versioning.
          </p>
        </div>

        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="border-2 border-border p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(workflow.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{workflow.name}</h3>
                      {getStatusBadge(workflow.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {workflow.description}
                    </p>
                    <div className="flex gap-4 mt-3 text-xs text-muted-foreground font-mono">
                      <span>Schedule: {workflow.schedule}</span>
                      {workflow.lastRun && (
                        <span>Last: {new Date(workflow.lastRun).toLocaleDateString()}</span>
                      )}
                      {workflow.nextRun && (
                        <span>Next: {new Date(workflow.nextRun).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
