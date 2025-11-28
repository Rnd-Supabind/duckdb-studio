import { useState, useEffect } from 'react';
import { FileUploader } from '@/components/data/FileUploader';
import { DataGrid } from '@/components/data/DataGrid';
import { TableSelector } from '@/components/data/TableSelector';
import { useDuckDBContext } from '@/contexts/DuckDBContext';
import { Download, Upload, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DataViewPage() {
  const { executeQuery, exportToCSV, loading, error } = useDuckDBContext();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [data, setData] = useState<{ columns: string[]; rows: unknown[][] }>({ columns: [], rows: [] });
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    if (selectedTable) {
      executeQuery(`SELECT * FROM ${selectedTable} LIMIT 1000`)
        .then(setData)
        .catch((err) => toast.error(err.message));
    } else {
      setData({ columns: [], rows: [] });
    }
  }, [selectedTable, executeQuery]);

  const handleExport = async () => {
    if (!selectedTable) return;
    try {
      const csv = await exportToCSV(selectedTable);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported successfully');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const handleUploadComplete = (tableName: string) => {
    setSelectedTable(tableName);
    setShowUploader(false);
  };

  if (error) {
    return (
      <div className="p-8">
        <div className="border-2 border-destructive bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-bold text-destructive mb-2">DuckDB Error</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="border-b-2 border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Data View</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload files and explore your data locally in the browser
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowUploader(!showUploader)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </Button>
            {selectedTable && (
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 border-r-2 border-border p-4 overflow-auto">
          <TableSelector
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
          />
        </div>

        <div className="flex-1 p-6 overflow-auto">
          {showUploader && (
            <div className="mb-6">
              <FileUploader onUploadComplete={handleUploadComplete} />
            </div>
          )}

          {loading ? (
            <div className="border-2 border-border p-12 text-center">
              <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p className="font-bold">Initializing DuckDB WASM...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Loading the database engine in your browser
              </p>
            </div>
          ) : selectedTable ? (
            <DataGrid columns={data.columns} rows={data.rows} />
          ) : (
            <div className="border-2 border-dashed border-border p-12 text-center">
              <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-bold mb-2">No Table Selected</p>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a file or select a table from the sidebar
              </p>
              <Button onClick={() => setShowUploader(true)} className="gap-2">
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
