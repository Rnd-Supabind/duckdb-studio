import { useState, useEffect } from 'react';
import { FileCode, Trash2, Play, Copy, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Template {
  name: string;
  query: string;
  createdAt: string;
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Record<string, Template>>({});

  useEffect(() => {
    const stored = localStorage.getItem('query_templates');
    if (stored) {
      setTemplates(JSON.parse(stored));
    }
  }, []);

  const handleDelete = (name: string) => {
    const updated = { ...templates };
    delete updated[name];
    localStorage.setItem('query_templates', JSON.stringify(updated));
    setTemplates(updated);
    toast.success(`Template "${name}" deleted`);
  };

  const handleCopy = (query: string) => {
    navigator.clipboard.writeText(query);
    toast.success('Query copied to clipboard');
  };

  const handleRun = (query: string) => {
    sessionStorage.setItem('query_to_run', query);
    navigate('/query');
  };

  const templateList = Object.values(templates);

  return (
    <div className="h-full flex flex-col">
      <header className="border-b-2 border-border px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">Query Templates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Save and reuse your transformation queries
        </p>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        {templateList.length === 0 ? (
          <div className="border-2 border-dashed border-border p-12 text-center">
            <FileCode className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-bold mb-2">No Templates Yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create templates by saving queries in the Query Editor
            </p>
            <Button onClick={() => navigate('/query')}>
              Go to Query Editor
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {templateList.map((template) => (
              <div
                key={template.name}
                className="border-2 border-border p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold">{template.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRun(template.query)}
                      className="h-8 w-8 p-0"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(template.query)}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.name)}
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <pre className="bg-muted border border-border p-3 text-xs font-mono overflow-x-auto">
                  {template.query}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
