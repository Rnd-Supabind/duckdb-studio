import { Cog, Database, HardDrive, Server } from 'lucide-react';

export default function SystemSettingsPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Cog className="w-8 h-8" />
                <h1 className="text-3xl font-bold">System Settings</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Database Info */}
                <div className="bg-card rounded-lg border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Database className="w-6 h-6 text-primary" />
                        <h2 className="text-xl font-semibold">Database</h2>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-muted-foreground">Type</p>
                            <p className="font-medium">MySQL 8.0</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Host</p>
                            <p className="font-medium">dataforge-db:3306</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                                Connected
                            </span>
                        </div>
                    </div>
                </div>

                {/* Storage Info */}
                <div className="bg-card rounded-lg border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <HardDrive className="w-6 h-6 text-primary" />
                        <h2 className="text-xl font-semibold">Storage</h2>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-muted-foreground">Type</p>
                            <p className="font-medium">MinIO S3-Compatible</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Endpoint</p>
                            <p className="font-medium">dataforge-minio:9000</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                                Connected
                            </span>
                        </div>
                    </div>
                </div>

                {/* Server Info */}
                <div className="bg-card rounded-lg border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Server className="w-6 h-6 text-primary" />
                        <h2 className="text-xl font-semibold">Server</h2>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-muted-foreground">API Version</p>
                            <p className="font-medium">v1.0.0</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Environment</p>
                            <p className="font-medium">Development</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Uptime</p>
                            <p className="font-medium">2 days, 3 hours</p>
                        </div>
                    </div>
                </div>

                {/* Configuration */}
                <div className="bg-card rounded-lg border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Cog className="w-6 h-6 text-primary" />
                        <h2 className="text-xl font-semibold">Configuration</h2>
                    </div>
                    <div className="space-y-3">
                        <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                            Edit Environment Variables
                        </button>
                        <button className="w-full px-4 py-2 border rounded-lg hover:bg-muted">
                            View System Logs
                        </button>
                        <button className="w-full px-4 py-2 border rounded-lg hover:bg-muted">
                            Restart Services
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
