import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  RefreshCw,
  Code2,
  Database,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface WorkflowStepResult {
  step: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  data?: any;
}

interface WorkflowBuilderProps {
  workflowId?: number;
  onClose?: () => void;
}

export function WorkflowBuilder({ workflowId, onClose }: WorkflowBuilderProps) {
  const [activeStep, setActiveStep] = useState('general');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('0 * * * *'); // Hourly by default
  const [query, setQuery] = useState('');
  const [sourceType, setSourceType] = useState('none');
  const [sourceConfig, setSourceConfig] = useState('{}');
  const [destType, setDestType] = useState('storage');
  const [destConfig, setDestConfig] = useState('{}');
  const [templateId, setTemplateId] = useState<number | null>(null);
  
  // Test results
  const [testResults, setTestResults] = useState<WorkflowStepResult[]>([]);
  
  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Load workflow if editing
  useEffect(() => {
    if (workflowId) {
      loadWorkflow();
    }
    loadTemplates();
  }, [workflowId]);

  const loadWorkflow = async () => {
    try {
      const workflows = await apiClient.getWorkflows();
      const workflow = workflows.find((w: any) => w.id === workflowId);
      if (workflow) {
        setName(workflow.name);
        setDescription(workflow.description || '');
        setSchedule(workflow.schedule);
        setQuery(workflow.query);
        setSourceType(workflow.source_type || 'none');
        setSourceConfig(workflow.source_config || '{}');
        setDestType(workflow.destination_type || 'storage');
        setDestConfig(workflow.destination_config || '{}');
        setTemplateId(workflow.template_id || null);
      }
    } catch (err) {
      toast.error('Failed to load workflow');
    }
  };

  const loadTemplates = async () => {
    setTemplateLoading(true);
    try {
      const data = await apiClient.get('/workflows/templates');
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates', err);
    } finally {
      setTemplateLoading(false);
    }
  };

  const validateCron = (cron: string): boolean => {
    const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
    return cronRegex.test(cron);
  };

  const testQuery = async () => {
    if (!query.trim()) {
      toast.error('Query is required');
      return;
    }

    setTesting(true);
    setTestResults([
      { step: 'Validating query', status: 'running' },
      { step: 'Executing query', status: 'idle' },
      { step: 'Checking results', status: 'idle' }
    ]);

    try {
      // Test 1: Validate query
      setTestResults(prev => [
        { ...prev[0], status: 'success' },
        { ...prev[1], status: 'running' },
        prev[2]
      ]);

      // Test 2: Execute query
      const result = await apiClient.post('/execute/run', {
        query,
        extensions: []
      });

      setTestResults(prev => [
        prev[0],
        { ...prev[1], status: 'success', message: `Query executed in ${result.executionTime}ms`, data: result },
        { ...prev[2], status: 'running' }
      ]);

      // Test 3: Check results
      setTimeout(() => {
        setTestResults(prev => [
          prev[0],
          prev[1],
          { ...prev[2], status: 'success', message: `${result.rows.length} rows returned` }
        ]);
      }, 500);

      toast.success('Query test passed!');
    } catch (err: any) {
      const errorMsg = err?.message || 'Query test failed';
      const failedIdx = testResults.findIndex(r => r.status === 'running');
      
      setTestResults(prev => {
        const updated = [...prev];
        updated[failedIdx] = { ...updated[failedIdx], status: 'error', message: errorMsg };
        for (let i = failedIdx + 1; i < updated.length; i++) {
          updated[i].status = 'idle';
        }
        return updated;
      });

      toast.error(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  const saveWorkflow = async () => {
    // Validation
    if (!name.trim()) {
      toast.error('Workflow name is required');
      return;
    }
    if (!query.trim() && !templateId) {
      toast.error('Query or template is required');
      return;
    }
    if (!validateCron(schedule)) {
      toast.error('Invalid cron schedule. Example: "0 * * * *" for hourly');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        schedule,
        query: query.trim(),
        source_type: sourceType,
        source_config: sourceConfig,
        destination_type: destType,
        destination_config: destConfig,
        template_id: templateId,
        status: 'paused'
      };

      if (workflowId) {
        await apiClient.put(`/workflows/${workflowId}`, payload);
        toast.success('Workflow updated successfully');
      } else {
        await apiClient.post('/workflows', payload);
        toast.success('Workflow created successfully');
      }

      // Reset form
      if (!workflowId) {
        setName('');
        setDescription('');
        setSchedule('0 * * * *');
        setQuery('');
        setSourceType('none');
        setDestType('storage');
        setTemplateId(null);
      }

      onClose?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save workflow');
    } finally {
      setLoading(false);
    }
  };

  const presetCrons = {
    'Every 5 minutes': '*/5 * * * *',
    'Every 15 minutes': '*/15 * * * *',
    'Every hour': '0 * * * *',
    'Every 6 hours': '0 */6 * * *',
    'Daily at 9 AM': '0 9 * * *',
    'Weekly on Monday': '0 0 * * 1',
    'Monthly': '0 0 1 * *'
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-card rounded-lg border">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          {workflowId ? 'Edit Workflow' : 'Create Workflow'}
        </h1>
        <p className="text-muted-foreground">
          Build and test your workflow step by step
        </p>
      </div>

      <Tabs value={activeStep} onValueChange={setActiveStep} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="query" className="flex gap-2">
            <Code2 className="h-4 w-4" />
            <span className="hidden sm:inline">Query</span>
          </TabsTrigger>
          <TabsTrigger value="source" className="flex gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Source</span>
          </TabsTrigger>
          <TabsTrigger value="destination" className="flex gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Dest</span>
          </TabsTrigger>
        </TabsList>

        {/* GENERAL TAB */}
        <TabsContent value="general" className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Workflow Name *</label>
            <Input
              placeholder="e.g., Daily Data Sync"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              placeholder="Describe what this workflow does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Schedule (Cron) *</label>
            <div className="space-y-3">
              <Input
                placeholder="0 * * * *"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full font-mono"
              />
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(presetCrons).map(([label, cron]) => (
                  <Button
                    key={cron}
                    variant="outline"
                    size="sm"
                    onClick={() => setSchedule(cron)}
                    className="text-xs"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Format: minute hour day month weekday. Use * for any, */n for every n.
            </p>
          </div>

          {!validateCron(schedule) && schedule && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Invalid cron schedule</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* QUERY TAB */}
        <TabsContent value="query" className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Use Template (Optional)</label>
            <Select
              value={templateId?.toString() || ''}
              onValueChange={(val) => setTemplateId(val ? parseInt(val) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              SQL Query {templateId ? '(Optional)' : '*'}
            </label>
            <Textarea
              placeholder={`SELECT * FROM your_table\nWHERE created_at > NOW() - INTERVAL '1 day'`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={8}
              className="w-full font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={testQuery}
              disabled={testing || !query.trim()}
              variant="outline"
              className="flex gap-2"
            >
              {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Test Query
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-2 border rounded-lg p-4 bg-muted/50">
              {testResults.map((result, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  {result.status === 'idle' && <Clock className="h-4 w-4 text-muted-foreground" />}
                  {result.status === 'running' && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
                  {result.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {result.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  <span>{result.step}</span>
                  {result.message && <span className="text-muted-foreground ml-auto">{result.message}</span>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SOURCE TAB */}
        <TabsContent value="source" className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Source Type</label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (DuckDB only)</SelectItem>
                <SelectItem value="api">API Endpoint</SelectItem>
                <SelectItem value="database">External Database</SelectItem>
                <SelectItem value="file">File/Storage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sourceType !== 'none' && (
            <div>
              <label className="block text-sm font-medium mb-2">Source Configuration (JSON)</label>
              <Textarea
                placeholder='{"url": "https://api.example.com/data", "method": "GET"}'
                value={sourceConfig}
                onChange={(e) => setSourceConfig(e.target.value)}
                rows={4}
                className="w-full font-mono text-sm"
              />
            </div>
          )}
        </TabsContent>

        {/* DESTINATION TAB */}
        <TabsContent value="destination" className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Destination Type *</label>
            <Select value={destType} onValueChange={setDestType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="storage">MinIO Storage</SelectItem>
                <SelectItem value="database">External Database</SelectItem>
                <SelectItem value="none">None (DuckDB only)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {destType !== 'none' && (
            <div>
              <label className="block text-sm font-medium mb-2">Destination Configuration (JSON)</label>
              <Textarea
                placeholder={destType === 'storage' ? '{"format": "csv", "folder": "transformed"}' : '{"host": "localhost", "port": 5432}'}
                value={destConfig}
                onChange={(e) => setDestConfig(e.target.value)}
                rows={4}
                className="w-full font-mono text-sm"
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex gap-3 mt-8 pt-6 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => setActiveStep('general')}
          variant="outline"
          className="ml-auto"
        >
          Back
        </Button>
        {activeStep !== 'destination' && (
          <Button onClick={() => {
            const steps = ['general', 'query', 'source', 'destination'];
            const nextIdx = steps.indexOf(activeStep) + 1;
            if (nextIdx < steps.length) setActiveStep(steps[nextIdx]);
          }} className="flex gap-2">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {activeStep === 'destination' && (
          <Button
            onClick={saveWorkflow}
            disabled={loading}
            className="flex gap-2"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {workflowId ? 'Update Workflow' : 'Create Workflow'}
          </Button>
        )}
      </div>
    </div>
  );
}
