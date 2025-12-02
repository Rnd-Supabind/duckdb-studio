import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Save, Play, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Template {
  id: number;
  name: string;
  description: string;
  query: string;
  created_at: string;
}

export default function TemplatesPage() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/workflows/templates`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const saveTemplate = async () => {
    if (!name || !query) {
      toast.error('Name and query are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/workflows/templates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            description,
            query,
          }),
        }
      );

      if (response.ok) {
        toast.success('Template saved successfully');
        setName('');
        setDescription('');
        setQuery('');
        fetchTemplates();
      } else {
        toast.error('Failed to save template');
      }
    } catch (err) {
      toast.error('Error saving template');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setName(template.name);
    setDescription(template.description);
    setQuery(template.query);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="h-full flex">
      {/* Templates List */}
      <div className="w-80 border-r-2 border-border overflow-auto">
        <div className="border-b-2 border-border p-4 bg-secondary">
          <h3 className="font-bold">Query Templates</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Save and reuse transformation queries
          </p>
        </div>
        <div className="p-4 space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => loadTemplate(template)}
              className="border-2 border-border p-3 cursor-pointer hover:bg-accent transition-colors"
            >
              <p className="font-medium text-sm">{template.name}</p>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {template.description}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(template.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No templates yet
            </p>
          )}
        </div>
      </div>

      {/* Template Editor */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl">
          <h2 className="text-2xl font-bold mb-6">
            {selectedTemplate ? 'Edit Template' : 'Create New Template'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Template Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Customer Data Cleanup"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this template does"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">SQL Query</label>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SELECT * FROM table WHERE..."
                className="font-mono text-sm min-h-[300px]"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveTemplate} disabled={loading} className="gap-2">
                <Save className="w-4 h-4" />
                Save Template
              </Button>
              <Button
                onClick={() => copyToClipboard(query)}
                variant="outline"
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Query
              </Button>
              {selectedTemplate && (
                <Button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setName('');
                    setDescription('');
                    setQuery('');
                  }}
                  variant="outline"
                >
                  New Template
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
