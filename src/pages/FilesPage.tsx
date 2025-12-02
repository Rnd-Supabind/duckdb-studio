import { useState } from 'react';
import { FileBrowser } from '@/components/data/FileBrowser';
import { FileUploader } from '@/components/data/FileUploader';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/contexts/AuthContext';

export default function FilesPage() {
    const [showUploader, setShowUploader] = useState(false);
    const { user } = useAuth();

    const formatBytes = (bytes?: number) => {
        if (bytes === undefined) return '0 B';
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="h-full flex flex-col">
            <header className="border-b-2 border-border px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Files</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Upload and manage your data files
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {user && (
                            <div className="text-sm text-right hidden md:block">
                                <div className="font-medium">Storage Usage</div>
                                <div className="text-muted-foreground">
                                    {formatBytes(user.storage_used_bytes)} / {user.storage_limit_gb} GB
                                </div>
                            </div>
                        )}
                        <Button
                            onClick={() => setShowUploader(!showUploader)}
                            className="gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Upload File
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-6 overflow-auto">
                {showUploader && (
                    <div className="mb-6">
                        <FileUploader onUploadComplete={() => setShowUploader(false)} />
                    </div>
                )}

                <FileBrowser
                    folder="uploads"
                    title="Uploaded Files"
                    description="Your uploaded data files"
                />
            </div>
        </div>
    )
}
