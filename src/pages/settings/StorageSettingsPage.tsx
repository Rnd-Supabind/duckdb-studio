import { useEffect, useState } from 'react';
import { Database, Cloud, HardDrive, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StorageConfig {
  type: 's3' | 'minio' | 'local';
  s3: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  minio: {
    endpoint: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
  };
  encryption: boolean;
}

import { useDuckDBContext } from '@/contexts/DuckDBContext';
import { apiClient } from '@/lib/api';

export default function StorageSettingsPage() {
  const { configureS3 } = useDuckDBContext();
  const [config, setConfig] = useState<StorageConfig>({
    type: 'local',
    s3: { bucket: '', region: 'us-east-1', accessKeyId: '', secretAccessKey: '' },
    minio: { endpoint: 'http://localhost:9000', bucket: 'dataforge', accessKey: '', secretKey: '' },
    encryption: true,
  });
  const [testing, setTesting] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [backendBuckets, setBackendBuckets] = useState<string[]>([]);

  // Load existing backend config on mount
  useEffect(() => {
    const loadBackendConfig = async () => {
      try {
        const existing = await apiClient.getStorageConfig();
        if (!existing) {
          setBackendStatus('unknown');
          return;
        }

        if (existing.storage_type === 'minio') {
          setConfig((prev) => ({
            ...prev,
            type: 'minio',
            minio: {
              ...prev.minio,
              endpoint: existing.endpoint || prev.minio.endpoint,
              bucket: existing.bucket_name || prev.minio.bucket,
            },
            encryption: existing.encryption_enabled ?? prev.encryption,
          }));
        } else if (existing.storage_type === 's3') {
          setConfig((prev) => ({
            ...prev,
            type: 's3',
            s3: {
              ...prev.s3,
              bucket: existing.bucket_name || prev.s3.bucket,
              region: existing.region || prev.s3.region,
            },
            encryption: existing.encryption_enabled ?? prev.encryption,
          }));
        }

        setBackendStatus('ok');
        setBackendMessage(
          `${existing.storage_type.toUpperCase()} configured for bucket "${existing.bucket_name}"`
        );
      } catch (err) {
        console.error('Failed to load backend storage config', err);
        setBackendStatus('error');
        setBackendMessage('Failed to load backend storage configuration');
      }
    };

    loadBackendConfig();
  }, []);

  const handleSave = async () => {
    try {
      // Persist config to backend
      const payload =
        config.type === 's3'
          ? {
              storage_type: 's3',
              bucket_name: config.s3.bucket,
              region: config.s3.region,
              endpoint: null,
              access_key: config.s3.accessKeyId,
              secret_key: config.s3.secretAccessKey,
              encryption_enabled: config.encryption,
            }
          : config.type === 'minio'
          ? {
              storage_type: 'minio',
              bucket_name: config.minio.bucket,
              region: 'us-east-1',
              endpoint: config.minio.endpoint,
              access_key: config.minio.accessKey,
              secret_key: config.minio.secretKey,
              encryption_enabled: config.encryption,
            }
          : null;

      if (payload) {
        await apiClient.saveStorageConfig(payload);
        setBackendStatus('ok');
        setBackendMessage(
          `${payload.storage_type.toUpperCase()} configured for bucket "${payload.bucket_name}"`
        );
      } else {
        setBackendStatus('unknown');
        setBackendMessage('Using local-only storage (no backend config)');
      }

      // Apply config to DuckDB WASM session for local access
      if (config.type === 's3') {
        await configureS3({
          region: config.s3.region,
          accessKeyId: config.s3.accessKeyId,
          secretAccessKey: config.s3.secretAccessKey,
        });
      } else if (config.type === 'minio') {
        await configureS3({
          region: 'us-east-1', // MinIO often ignores this or needs a dummy
          accessKeyId: config.minio.accessKey,
          secretAccessKey: config.minio.secretKey,
          endpoint: config.minio.endpoint,
        });
      }
      toast.success('Storage configuration saved and applied (backend + browser)');
    } catch (err) {
      console.error(err);
      toast.error('Failed to apply configuration to DuckDB');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // Apply config first
      if (config.type === 's3') {
        await configureS3({
          region: config.s3.region,
          accessKeyId: config.s3.accessKeyId,
          secretAccessKey: config.s3.secretAccessKey,
        });
      } else if (config.type === 'minio') {
        await configureS3({
          region: 'us-east-1',
          accessKeyId: config.minio.accessKey,
          secretAccessKey: config.minio.secretKey,
          endpoint: config.minio.endpoint,
        });
      }

      const result = await apiClient.testStorageConnection();
      setBackendStatus(result.status === 'success' ? 'ok' : 'error');
      setBackendMessage(result.message || 'Connection test completed');

      try {
        const buckets = await apiClient.listBuckets();
        setBackendBuckets(buckets.buckets || []);
      } catch (e) {
        // Ignore bucket listing errors here; we already have status from /test
      }

      toast.success('Backend connection tested');
    } catch (err) {
      console.error(err);
      toast.error('Connection failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="border-b-2 border-border px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">Storage Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure S3, MinIO, or local storage for your data
        </p>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl space-y-6">
          {/* Backend status */}
          <div className="border-2 border-border">
            <div className="px-4 py-3 bg-muted border-b-2 border-border flex items-center gap-2">
              {backendStatus === 'ok' ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : backendStatus === 'error' ? (
                <AlertCircle className="w-4 h-4 text-destructive" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              <h3 className="font-bold text-sm uppercase tracking-wider">Backend Storage Status</h3>
            </div>
            <div className="p-4 text-sm">
              <p className="mb-2">
                {backendStatus === 'unknown' && 'No backend storage configuration found yet.'}
                {backendStatus !== 'unknown' && backendMessage}
              </p>
              {backendBuckets.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <span className="font-semibold">Buckets:</span>{' '}
                  {backendBuckets.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Storage Type Selection */}
          <div className="border-2 border-border">
            <div className="px-4 py-3 bg-muted border-b-2 border-border">
              <h3 className="font-bold text-sm uppercase tracking-wider">Storage Provider</h3>
            </div>
            <div className="p-4 grid grid-cols-3 gap-4">
              {[
                { type: 'local', icon: HardDrive, label: 'Local Only', desc: 'Browser storage' },
                { type: 's3', icon: Cloud, label: 'Amazon S3', desc: 'Your S3 bucket' },
                { type: 'minio', icon: Database, label: 'MinIO', desc: 'Self-hosted' },
              ].map(({ type, icon: Icon, label, desc }) => (
                <button
                  key={type}
                  onClick={() => setConfig({ ...config, type: type as StorageConfig['type'] })}
                  className={cn(
                    "border-2 p-4 text-left transition-all",
                    config.type === type
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <Icon className="w-6 h-6 mb-2" />
                  <p className="font-bold">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* S3 Configuration */}
          {config.type === 's3' && (
            <div className="border-2 border-border">
              <div className="px-4 py-3 bg-muted border-b-2 border-border">
                <h3 className="font-bold text-sm uppercase tracking-wider">S3 Configuration</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="s3-bucket">Bucket Name</Label>
                    <Input
                      id="s3-bucket"
                      value={config.s3.bucket}
                      onChange={(e) => setConfig({ ...config, s3: { ...config.s3, bucket: e.target.value } })}
                      placeholder="my-data-bucket"
                      className="font-mono mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="s3-region">Region</Label>
                    <Input
                      id="s3-region"
                      value={config.s3.region}
                      onChange={(e) => setConfig({ ...config, s3: { ...config.s3, region: e.target.value } })}
                      placeholder="us-east-1"
                      className="font-mono mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="s3-access-key">Access Key ID</Label>
                  <Input
                    id="s3-access-key"
                    value={config.s3.accessKeyId}
                    onChange={(e) => setConfig({ ...config, s3: { ...config.s3, accessKeyId: e.target.value } })}
                    placeholder="AKIA..."
                    className="font-mono mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="s3-secret">Secret Access Key</Label>
                  <Input
                    id="s3-secret"
                    type="password"
                    value={config.s3.secretAccessKey}
                    onChange={(e) => setConfig({ ...config, s3: { ...config.s3, secretAccessKey: e.target.value } })}
                    placeholder="••••••••"
                    className="font-mono mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MinIO Configuration */}
          {config.type === 'minio' && (
            <div className="border-2 border-border">
              <div className="px-4 py-3 bg-muted border-b-2 border-border">
                <h3 className="font-bold text-sm uppercase tracking-wider">MinIO Configuration</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <Label htmlFor="minio-endpoint">Endpoint URL</Label>
                  <Input
                    id="minio-endpoint"
                    value={config.minio.endpoint}
                    onChange={(e) => setConfig({ ...config, minio: { ...config.minio, endpoint: e.target.value } })}
                    placeholder="http://localhost:9000"
                    className="font-mono mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="minio-bucket">Bucket Name</Label>
                  <Input
                    id="minio-bucket"
                    value={config.minio.bucket}
                    onChange={(e) => setConfig({ ...config, minio: { ...config.minio, bucket: e.target.value } })}
                    placeholder="dataforge"
                    className="font-mono mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minio-access">Access Key</Label>
                    <Input
                      id="minio-access"
                      value={config.minio.accessKey}
                      onChange={(e) => setConfig({ ...config, minio: { ...config.minio, accessKey: e.target.value } })}
                      className="font-mono mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minio-secret">Secret Key</Label>
                    <Input
                      id="minio-secret"
                      type="password"
                      value={config.minio.secretKey}
                      onChange={(e) => setConfig({ ...config, minio: { ...config.minio, secretKey: e.target.value } })}
                      className="font-mono mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Encryption Settings */}
          <div className="border-2 border-border">
            <div className="px-4 py-3 bg-muted border-b-2 border-border">
              <h3 className="font-bold text-sm uppercase tracking-wider">Security</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="encryption">End-to-End Encryption</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Encrypt all data before uploading to storage
                  </p>
                </div>
                <Switch
                  id="encryption"
                  checked={config.encryption}
                  onCheckedChange={(checked) => setConfig({ ...config, encryption: checked })}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave}>Save Configuration</Button>
            {config.type !== 'local' && (
              <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
