import { useState, useEffect } from 'react';
import { FileText, FolderOpen, Download, Database, Loader2, Trash2, Search, RefreshCw, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MinIOFile {
    name: string;
    path: string;
    folder: string;
    size?: number;
    last_modified?: string;
}

interface FileBrowserProps {
    onFileLoad?: (tableName: string) => void;
    folder?: string;
    title?: string;
    description?: string;
}

export function FileBrowser({
    onFileLoad,
    folder = "uploads",
    title = "My Files & Transformations",
    description = "Manage your uploaded data files and create transformations"
}: FileBrowserProps) {
    const { token } = useAuth();
    const [files, setFiles] = useState<MinIOFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingFile, setLoadingFile] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchFiles = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/storage/files?folder=${folder}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setFiles(data.files || []);
            } else {
                throw new Error('Failed to fetch files');
            }
        } catch (err) {
            console.error('Failed to fetch files:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to load files');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Always fetch files regardless of execution mode
        fetchFiles();
    }, [token]);

    const handleLoadFile = async (file: MinIOFile) => {
        if (!token) return;

        setLoadingFile(file.name);
        try {
            const tableName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');

            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/storage/load-to-duckdb`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filename: file.name,
                        table_name: tableName,
                        folder: folder,
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to load file');
            }

            const data = await response.json();
            toast.success(`Loaded ${file.name} - ${data.rows} rows`);
            onFileLoad?.(tableName);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load file');
        } finally {
            setLoadingFile(null);
        }
    };

    const handleDownloadFile = async (file: MinIOFile) => {
        if (!token) return;

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/storage/download/${file.name}?folder=${folder}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to download file');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Downloaded ${file.name}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to download file');
        }
    };

    const handleDeleteFile = async (file: MinIOFile) => {
        if (!token) return;

        if (!confirm(`Are you sure you want to delete ${file.name}?`)) {
            return;
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/storage/delete?filename=${file.name}&folder=${folder}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to delete file');
            }

            toast.success(`Deleted ${file.name}`);
            fetchFiles(); // Refresh the file list
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete file');
        }
    };

    const getFileIcon = (filename: string) => {
        if (filename.endsWith('.csv')) return 'CSV';
        if (filename.endsWith('.json')) return 'JSON';
        if (filename.endsWith('.parquet')) return 'PARQUET';
        if (filename.endsWith('.xlsx')) return 'XLSX';
        return 'FILE';
    };

    const getFileSize = (size?: number) => {
        if (!size) return '-';
        const kb = size / 1024;
        if (kb < 1024) return `${kb.toFixed(2)} KB`;
        return `${(kb / 1024).toFixed(2)} MB`;
    };

    const filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="border-2 border-border bg-card h-full flex flex-col">
            {/* Header */}
            <div className="border-b-2 border-border p-4 bg-secondary">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-base font-bold tracking-tight">{title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {description}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-xs text-muted-foreground">{files.length} files</span>
                        <Button onClick={fetchFiles} variant="ghost" size="sm" className="gap-2 h-7">
                            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-9 text-sm"
                    />
                </div>
            </div>

            {/* File List */}
            <div className="max-h-96 overflow-auto">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading files...</p>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="p-8 text-center">
                        <FolderOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-bold mb-1">
                            {searchTerm ? 'No files found' : 'No files uploaded yet'}
                        </p>
                        {!searchTerm && (
                            <p className="text-xs text-muted-foreground">
                                Upload a file to get started
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {filteredFiles.map((file, index) => (
                            <div
                                key={file.path}
                                className="p-3 hover:bg-accent transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    {/* File Icon & Badge */}
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 border-2 border-border flex items-center justify-center bg-background">
                                            <FileIcon className="w-5 h-5 text-primary" />
                                        </div>
                                    </div>

                                    {/* File Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-mono font-medium truncate">
                                                {file.name}
                                            </p>
                                            <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 font-mono shrink-0">
                                                {getFileIcon(file.name)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-muted-foreground">
                                                {getFileSize(file.size)}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {file.last_modified || 'Recently'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            onClick={() => {
                                                // Navigate to transformation page
                                                window.location.href = `/transform/${encodeURIComponent(file.name)}`;
                                            }}
                                            size="sm"
                                            variant="outline"
                                            className="gap-1.5 h-8 text-xs"
                                        >
                                            <Database className="w-3 h-3" />
                                            Transform
                                        </Button>
                                        <Button
                                            onClick={() => handleDownloadFile(file)}
                                            size="sm"
                                            variant="outline"
                                            className="gap-1.5 h-8 text-xs"
                                        >
                                            <Download className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            onClick={() => handleDeleteFile(file)}
                                            size="sm"
                                            variant="outline"
                                            className="gap-1.5 h-8 text-xs hover:bg-destructive hover:text-destructive-foreground"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
