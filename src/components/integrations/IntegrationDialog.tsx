import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface IntegrationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    integration?: any;
}

const PROVIDERS = [
    { value: 'openai', label: 'OpenAI', category: 'AI' },
    { value: 'anthropic', label: 'Anthropic', category: 'AI' },
    { value: 'gemini', label: 'Google Gemini', category: 'AI' },
    { value: 'postgres', label: 'PostgreSQL', category: 'Database' },
    { value: 'mysql', label: 'MySQL', category: 'Database' },
    { value: 'http', label: 'HTTP / REST API', category: 'API' },
];

export function IntegrationDialog({ open, onOpenChange, onSuccess, integration }: IntegrationDialogProps) {
    const [name, setName] = useState('');
    const [provider, setProvider] = useState('openai');
    const [credentials, setCredentials] = useState<any>({});
    const [config, setConfig] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    useEffect(() => {
        if (open) {
            if (integration) {
                setName(integration.name);
                setProvider(integration.provider);
                setConfig(integration.config || {});
                setCredentials({});
                setTestStatus('idle');
            } else {
                setName('');
                setProvider('openai');
                setCredentials({});
                setConfig({});
                setTestStatus('idle');
            }
        }
    }, [open, integration]);

    const handleTest = async () => {
        if (!name.trim()) {
            toast.error('Please enter a name');
            return;
        }
        if (Object.keys(credentials).length === 0 && !integration) {
            toast.error('Please enter credentials');
            return;
        }

        setTesting(true);
        setTestStatus('idle');
        try {
            const data = {
                name,
                provider,
                credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
                config,
            };

            const response = await apiClient.post('/integrations/test', data);
            setTestStatus('success');
            setTestMessage(response.message || 'Connection successful!');
            toast.success('Integration test passed!');
        } catch (err: any) {
            setTestStatus('error');
            setTestMessage(err?.message || 'Connection failed');
            toast.error('Integration test failed');
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = {
                name,
                provider,
                credentials,
                config,
            };

            if (integration) {
                const updateData: any = { name, config };
                if (Object.keys(credentials).length > 0) {
                    updateData.credentials = credentials;
                }
                await apiClient.updateIntegration(integration.id, updateData);
                toast.success('Integration updated');
            } else {
                await apiClient.createIntegration(data);
                toast.success('Integration created');
            }
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message || 'Failed to save integration');
        } finally {
            setLoading(false);
        }
    };

    const renderProviderFields = () => {
        const providerInfo = PROVIDERS.find(p => p.value === provider);
        
        switch (provider) {
            case 'openai':
                return (
                    <div className="space-y-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline font-semibold">OpenAI API Keys</a>
                            </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                            <Label>API Key *</Label>
                            <Input
                                type="password"
                                value={credentials.api_key || ''}
                                onChange={(e) => setCredentials({ ...credentials, api_key: e.target.value })}
                                placeholder="sk-..."
                                required
                            />
                        </div>
                    </div>
                );
            case 'anthropic':
                return (
                    <div className="space-y-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Get your API key from <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Anthropic Console</a>
                            </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                            <Label>API Key *</Label>
                            <Input
                                type="password"
                                value={credentials.api_key || ''}
                                onChange={(e) => setCredentials({ ...credentials, api_key: e.target.value })}
                                placeholder="sk-ant-..."
                                required
                            />
                        </div>
                    </div>
                );
            case 'gemini':
                return (
                    <div className="space-y-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google AI Studio</a>
                            </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                            <Label>API Key *</Label>
                            <Input
                                type="password"
                                value={credentials.api_key || ''}
                                onChange={(e) => setCredentials({ ...credentials, api_key: e.target.value })}
                                placeholder="AIza..."
                                required
                            />
                        </div>
                    </div>
                );
            case 'postgres':
                return (
                    <div className="space-y-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Make sure your PostgreSQL server is accessible from the network
                            </AlertDescription>
                        </Alert>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Host *</Label>
                                <Input
                                    value={credentials.host || ''}
                                    onChange={(e) => setCredentials({ ...credentials, host: e.target.value })}
                                    placeholder="localhost"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Port *</Label>
                                <Input
                                    type="number"
                                    value={credentials.port || 5432}
                                    onChange={(e) => setCredentials({ ...credentials, port: parseInt(e.target.value) })}
                                    placeholder="5432"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Database *</Label>
                            <Input
                                value={credentials.database || ''}
                                onChange={(e) => setCredentials({ ...credentials, database: e.target.value })}
                                placeholder="mydb"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Username *</Label>
                                <Input
                                    value={credentials.username || ''}
                                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                    placeholder="user"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password *</Label>
                                <Input
                                    type="password"
                                    value={credentials.password || ''}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                    placeholder={integration ? '(Unchanged)' : 'password'}
                                    required={!integration}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'mysql':
                return (
                    <div className="space-y-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Make sure your MySQL server is accessible and user has permissions
                            </AlertDescription>
                        </Alert>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Host *</Label>
                                <Input
                                    value={credentials.host || ''}
                                    onChange={(e) => setCredentials({ ...credentials, host: e.target.value })}
                                    placeholder="localhost"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Port *</Label>
                                <Input
                                    type="number"
                                    value={credentials.port || 3306}
                                    onChange={(e) => setCredentials({ ...credentials, port: parseInt(e.target.value) })}
                                    placeholder="3306"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Database *</Label>
                            <Input
                                value={credentials.database || ''}
                                onChange={(e) => setCredentials({ ...credentials, database: e.target.value })}
                                placeholder="mydb"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Username *</Label>
                                <Input
                                    value={credentials.username || ''}
                                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                    placeholder="root"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password *</Label>
                                <Input
                                    type="password"
                                    value={credentials.password || ''}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                    placeholder={integration ? '(Unchanged)' : 'password'}
                                    required={!integration}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'http':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Base URL *</Label>
                            <Input
                                value={config.url || ''}
                                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                placeholder="https://api.example.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Auth Header Name (Optional)</Label>
                            <Input
                                value={credentials.auth_header || 'Authorization'}
                                onChange={(e) => setCredentials({ ...credentials, auth_header: e.target.value })}
                                placeholder="Authorization"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Auth Token / API Key (Optional)</Label>
                            <Input
                                type="password"
                                value={credentials.auth_token || ''}
                                onChange={(e) => setCredentials({ ...credentials, auth_token: e.target.value })}
                                placeholder={integration ? '(Unchanged)' : 'Bearer ...'}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{integration ? 'Edit Integration' : 'Add New Integration'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="font-semibold">
                            Integration Name *
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., My OpenAI Account"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Choose a descriptive name to identify this integration
                        </p>
                    </div>

                    {!integration && (
                        <div className="space-y-2">
                            <Label htmlFor="provider" className="font-semibold">
                                Provider *
                            </Label>
                            <Select value={provider} onValueChange={setProvider}>
                                <SelectTrigger id="provider">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">AI Providers</div>
                                    {PROVIDERS.filter(p => p.category === 'AI').map(p => (
                                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                    ))}
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Databases</div>
                                    {PROVIDERS.filter(p => p.category === 'Database').map(p => (
                                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                    ))}
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Other</div>
                                    {PROVIDERS.filter(p => p.category === 'API').map(p => (
                                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="bg-muted/50 p-3 rounded-lg">
                        {renderProviderFields()}
                    </div>

                    {testStatus !== 'idle' && (
                        <Alert variant={testStatus === 'success' ? 'default' : 'destructive'}>
                            {testStatus === 'success' ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <AlertCircle className="h-4 w-4" />
                            )}
                            <AlertDescription>{testMessage}</AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter className="flex gap-2 justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleTest}
                            disabled={testing || !name.trim()}
                            className="flex gap-2"
                        >
                            {testing ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    {testStatus === 'success' ? (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            Connected
                                        </>
                                    ) : (
                                        'Test Connection'
                                    )}
                                </>
                            )}
                        </Button>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Saving...' : integration ? 'Update Integration' : 'Save Integration'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
