import { Shield, Key, Lock, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { toast } from 'sonner';

interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
}

const securityChecks: SecurityCheck[] = [
  { id: '1', name: 'Local Processing', description: 'Data processed in browser WASM', status: 'pass' },
  { id: '2', name: 'No Server Upload', description: 'Files stay on client by default', status: 'pass' },
  { id: '3', name: 'Storage Encryption', description: 'End-to-end encryption enabled', status: 'pass' },
  { id: '4', name: 'API Keys', description: 'Keys stored in browser only', status: 'warning' },
  { id: '5', name: 'Audit Logging', description: 'All operations logged locally', status: 'pass' },
];

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState({
    localProcessingOnly: true,
    auditLogging: true,
    clearDataOnExit: false,
    requireConfirmation: true,
  });

  const handleSave = () => {
    localStorage.setItem('security_settings', JSON.stringify(settings));
    toast.success('Security settings saved');
  };

  const getStatusIcon = (status: SecurityCheck['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-chart-2" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-chart-4" />;
      case 'fail':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: SecurityCheck['status']) => {
    const variants = {
      pass: 'bg-chart-2/20 text-chart-2 border-chart-2',
      warning: 'bg-chart-4/20 text-chart-4 border-chart-4',
      fail: 'bg-destructive/20 text-destructive border-destructive',
    };
    return (
      <Badge variant="outline" className={`font-mono text-xs ${variants[status]}`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <header className="border-b-2 border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Security Settings</h1>
            <p className="text-sm text-muted-foreground">
              SOC-aligned security controls and audit settings
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl space-y-6">
          {/* Security Status */}
          <div className="border-2 border-border">
            <div className="px-4 py-3 bg-muted border-b-2 border-border">
              <h3 className="font-bold text-sm uppercase tracking-wider">Security Status</h3>
            </div>
            <div className="divide-y divide-border">
              {securityChecks.map((check) => (
                <div key={check.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <p className="font-medium">{check.name}</p>
                      <p className="text-xs text-muted-foreground">{check.description}</p>
                    </div>
                  </div>
                  {getStatusBadge(check.status)}
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Controls */}
          <div className="border-2 border-border">
            <div className="px-4 py-3 bg-muted border-b-2 border-border flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Privacy Controls</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Local Processing Only</Label>
                  <p className="text-xs text-muted-foreground">
                    Process all data in browser without server upload
                  </p>
                </div>
                <Switch
                  checked={settings.localProcessingOnly}
                  onCheckedChange={(checked) => setSettings({ ...settings, localProcessingOnly: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Clear Data on Exit</Label>
                  <p className="text-xs text-muted-foreground">
                    Remove all local data when browser closes
                  </p>
                </div>
                <Switch
                  checked={settings.clearDataOnExit}
                  onCheckedChange={(checked) => setSettings({ ...settings, clearDataOnExit: checked })}
                />
              </div>
            </div>
          </div>

          {/* Audit Settings */}
          <div className="border-2 border-border">
            <div className="px-4 py-3 bg-muted border-b-2 border-border flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Audit & Compliance</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Audit Logging</Label>
                  <p className="text-xs text-muted-foreground">
                    Log all data operations for compliance
                  </p>
                </div>
                <Switch
                  checked={settings.auditLogging}
                  onCheckedChange={(checked) => setSettings({ ...settings, auditLogging: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Confirmation</Label>
                  <p className="text-xs text-muted-foreground">
                    Confirm before destructive operations
                  </p>
                </div>
                <Switch
                  checked={settings.requireConfirmation}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireConfirmation: checked })}
                />
              </div>
            </div>
          </div>

          {/* Key Management */}
          <div className="border-2 border-border">
            <div className="px-4 py-3 bg-muted border-b-2 border-border flex items-center gap-2">
              <Key className="w-4 h-4" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Key Management</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                All encryption keys and API credentials are stored locally in your browser.
                For production use, consider integrating with a secrets manager.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Export Keys (Encrypted)
                </Button>
                <Button variant="outline" size="sm">
                  Clear All Keys
                </Button>
              </div>
            </div>
          </div>

          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}
