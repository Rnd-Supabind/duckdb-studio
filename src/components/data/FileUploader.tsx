import { useState, useCallback } from 'react';
import { Upload, FileText, Table, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDuckDBContext } from '@/contexts/DuckDBContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onUploadComplete?: (tableName: string) => void;
}

export function FileUploader({ onUploadComplete }: FileUploaderProps) {
  const { loadCSV, loadJSON, loadParquet, loading: dbLoading } = useDuckDBContext();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tableName, setTableName] = useState('');

  const sanitizeTableName = (name: string): string => {
    // Remove file extension and replace invalid characters with underscores
    let sanitized = name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
    // If starts with a number, prefix with 't_'
    if (/^[0-9]/.test(sanitized)) {
      sanitized = 't_' + sanitized;
    }
    // Remove consecutive underscores and trim
    sanitized = sanitized.replace(/_+/g, '_').replace(/^_|_$/g, '');
    return sanitized || 'data_table';
  };

  const handleFile = useCallback(async (file: File) => {
    const name = tableName ? sanitizeTableName(tableName) : sanitizeTableName(file.name);
    setUploading(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (ext === 'csv') {
        await loadCSV(file, name);
      } else if (ext === 'json') {
        await loadJSON(file, name);
      } else if (ext === 'parquet') {
        await loadParquet(file, name);
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }

      toast.success(`Loaded ${file.name} as table "${name}"`);
      onUploadComplete?.(name);
      setTableName('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setUploading(false);
    }
  }, [tableName, loadCSV, loadJSON, loadParquet, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const isDisabled = dbLoading || uploading;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Table name (optional)"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          className="font-mono text-sm"
          disabled={isDisabled}
        />
      </div>

      <div
        className={cn(
          "border-2 border-dashed p-8 text-center transition-all",
          isDragging ? "border-primary bg-accent" : "border-border",
          isDisabled && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv,.json,.parquet"
          onChange={handleInputChange}
          className="hidden"
          id="file-upload"
          disabled={isDisabled}
        />
        <label
          htmlFor="file-upload"
          className={cn("cursor-pointer", isDisabled && "cursor-not-allowed")}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="font-bold mb-1">
            {uploading ? 'Processing...' : 'Drop files here or click to upload'}
          </p>
          <p className="text-sm text-muted-foreground">
            Supports CSV, JSON, and Parquet files
          </p>
        </label>
      </div>

      <div className="flex gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          CSV
        </div>
        <div className="flex items-center gap-1">
          <Table className="w-3 h-3" />
          JSON
        </div>
        <div className="flex items-center gap-1">
          <Table className="w-3 h-3" />
          Parquet
        </div>
      </div>
    </div>
  );
}
