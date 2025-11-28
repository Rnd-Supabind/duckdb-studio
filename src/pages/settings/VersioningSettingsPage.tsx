import { GitBranch, Tag, FileText, Github, Play, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { toast } from 'sonner';

interface Version {
  tag: string;
  date: string;
  description: string;
}

const mockVersions: Version[] = [
  { tag: 'v1.2.0', date: '2024-01-15', description: 'Added MinIO support' },
  { tag: 'v1.1.0', date: '2024-01-10', description: 'Query templates feature' },
  { tag: 'v1.0.0', date: '2024-01-01', description: 'Initial release' },
];

export default function VersioningSettingsPage() {
  const [versions] = useState<Version[]>(mockVersions);
  const [dockerConfig, setDockerConfig] = useState({
    duckdbImage: 'duckdb/duckdb:latest',
    mysqlImage: 'mysql:8',
    minioImage: 'minio/minio:latest',
    network: 'dataforge-network',
  });

  const handleSaveDocker = () => {
    localStorage.setItem('docker_config', JSON.stringify(dockerConfig));
    toast.success('Docker configuration saved');
  };

  return (
    <div className="h-full flex flex-col">
      <header className="border-b-2 border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Versioning & DevOps</h1>
            <p className="text-sm text-muted-foreground">
              Docker configuration, Git versioning, and release automation
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl space-y-6">
          {/* Docker Configuration */}
          <div className="border-2 border-border">
            <div className="px-4 py-3 bg-muted border-b-2 border-border">
              <h3 className="font-bold text-sm uppercase tracking-wider">Docker Stack</h3>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure the Docker images for the backend processing stack.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duckdb-image">DuckDB CLI Image</Label>
                  <Input
                    id="duckdb-image"
                    value={dockerConfig.duckdbImage}
                    onChange={(e) => setDockerConfig({ ...dockerConfig, duckdbImage: e.target.value })}
                    className="font-mono text-sm mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="mysql-image">MySQL Image</Label>
                  <Input
                    id="mysql-image"
                    value={dockerConfig.mysqlImage}
                    onChange={(e) => setDockerConfig({ ...dockerConfig, mysqlImage: e.target.value })}
                    className="font-mono text-sm mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="minio-image">MinIO Image</Label>
                  <Input
                    id="minio-image"
                    value={dockerConfig.minioImage}
                    onChange={(e) => setDockerConfig({ ...dockerConfig, minioImage: e.target.value })}
                    className="font-mono text-sm mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="network">Docker Network</Label>
                  <Input
                    id="network"
                    value={dockerConfig.network}
                    onChange={(e) => setDockerConfig({ ...dockerConfig, network: e.target.value })}
                    className="font-mono text-sm mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveDocker}>Save Configuration</Button>
                <Button variant="outline">
                  <Play className="w-4 h-4 mr-2" />
                  Generate docker-compose.yml
                </Button>
              </div>
            </div>
          </div>

          {/* Version History */}
          <div className="border-2 border-border">
            <div className="px-4 py-3 bg-muted border-b-2 border-border flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Version History</h3>
            </div>
            <div className="divide-y divide-border">
              {versions.map((version, i) => (
                <div key={version.tag} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={i === 0 ? 'default' : 'outline'} className="font-mono">
                      {version.tag}
                    </Badge>
                    <div>
                      <p className="text-sm">{version.description}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {version.date}
                      </div>
                    </div>
                  </div>
                  {i === 0 && (
                    <Badge variant="outline" className="bg-chart-2/20 text-chart-2 border-chart-2">
                      Current
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* GitHub Actions */}
          <div className="border-2 border-border">
            <div className="px-4 py-3 bg-muted border-b-2 border-border flex items-center gap-2">
              <Github className="w-4 h-4" />
              <h3 className="font-bold text-sm uppercase tracking-wider">GitHub Actions</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Automate releases with Git tags, changelogs, and CI/CD pipelines.
              </p>
              <div className="bg-muted border border-border p-4 font-mono text-xs overflow-x-auto">
                <pre>{`# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker images
        run: docker compose build
      - name: Push to registry
        run: docker compose push`}</pre>
              </div>
              <Button variant="outline" className="mt-4">
                <FileText className="w-4 h-4 mr-2" />
                Download Workflow Template
              </Button>
            </div>
          </div>

          {/* Changelog */}
          <div className="border-2 border-border">
            <div className="px-4 py-3 bg-muted border-b-2 border-border flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Changelog</h3>
            </div>
            <div className="p-4">
              <pre className="bg-muted border border-border p-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
{`# Changelog

## [1.2.0] - 2024-01-15

### Added
- MinIO integration for self-hosted storage
- End-to-end encryption for file storage

### Changed
- Improved query editor performance

## [1.1.0] - 2024-01-10

### Added
- Query templates with save/load functionality
- AI-powered query generation

## [1.0.0] - 2024-01-01

### Added
- Initial release
- DuckDB WASM integration
- CSV, JSON, Parquet file support
- Excel-like data grid view`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
