import { useState, useEffect } from 'react';
import { Table, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDuckDBContext } from '@/contexts/DuckDBContext';
import { cn } from '@/lib/utils';

interface TableSelectorProps {
  selectedTable: string | null;
  onSelectTable: (name: string) => void;
}

export function TableSelector({ selectedTable, onSelectTable }: TableSelectorProps) {
  const { getTables, executeQuery, loading } = useDuckDBContext();
  const [tables, setTables] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadTables = async () => {
    setRefreshing(true);
    try {
      const result = await getTables();
      setTables(result);
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      loadTables();
    }
  }, [loading]);

  const handleDropTable = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await executeQuery(`DROP TABLE IF EXISTS ${name}`);
      await loadTables();
      if (selectedTable === name) {
        onSelectTable('');
      }
    } catch (err) {
      console.error('Failed to drop table:', err);
    }
  };

  if (loading) {
    return (
      <div className="border-2 border-border p-4">
        <p className="text-sm text-muted-foreground">Initializing DuckDB...</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b-2 border-border">
        <h3 className="font-bold text-sm uppercase tracking-wider">Tables</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadTables}
          disabled={refreshing}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
        </Button>
      </div>

      {tables.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground text-center">
          No tables loaded
        </div>
      ) : (
        <div className="divide-y divide-border">
          {tables.map((name) => (
            <div
              key={name}
              className={cn(
                "flex items-center justify-between px-4 py-2 cursor-pointer transition-all",
                selectedTable === name ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
              onClick={() => onSelectTable(name)}
            >
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4" />
                <span className="font-mono text-sm">{name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleDropTable(name, e)}
                className={cn(
                  "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                  "hover:bg-destructive hover:text-destructive-foreground"
                )}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
