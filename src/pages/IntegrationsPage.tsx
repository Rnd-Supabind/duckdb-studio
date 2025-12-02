import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { IntegrationDialog } from '@/components/integrations/IntegrationDialog';
import { ProviderCatalog } from '@/components/integrations/ProviderCatalog';
import { cn } from '@/lib/utils';

interface Integration {
    id: number;
    name: string;
    provider: string;
    config: any;
    is_active: boolean;
    created_at: string;
}

export default function IntegrationsPage() {
    const { token } = useAuth();
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingIntegration, setEditingIntegration] = useState<Integration | undefined>(undefined);
    const [testingId, setTestingId] = useState<number | null>(null);

    useEffect(() => {
        loadIntegrations();
    }, [token]);

    const loadIntegrations = async () => {
        try {
            const data = await apiClient.getIntegrations();
            setIntegrations(data);
        } catch (err: any) {
            toast.error('Failed to load integrations');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this integration?')) return;
        try {
            await apiClient.deleteIntegration(id);
            setIntegrations(prev => prev.filter(i => i.id !== id));
            toast.success('Integration deleted');
        } catch (err: any) {
            toast.error('Failed to delete integration');
        }
    };

    const handleTest = async (id: number) => {
        setTestingId(id);
        try {
            const result = await apiClient.testIntegration(id);
            if (result.status === 'success') {
                toast.success('Connection successful!');
            } else {
                toast.error(`Connection failed: ${result.message}`);
            }
        } catch (err: any) {
            toast.error('Test failed');
        } finally {
            setTestingId(null);
        }
    };

    const getProviderIcon = (provider: string) => {
        // You could add specific icons here
        return <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {provider.substring(0, 2).toUpperCase()}
        </div>;
    };

    return (
        <div className="h-full overflow-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage connections to external services and databases
                    </p>
                </div>
                <Button onClick={() => { setEditingIntegration(undefined); setDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Integration
                </Button>
            </div>

            <ProviderCatalog />

            {loading ? (
                <div className="text-center py-10">Loading...</div>
            ) : integrations.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">No integrations configured yet</p>
                    <Button onClick={() => { setEditingIntegration(undefined); setDialogOpen(true); }}>
                        Create your first integration
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {integrations.map(integration => (
                        <div key={integration.id} className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {getProviderIcon(integration.provider)}
                                    <div>
                                        <h3 className="font-semibold">{integration.name}</h3>
                                        <p className="text-xs text-muted-foreground capitalize">{integration.provider}</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    integration.is_active ? "bg-green-500" : "bg-gray-300"
                                )} />
                            </div>

                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTest(integration.id)}
                                    disabled={testingId === integration.id}
                                >
                                    {testingId === integration.id ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    )}
                                    <span className="ml-2">Test</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setEditingIntegration(integration); setDialogOpen(true); }}
                                >
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(integration.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <IntegrationDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={loadIntegrations}
                integration={editingIntegration}
            />
        </div>
    );
}
