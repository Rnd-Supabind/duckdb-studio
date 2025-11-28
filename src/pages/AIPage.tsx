import { useState } from 'react';
import { Sparkles, Send, Copy, Play, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function AIPage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe what you want to transform');
      return;
    }

    // Placeholder for AI integration
    setLoading(true);
    
    // Simulate AI response
    setTimeout(() => {
      setGeneratedQuery(`-- AI Generated Query
-- Based on: "${prompt}"

SELECT 
  column1,
  column2,
  -- Add your transformations here
  UPPER(text_column) as transformed_text,
  ROUND(numeric_column, 2) as rounded_value
FROM your_table
WHERE condition = true
ORDER BY column1;`);
      setLoading(false);
      toast.success('Query generated! Review and customize as needed.');
    }, 1500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedQuery);
    toast.success('Copied to clipboard');
  };

  const handleRun = () => {
    sessionStorage.setItem('query_to_run', generatedQuery);
    navigate('/query');
  };

  return (
    <div className="h-full flex flex-col">
      <header className="border-b-2 border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
            <p className="text-sm text-muted-foreground">
              Generate DuckDB queries using natural language
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* API Configuration */}
          <div className="border-2 border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4" />
              <h3 className="font-bold text-sm uppercase tracking-wider">AI Provider</h3>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="api-key" className="text-sm">API Key (stored locally)</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your OpenAI, Anthropic, or other API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono text-sm mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your API key is stored only in your browser's local storage
                </p>
              </div>
            </div>
          </div>

          {/* Prompt Input */}
          <div className="border-2 border-border p-4">
            <Label className="text-sm font-bold uppercase tracking-wider mb-3 block">
              Describe your transformation
            </Label>
            <Textarea
              placeholder="Example: Join the sales and customers tables, calculate total revenue per customer, and filter for customers with more than $1000 in purchases..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] font-mono text-sm"
            />
            <div className="flex justify-end mt-3">
              <Button onClick={handleGenerate} disabled={loading} className="gap-2">
                {loading ? (
                  <span className="animate-pulse">Generating...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Query
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Generated Query */}
          {generatedQuery && (
            <div className="border-2 border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm uppercase tracking-wider">Generated Query</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                    <Copy className="w-3 h-3" />
                    Copy
                  </Button>
                  <Button size="sm" onClick={handleRun} className="gap-2">
                    <Play className="w-3 h-3" />
                    Run in Editor
                  </Button>
                </div>
              </div>
              <pre className="bg-muted border border-border p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                {generatedQuery}
              </pre>
            </div>
          )}

          {/* Tips */}
          <div className="border-2 border-dashed border-border p-4">
            <h3 className="font-bold text-sm mb-2">Tips for better results:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Be specific about table names and column names</li>
              <li>• Describe the desired output format</li>
              <li>• Mention any filters, groupings, or aggregations needed</li>
              <li>• Include data types if relevant (dates, numbers, text)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
