import { useState } from 'react';
import { QueryEditor } from '@/components/query/QueryEditor';
import { DataGrid } from '@/components/data/DataGrid';
import { useDuckDBContext } from '@/contexts/DuckDBContext';

export default function QueryPage() {
  const { loading, error } = useDuckDBContext();
  const [result, setResult] = useState<{ columns: string[]; rows: unknown[][] } | null>(null);

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
        <h1 className="text-2xl font-bold tracking-tight">Query Editor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Write SQL queries and transform your data using DuckDB
        </p>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-1/2 p-6 pb-0">
          <QueryEditor
            onQueryResult={setResult}
            initialQuery={`-- Write your SQL query here
-- Example: SELECT * FROM your_table LIMIT 100

SELECT 
  'Hello' as greeting,
  42 as answer,
  CURRENT_TIMESTAMP as timestamp`}
          />
        </div>

        <div className="h-1/2 p-6 overflow-auto">
          {loading ? (
            <div className="border-2 border-border p-8 text-center">
              <p className="text-muted-foreground">Initializing DuckDB...</p>
            </div>
          ) : result ? (
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider mb-4">
                Results ({result.rows.length} rows)
              </h3>
              <DataGrid columns={result.columns} rows={result.rows} />
            </div>
          ) : (
            <div className="border-2 border-dashed border-border p-8 text-center">
              <p className="text-muted-foreground">
                Run a query to see results here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
