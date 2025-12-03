import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { ProviderCatalog } from '@/components/integrations/ProviderCatalog';
import { IntegrationDialog } from '@/components/integrations/IntegrationDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getIntegrations();
      setIntegrations(data || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await apiClient.deleteIntegration(id);
      toast.success('Deleted');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed');
    }
  };

  const handleEdit = (i: any) => {
    setEditingIntegration(i);
    setOpenDialog(true);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground text-sm">Add and manage provider connections (AI, databases, webhooks).</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingIntegration(null); setOpenDialog(true); }}>
            <Plus className="w-4 h-4" />
            Add Integration
          </Button>
        </div>
      </div>

      <ProviderCatalog />

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3">Your Integrations</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading... </div>
        ) : integrations.length === 0 ? (
          <div className="text-sm text-muted-foreground">No integrations yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((i) => (
              <div key={i.id} className="border p-4 rounded bg-card flex justify-between items-start">
                <div>
                  <div className="font-semibold">{i.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{i.provider}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(i)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(i.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <IntegrationDialog open={openDialog} onOpenChange={(o) => { setOpenDialog(o); if (!o) { setEditingIntegration(null); load(); } }} onSuccess={() => load()} integration={editingIntegration} />
    </div>
  );
}
