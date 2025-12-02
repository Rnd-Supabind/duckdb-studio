import { useState, useCallback } from 'react';
import { Upload, FileText, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useDuckDBContext } from '@/contexts/DuckDBContext';
import { useExecutionMode } from '@/contexts/ExecutionModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onUploadComplete?: (tableName: string) => void;
}

export function FileUploader({ onUploadComplete }: FileUploaderProps) {
  const { loadCSV } = useDuckDBContext();
  const { isServerMode } = useExecutionMode();
  const { token } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tableName, setTableName] = useState('');

  const sanitizeTableName = (name: string): string => {
    let sanitized = name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
    if (/^[0-9]/.test(sanitized)) {
      sanitized = 't_' + sanitized;
    }
    sanitized = sanitized.replace(/_+/g, '_').replace(/^_|_$/g, '');
    return sanitized || 'data_table';
  };

  const handleFile = useCallback(async (file: File) => {
    const tableNameToUse = tableName ? sanitizeTableName(tableName) : sanitizeTableName(file.name);
    setUploading(true);
    setUploadProgress(0);

    try {
      // Server mode - upload to MinIO then load into DuckDB
      if (isServerMode) {
        if (!token) {
          throw new Error('Authentication required for server mode');
        }

        toast.info('Uploading to server...');

        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/storage/upload?folder=uploads`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.detail || 'Upload failed');
        }

        toast.success('File uploaded to MinIO!');
        setUploadProgress(50);

        toast.info('Loading into DuckDB...');

        const loadResponse = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/storage/load-to-duckdb`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: file.name,
              table_name: tableNameToUse,
              folder: 'uploads',
            }),
          }
        );

        if (!loadResponse.ok) {
          const error = await loadResponse.json();
          throw new Error(error.detail || 'Failed to load into DuckDB');
        }

        const loadData = await loadResponse.json();
        setUploadProgress(100);

        toast.success(`Table '${tableNameToUse}' ready! ${loadData.rows} rows loaded.`);
        onUploadComplete?.(tableNameToUse);

      } else {
        // Client mode - load directly into WASM DuckDB
        if (file.name.endsWith('.csv')) {
          await loadCSV(file, tableNameToUse);
          toast.success(`Loaded ${file.name} into table '${tableNameToUse}'`);
        } else {
          throw new Error('In client mode, only CSV files are supported. Switch to server mode for JSON/Parquet.');
        }

        setUploadProgress(100);
        onUploadComplete?.(tableNameToUse);
      }

      setTableName('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [tableName, loadCSV, onUploadComplete, isServerMode, token]);

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

  const isDisabled = uploading;

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

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="space-y-2">
          <Progress value={uploadProgress} />
          <p className="text-sm text-muted-foreground text-center">{uploadProgress}%</p>
        </div>
      )}

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
          accept=".csv,.json,.parquet,.xlsx,.xls"
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
            {isServerMode ? 'Supports CSV, JSON, and Parquet files' : 'CSV files only (switch to server mode for more)'}
          </p>
        </label>
      </div>

      <div className="flex gap-2 text-xs text-muted-foreground justify-center">
        <div className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          CSV
        </div>
        {isServerMode && (
          <>
            <div className="flex items-center gap-1">
              <Table className="w-3 h-3" />
              JSON
            </div>
            <div className="flex items-center gap-1">
              <Table className="w-3 h-3" />
              Parquet
            </div>
            <div className="flex items-center gap-1">
              <Table className="w-3 h-3" />
              Excel
            </div>
          </>
        )}
      </div>
    </div>
  );
}
