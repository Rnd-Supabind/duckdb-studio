import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface EditWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: any;
  onUpdate: () => void;
}

export function EditWorkflowDialog({
  open,
  onOpenChange,
  workflow,
  onUpdate,
}: EditWorkflowDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [executionType, setExecutionType] = useState<'scheduled' | 'once'>('scheduled');
  const [schedule, setSchedule] = useState('0 0 * * *');
  const [sourceType, setSourceType] = useState('none');
  const [sourceConfig, setSourceConfig] = useState('{}');
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<{ path: string, table_name: string, format: string }[]>([]);
  const [manualQuery, setManualQuery] = useState('');
  const [destType, setDestType] = useState('storage');
  const [destConfig, setDestConfig] = useState('{}');

  const [integrations, setIntegrations] = useState<any[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string>('');

  // Pre-fill form when workflow changes
  useEffect(() => {
    if (workflow && open) {
      setName(workflow.name || '');
      setDescription(workflow.description || '');
      setSchedule(workflow.schedule || '0 0 * * *');
      setExecutionType(workflow.schedule === '@once' ? 'once' : 'scheduled');
      setSourceType(workflow.source_type || 'none');
      setSourceConfig(workflow.source_config || '{}');
      setManualQuery(workflow.content || '');
      setDestType(workflow.destination_type || 'storage');
      setDestConfig(workflow.destination_config || '{}');

      // Parse file config if source type is file
      if (workflow.source_type === 'file' && workflow.source_config) {
        try {
          const config = JSON.parse(workflow.source_config);
          setSelectedFiles(config.files || []);
        } catch (e) {
          console.error('Failed to parse source config:', e);
        }
      }

      // Parse integration config
      if (workflow.source_type === 'integration' && workflow.source_config) {
        try {
          const config = JSON.parse(workflow.source_config);
          if (config.integration_id) {
            setSelectedIntegration(config.integration_id.toString());
          }
        } catch (e) {
          console.error('Failed to parse integration config:', e);
        }
      }

      // Fetch available files and integrations
      const token = localStorage.getItem('auth_token');

      apiClient.getIntegrations().then(setIntegrations).catch(console.error);

      fetch('/api/v1/storage/files?folder=uploads', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => setAvailableFiles(data.files || []))
        .catch(err => console.error('Error fetching files:', err));
    }
  }, [workflow, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalSourceConfig = sourceConfig;
    if (sourceType === 'file' && selectedFiles.length > 0) {
      finalSourceConfig = JSON.stringify({ files: selectedFiles });
    } else if (sourceType === 'integration' && selectedIntegration) {
      finalSourceConfig = JSON.stringify({ integration_id: parseInt(selectedIntegration) });
    }

    try {
      await apiClient.updateWorkflow(workflow.id, {
        name,
        description,
        schedule: executionType === 'once' ? '@once' : schedule,
        query: manualQuery,
        source_type: sourceType,
        source_config: finalSourceConfig,
        destination_type: destType,
        destination_config: destConfig,
      });

      toast.success('Workflow updated successfully');
      onUpdate();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update workflow');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Workflow</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="source">Source</TabsTrigger>
              <TabsTrigger value="transform">Transform</TabsTrigger>
              <TabsTrigger value="destination">Destination</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Execution Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={executionType === 'scheduled'}
                      onChange={() => setExecutionType('scheduled')}
                    />
                    <span>Scheduled</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={executionType === 'once'}
                      onChange={() => setExecutionType('once')}
                    />
                    <span>One-Time</span>
                  </label>
                </div>
              </div>
              {executionType === 'scheduled' && (
                <div className="space-y-2">
                  <Label htmlFor="schedule">Schedule (Cron)</Label>
                  <Input
                    id="schedule"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    className="font-mono"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="source" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Source Type</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="file">Files</option>
                  <option value="integration">Integration</option>
                  <option value="api">API</option>
                </select>
              </div>
              {sourceType === 'file' && (
                <div className="space-y-2">
                  <Label>Select Files</Label>
                  <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto">
                    {availableFiles.map((file, idx) => {
                      const isSelected = selectedFiles.some(f => f.path === file.path);
                      return (
                        <div key={idx} className="flex items-center gap-2 p-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFiles([...selectedFiles, {
                                  path: file.path,
                                  table_name: file.name.split('.')[0],
                                  format: file.name.split('.').pop() || 'csv'
                                }]);
                              } else {
                                setSelectedFiles(selectedFiles.filter(f => f.path !== file.path));
                              }
                            }}
                          />
                          <span>{file.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {sourceType === 'integration' && (
                <div className="space-y-2">
                  <Label>Select Integration</Label>
                  <select
                    className="w-full p-2 border rounded-md bg-background"
                    value={selectedIntegration}
                    onChange={(e) => setSelectedIntegration(e.target.value)}
                  >
                    <option value="">Select an integration...</option>
                    {integrations.map((i: any) => (
                      <option key={i.id} value={i.id}>{i.name} ({i.provider})</option>
                    ))}
                  </select>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transform" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>SQL Query</Label>
                <Textarea
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  className="font-mono h-[300px]"
                  placeholder="SELECT * FROM table_name"
                />
              </div>
            </TabsContent>

            <TabsContent value="destination" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Destination Type</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={destType}
                  onChange={(e) => setDestType(e.target.value)}
                >
                  <option value="storage">MinIO Storage</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Update Workflow</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
