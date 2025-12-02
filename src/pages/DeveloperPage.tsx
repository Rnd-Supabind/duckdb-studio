import { useState, useEffect } from 'react';
import {
    Key, Plus, Copy, Trash2, Terminal, Code,
    Check, AlertTriangle, ExternalLink, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ApiToken {
    id: number;
    name: string;
    prefix: string;
    created_at: string;
    last_used_at: string | null;
}

export default function DeveloperPage() {
    const { token } = useAuth();
    const [tokens, setTokens] = useState<ApiToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGenerate, setShowGenerate] = useState(false);
    const [newTokenName, setNewTokenName] = useState('');
    const [generatedToken, setGeneratedToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchTokens = async () => {
        if (!token) return;
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/api-tokens`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            if (response.ok) {
                const data = await response.json();
                setTokens(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTokens();
    }, [token]);

    const handleGenerateToken = async () => {
        if (!newTokenName.trim()) return;

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/api-tokens`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: newTokenName }),
                }
            );

            if (!response.ok) throw new Error('Failed to generate token');

            const data = await response.json();
            setGeneratedToken(data.token);
            fetchTokens();
            toast.success('Token generated successfully');
        } catch (err) {
            toast.error('Failed to generate token');
        }
    };

    const handleDeleteToken = async (id: number) => {
        if (!confirm('Are you sure you want to revoke this token? This action cannot be undone.')) return;

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/api-tokens/${id}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (!response.ok) throw new Error('Failed to revoke token');

            setTokens(tokens.filter(t => t.id !== id));
            toast.success('Token revoked');
        } catch (err) {
            toast.error('Failed to revoke token');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Copied to clipboard');
    };

    const closeGenerateDialog = () => {
        setShowGenerate(false);
        setGeneratedToken(null);
        setNewTokenName('');
    };

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

    const codeExamples = {
        curl: `curl -X POST "${apiUrl}/storage/upload" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -F "file=@data.csv" \\
  -F "folder=uploads"`,
        python: `import requests

url = "${apiUrl}/storage/upload"
headers = {"X-API-Key": "YOUR_API_KEY"}
files = {"file": open("data.csv", "rb")}
data = {"folder": "uploads"}

response = requests.post(url, headers=headers, files=files, data=data)
print(response.json())`,
        node: `const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('file', fs.createReadStream('data.csv'));
form.append('folder', 'uploads');

axios.post('${apiUrl}/storage/upload', form, {
  headers: {
    ...form.getHeaders(),
    'X-API-Key': 'YOUR_API_KEY'
  }
}).then(res => console.log(res.data));`
          ,listFiles: `curl -X GET "${apiUrl}/storage/files?folder=uploads" \\
      -H "X-API-Key: YOUR_API_KEY"`,
          runQuery: `curl -X POST "${apiUrl}/execute/run" \\
      -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" \\
      -d '{"query":"SELECT * FROM my_table LIMIT 10"}'`,
          createWorkflow: `curl -X POST "${apiUrl}/workflows/" \\
      -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" \\
      -d '{"name":"Daily","schedule":"0 0 * * *","query":"SELECT 1"}'`,
          runWorkflow: `curl -X POST "${apiUrl}/workflows/123/run" \\
      -H "X-API-Key: YOUR_API_KEY"`,
        };

    return (
        <div className="h-full p-6 overflow-auto">
            <div className="w-full space-y-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">API Access & Developers</h1>
                    <p className="text-muted-foreground">
                        Manage API tokens and integrate DataForge into your applications.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Token Management */}
                    <Card className="md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>API Tokens</CardTitle>
                                <CardDescription>
                                    Create tokens to authenticate external applications.
                                </CardDescription>
                            </div>
                            <Dialog open={showGenerate} onOpenChange={(open) => !open && closeGenerateDialog()}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => setShowGenerate(true)} className="gap-2">
                                        <Plus className="w-4 h-4" />
                                        Generate Token
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Generate API Token</DialogTitle>
                                        <DialogDescription>
                                            Give your token a descriptive name to identify it later.
                                        </DialogDescription>
                                    </DialogHeader>

                                    {!generatedToken ? (
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Token Name</Label>
                                                <Input
                                                    placeholder="e.g., Production Data Pipeline"
                                                    value={newTokenName}
                                                    onChange={(e) => setNewTokenName(e.target.value)}
                                                />
                                            </div>
                                            <Button
                                                onClick={handleGenerateToken}
                                                disabled={!newTokenName.trim()}
                                                className="w-full"
                                            >
                                                Generate
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 py-4">
                                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                                <div className="text-sm text-yellow-500">
                                                    <strong>Make sure to copy your token now.</strong>
                                                    <br />
                                                    You won't be able to see it again!
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 bg-muted p-3 rounded-md font-mono text-sm break-all">
                                                    {generatedToken}
                                                </code>
                                                <Button size="icon" variant="outline" onClick={() => copyToClipboard(generatedToken)}>
                                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {tokens.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No API tokens generated yet.
                                    </div>
                                ) : (
                                    <div className="border rounded-lg divide-y">
                                        {tokens.map(token => (
                                            <div key={token.id} className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-primary/10 rounded-full">
                                                        <Key className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{token.name}</p>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            Prefix: {token.prefix}...
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right text-xs text-muted-foreground">
                                                        <p>Created: {new Date(token.created_at).toLocaleDateString()}</p>
                                                        <p>Last used: {token.last_used_at ? new Date(token.last_used_at).toLocaleDateString() : 'Never'}</p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteToken(token.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Integration Guide */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Integration Guide</CardTitle>
                            <CardDescription>
                                Use your API token to interact with DataForge programmatically.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="curl">
                                <TabsList>
                                    <TabsTrigger value="curl" className="gap-2"><Terminal className="w-4 h-4" /> cURL</TabsTrigger>
                                    <TabsTrigger value="python" className="gap-2"><Code className="w-4 h-4" /> Python</TabsTrigger>
                                    <TabsTrigger value="node" className="gap-2"><Code className="w-4 h-4" /> Node.js</TabsTrigger>
                                </TabsList>
                                <div className="mt-4">
                                    <TabsContent value="curl">
                                        <div className="relative">
                                            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                                                {codeExamples.curl}
                                            </pre>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="absolute top-2 right-2"
                                                onClick={() => copyToClipboard(codeExamples.curl)}
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="python">
                                        <div className="relative">
                                            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                                                {codeExamples.python}
                                            </pre>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="absolute top-2 right-2"
                                                onClick={() => copyToClipboard(codeExamples.python)}
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="node">
                                        <div className="relative">
                                            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                                                {codeExamples.node}
                                            </pre>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="absolute top-2 right-2"
                                                onClick={() => copyToClipboard(codeExamples.node)}
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                <div className="border p-3 bg-secondary/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-sm">List Files</h4>
                                        <a className="text-xs underline" href="/docs#storage" target="_blank">Docs</a>
                                    </div>
                                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{codeExamples.listFiles}</pre>
                                </div>
                                <div className="border p-3 bg-secondary/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-sm">Run Query</h4>
                                        <a className="text-xs underline" href="/docs#execute" target="_blank">Docs</a>
                                    </div>
                                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{codeExamples.runQuery}</pre>
                                </div>
                                <div className="border p-3 bg-secondary/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-sm">Create Workflow</h4>
                                        <a className="text-xs underline" href="/docs#workflows" target="_blank">Docs</a>
                                    </div>
                                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{codeExamples.createWorkflow}</pre>
                                </div>
                                <div className="border p-3 bg-secondary/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-sm">Run Workflow</h4>
                                        <a className="text-xs underline" href="/docs#workflows" target="_blank">Docs</a>
                                    </div>
                                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{codeExamples.runWorkflow}</pre>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
