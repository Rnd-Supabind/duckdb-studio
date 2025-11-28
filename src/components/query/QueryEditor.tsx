import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Save, Download, Loader2, Server, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDuckDBContext } from '@/contexts/DuckDBContext';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

interface QueryEditorProps {
  initialQuery?: string;
  onQueryResult?: (result: { columns: string[]; rows: unknown[][] }) => void;
}

export function QueryEditor({ initialQuery = '', onQueryResult }: QueryEditorProps) {
  const { executeQuery, loading: dbLoading } = useDuckDBContext();
  const [query, setQuery] = useState(initialQuery || 'SELECT * FROM your_table LIMIT 100');
  const [executing, setExecuting] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [useBackend, setUseBackend] = useState(false);

  const handleExecute = useCallback(async () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    setExecuting(true);
    try {
      if (useBackend) {
        // Execute on backend
        const result = await apiClient.executeQuery({ query });
        onQueryResult?.(result);
        toast.success(`Query executed on server: ${result.rows_affected} rows in ${result.execution_time_ms}ms`);
      } else {
        // Execute on WASM
        const result = await executeQuery(query);
        onQueryResult?.(result);
        toast.success(`Query executed locally: ${result.rows.length} rows returned`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Query execution failed');
    } finally {
      setExecuting(false);
    }
  }, [query, executeQuery, onQueryResult, useBackend]);

  const handleSaveTemplate = useCallback(() => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    const templates = JSON.parse(localStorage.getItem('query_templates') || '{}');
    templates[templateName] = {
      name: templateName,
      query,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('query_templates', JSON.stringify(templates));
    toast.success(`Template "${templateName}" saved`);
    setTemplateName('');
  }, [templateName, query]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([query], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateName || 'query'}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  }, [query, templateName]);

  const isDisabled = dbLoading || executing;

  return (
    <div className="border-2 border-border h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b-2 border-border">
        <h3 className="font-bold text-sm uppercase tracking-wider">SQL Editor</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            <Switch
              id="execution-mode"
              checked={useBackend}
              onCheckedChange={setUseBackend}
            />
            <Server className="w-4 h-4" />
            <Label htmlFor="execution-mode" className="text-xs cursor-pointer">
              {useBackend ? 'Server' : 'Browser'}
            </Label>
          </div>
          <Button
            size="sm"
            onClick={handleExecute}
            disabled={isDisabled}
            className="gap-2"
          >
            {executing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-[300px]">
        <Editor
          defaultLanguage="sql"
          value={query}
          onChange={(value) => setQuery(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'Space Mono, monospace',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>

      <div className="flex items-center gap-2 px-4 py-2 bg-muted border-t-2 border-border">
        <Input
          placeholder="Template name..."
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="max-w-xs font-mono text-sm"
        />
        <Button variant="outline" size="sm" onClick={handleSaveTemplate} disabled={!query.trim()}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );
}
