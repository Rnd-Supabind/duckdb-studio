import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from '@/lib/api';

interface CreateWorkflowDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => void;
}

export function CreateWorkflowDialog({
    open,
    onOpenChange,
    onSubmit,
}: CreateWorkflowDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [executionType, setExecutionType] = useState<'scheduled' | 'once'>('scheduled');
    const [schedule, setSchedule] = useState('0 0 * * *');

    // Source
    const [sourceType, setSourceType] = useState('none');
    const [sourceConfig, setSourceConfig] = useState('{}');
    const [availableFiles, setAvailableFiles] = useState<any[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<{ path: string, table_name: string, format: string }[]>([]);

    // Transformation
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [manualQuery, setManualQuery] = useState('');

    // Destination
    const [destType, setDestType] = useState('storage');
    const [destConfig, setDestConfig] = useState('{}');

    useEffect(() => {
        if (open) {
            apiClient.getTemplates().then(setTemplates).catch(console.error);
            // Fetch user's uploaded files using API client
            apiClient.getFiles('uploads')
                .then(data => {
                    console.log('Files loaded:', data);
                    setAvailableFiles(data.files || []);
                })
                .catch(err => {
                    console.error('Failed to load files:', err);
                    setAvailableFiles([]);
                });
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Build source config for file type
        let finalSourceConfig = sourceConfig;
        if (sourceType === 'file' && selectedFiles.length > 0) {
            finalSourceConfig = JSON.stringify({ files: selectedFiles });
        }

        onSubmit({
            name,
            description,
            schedule: executionType === 'once' ? '@once' : schedule,
            source_type: sourceType,
            source_config: finalSourceConfig,
            template_id: selectedTemplate ? parseInt(selectedTemplate) : null,
            query: manualQuery,
            destination_type: destType,
            destination_config: destConfig,
        });

        // Reset form
        setName('');
        setDescription('');
        setExecutionType('scheduled');
        setSchedule('0 0 * * *');
        setSourceType('none');
        setSourceConfig('{}');
        setSelectedFiles([]);
        setSelectedTemplate('');
        setManualQuery('');
        setDestType('storage');
        setDestConfig('{}');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create Workflow</DialogTitle>
                    <DialogDescription>
                        Configure your automated data pipeline.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="source">Source</TabsTrigger>
                            <TabsTrigger value="transform">Transform</TabsTrigger>
                            <TabsTrigger value="dest">Destination</TabsTrigger>
                        </TabsList>

                        <div className="py-4 h-[400px] overflow-y-auto pr-2">
                            <TabsContent value="general" className="space-y-4 mt-0">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Daily Sales Report"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe what this workflow does..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Execution Type</Label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={executionType === 'scheduled'}
                                                onChange={() => setExecutionType('scheduled')}
                                                className="w-4 h-4"
                                            />
                                            <span>Scheduled (Recurring)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={executionType === 'once'}
                                                onChange={() => setExecutionType('once')}
                                                className="w-4 h-4"
                                            />
                                            <span>One-Time</span>
                                        </label>
                                    </div>
                                </div>
                                {executionType === 'scheduled' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="schedule">Schedule (Cron)</Label>
                                        <Input
                                            id="schedule"
                                            value={schedule}
                                            onChange={(e) => setSchedule(e.target.value)}
                                            placeholder="0 0 * * *"
                                            className="font-mono"
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Format: Minute Hour Day Month DayOfWeek
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="source" className="space-y-4 mt-0">
                                <div className="space-y-2">
                                    <Label>Source Type</Label>
                                    <select
                                        className="w-full p-2 border rounded-md bg-background"
                                        value={sourceType}
                                        onChange={(e) => setSourceType(e.target.value)}
                                    >
                                        <option value="none">None (Use existing data)</option>
                                        <option value="file">Files (From uploads)</option>
                                        <option value="ftp">FTP Server</option>
                                        <option value="api">External API</option>
                                        <option value="upload">File Upload (Triggered)</option>
                                    </select>
                                </div>
                                {sourceType === 'file' && (
                                    <div className="space-y-2">
                                        <Label>Select Files to Load</Label>
                                        <div className="border rounded-md p-3 max-h-[250px] overflow-y-auto space-y-2">
                                            {availableFiles.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">No files uploaded yet. Upload files in the Storage page first.</p>
                                            ) : (
                                                availableFiles.map((file, idx) => {
                                                    const isSelected = selectedFiles.some(f => f.path === file.path);
                                                    const fileExt = file.name.split('.').pop()?.toLowerCase();
                                                    const format = fileExt === 'csv' ? 'csv' : fileExt === 'parquet' ? 'parquet' : fileExt === 'json' ? 'json' : 'csv';
                                                    const defaultTableName = file.name.split('.')[0].replace(/[^a-zA-Z0-9_]/g, '_');

                                                    return (
                                                        <div key={idx} className="flex items-center gap-2 p-2 border rounded hover:bg-accent">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedFiles([...selectedFiles, {
                                                                            path: file.path,
                                                                            table_name: defaultTableName,
                                                                            format
                                                                        }]);
                                                                    } else {
                                                                        setSelectedFiles(selectedFiles.filter(f => f.path !== file.path));
                                                                    }
                                                                }}
                                                                className="w-4 h-4"
                                                            />
                                                            <div className="flex-1">
                                                                <div className="text-sm font-medium">{file.name}</div>
                                                                <div className="text-xs text-muted-foreground">Table: {defaultTableName}</div>
                                                            </div>
                                                            <span className="text-xs px-2 py-1 bg-secondary rounded">{format.toUpperCase()}</span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        {selectedFiles.length > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                {selectedFiles.length} file(s) selected. These will be loaded as DuckDB tables.
                                            </p>
                                        )}
                                    </div>
                                )}
                                {sourceType !== 'none' && sourceType !== 'file' && (
                                    <div className="space-y-2">
                                        <Label>Configuration (JSON)</Label>
                                        <Textarea
                                            value={sourceConfig}
                                            onChange={(e) => setSourceConfig(e.target.value)}
                                            className="font-mono h-[200px]"
                                            placeholder='{"url": "...", "auth": "..."}'
                                        />
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="transform" className="space-y-4 mt-0">
                                <div className="space-y-2">
                                    <Label>Use Template</Label>
                                    <select
                                        className="w-full p-2 border rounded-md bg-background"
                                        value={selectedTemplate}
                                        onChange={(e) => setSelectedTemplate(e.target.value)}
                                    >
                                        <option value="">Select a template...</option>
                                        {templates.map((t: any) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">
                                            Or write manual query
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>SQL Query</Label>
                                    <Textarea
                                        value={manualQuery}
                                        onChange={(e) => setManualQuery(e.target.value)}
                                        className="font-mono h-[200px]"
                                        placeholder="SELECT * FROM ..."
                                        disabled={!!selectedTemplate}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="dest" className="space-y-4 mt-0">
                                <div className="space-y-2">
                                    <Label>Destination Type</Label>
                                    <select
                                        className="w-full p-2 border rounded-md bg-background"
                                        value={destType}
                                        onChange={(e) => setDestType(e.target.value)}
                                    >
                                        <option value="storage">Internal Storage (Transformed)</option>
                                        <option value="ftp">FTP Server</option>
                                        <option value="webhook">Webhook (POST)</option>
                                    </select>
                                </div>
                                {destType !== 'storage' && (
                                    <div className="space-y-2">
                                        <Label>Configuration (JSON)</Label>
                                        <Textarea
                                            value={destConfig}
                                            onChange={(e) => setDestConfig(e.target.value)}
                                            className="font-mono h-[200px]"
                                            placeholder='{"url": "https://api.example.com/webhook"}'
                                        />
                                    </div>
                                )}
                            </TabsContent>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Create Workflow</Button>
                        </DialogFooter>
                    </Tabs>
                </form>
            </DialogContent>
        </Dialog>
    );
}
