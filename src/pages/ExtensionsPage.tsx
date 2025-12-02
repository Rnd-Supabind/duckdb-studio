import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useExecutionMode } from '@/contexts/ExecutionModeContext';
import { Plug2, Download, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Extension {
    name: string;
    loaded: boolean;
    installed: boolean;
    description: string;
}

export default function ExtensionsPage() {
    const { token } = useAuth();
    const { isServerMode } = useExecutionMode();
    const [extensions, setExtensions] = useState<Extension[]>([]);
    const [loading, setLoading] = useState(true);
    const [installingExt, setInstallingExt] = useState<string | null>(null);

    const commonExtensions = [
        { name: 'httpfs', description: 'Remote file access (HTTP/S3)' },
        { name: 'json', description: 'JSON file support' },
        { name: 'parquet', description: 'Parquet file support' },
        { name: 'postgres_scanner', description: 'Query PostgreSQL databases' },
        { name: 'mysql_scanner', description: 'Query MySQL databases' },
        { name: 'sqlite_scanner', description: 'Query SQLite databases' },
        { name: 'excel', description: 'Read Excel files' },
        { name: 'spatial', description: 'Geospatial functions' },
        { name: 'icu', description: 'International text support' },
        { name: 'fts', description: 'Full-text search' },
    ];

    useEffect(() => {
        if (isServerMode) {
            fetchExtensions();
        }
    }, [isServerMode]);

    const fetchExtensions = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/execute/extensions`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setExtensions(data.extensions || []);
            } else {
                // Fallback to showing common extensions
                setExtensions(commonExtensions.map(ext => ({
                    ...ext,
                    loaded: false,
                    installed: false,
                })));
            }
        } catch (err) {
            console.error('Failed to fetch extensions:', err);
            setExtensions(commonExtensions.map(ext => ({
                ...ext,
                loaded: false,
                installed: false,
            })));
        } finally {
            setLoading(false);
        }
    };

    const installExtension = async (extName: string) => {
        setInstallingExt(extName);
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/execute/install-extension`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ extension: extName }),
                }
            );

            if (response.ok) {
                toast.success(`${extName} installed successfully`);
                fetchExtensions();
            } else {
                toast.error(`Failed to install ${extName}`);
            }
        } catch (err) {
            toast.error('Installation failed');
        } finally {
            setInstallingExt(null);
        }
    };

    if (!isServerMode) {
        return (
            <div className="h-full p-8">
                <div className="border-2 border-dashed border-border p-12 text-center max-w-2xl mx-auto">
                    <Plug2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h2 className="text-xl font-bold mb-2">Server Mode Required</h2>
                    <p className="text-muted-foreground">
                        DuckDB extensions can only be managed in Server Mode. Switch to Server Mode to install and configure extensions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto">
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">DuckDB Extensions</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage server-side DuckDB extensions for enhanced functionality
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 mx-auto mb-4 text-primary animate-spin" />
                        <p className="text-muted-foreground">Loading extensions...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {extensions.map((ext) => (
                            <div key={ext.name} className="border-2 border-border p-4 bg-card">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg">{ext.name}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">{ext.description}</p>
                                    </div>
                                    <div className="ml-2">
                                        {ext.loaded ? (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-4">
                                    {ext.loaded ? (
                                        <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 border border-green-500">
                                            Loaded
                                        </span>
                                    ) : ext.installed ? (
                                        <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 border border-blue-500">
                                            Installed
                                        </span>
                                    ) : (
                                        <Button
                                            onClick={() => installExtension(ext.name)}
                                            disabled={installingExt === ext.name}
                                            size="sm"
                                            variant="outline"
                                            className="gap-2"
                                        >
                                            {installingExt === ext.name ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Installing...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="w-3 h-3" />
                                                    Install
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 border-2 border-border p-6 bg-card">
                    <h3 className="font-bold mb-2">About Extensions</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>• Extensions add functionality to DuckDB (file formats, database connectors, etc.)</p>
                        <p>• Installed extensions persist across server restarts</p>
                        <p>• Some extensions are loaded automatically when needed</p>
                        <p>• In Server Mode, extensions are shared across all users</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
