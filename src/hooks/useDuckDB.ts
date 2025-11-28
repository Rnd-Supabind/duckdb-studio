import { useState, useEffect, useCallback, useRef } from 'react';
import * as duckdb from '@duckdb/duckdb-wasm';

interface DuckDBState {
  db: duckdb.AsyncDuckDB | null;
  conn: duckdb.AsyncDuckDBConnection | null;
  loading: boolean;
  error: string | null;
}

export function useDuckDB() {
  const [state, setState] = useState<DuckDBState>({
    db: null,
    conn: null,
    loading: true,
    error: null,
  });
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function initDuckDB() {
      try {
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
        
        const worker_url = URL.createObjectURL(
          new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
        );
        
        const worker = new Worker(worker_url);
        const logger = new duckdb.ConsoleLogger();
        const db = new duckdb.AsyncDuckDB(logger, worker);
        
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        const conn = await db.connect();
        
        setState({ db, conn, loading: false, error: null });
        URL.revokeObjectURL(worker_url);
      } catch (err) {
        console.error('DuckDB initialization error:', err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to initialize DuckDB',
        }));
      }
    }

    initDuckDB();
  }, []);

  const executeQuery = useCallback(async (sql: string): Promise<{ columns: string[]; rows: unknown[][] }> => {
    if (!state.conn) throw new Error('DuckDB not initialized');
    
    const result = await state.conn.query(sql);
    const columns = result.schema.fields.map(f => f.name);
    const rows: unknown[][] = [];
    
    for (let i = 0; i < result.numRows; i++) {
      const row: unknown[] = [];
      for (let j = 0; j < result.numCols; j++) {
        row.push(result.getChildAt(j)?.get(i));
      }
      rows.push(row);
    }
    
    return { columns, rows };
  }, [state.conn]);

  const loadCSV = useCallback(async (file: File, tableName: string) => {
    if (!state.db || !state.conn) throw new Error('DuckDB not initialized');
    
    const content = await file.text();
    await state.db.registerFileText(file.name, content);
    await state.conn.query(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${file.name}')`);
  }, [state.db, state.conn]);

  const loadJSON = useCallback(async (file: File, tableName: string) => {
    if (!state.db || !state.conn) throw new Error('DuckDB not initialized');
    
    const content = await file.text();
    await state.db.registerFileText(file.name, content);
    await state.conn.query(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_json_auto('${file.name}')`);
  }, [state.db, state.conn]);

  const loadParquet = useCallback(async (file: File, tableName: string) => {
    if (!state.db || !state.conn) throw new Error('DuckDB not initialized');
    
    const buffer = await file.arrayBuffer();
    await state.db.registerFileBuffer(file.name, new Uint8Array(buffer));
    await state.conn.query(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_parquet('${file.name}')`);
  }, [state.db, state.conn]);

  const getTables = useCallback(async (): Promise<string[]> => {
    if (!state.conn) return [];
    const result = await executeQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'");
    return result.rows.map(r => String(r[0]));
  }, [state.conn, executeQuery]);

  const exportToCSV = useCallback(async (tableName: string): Promise<string> => {
    if (!state.conn) throw new Error('DuckDB not initialized');
    const result = await executeQuery(`SELECT * FROM ${tableName}`);
    const header = result.columns.join(',');
    const rows = result.rows.map(r => r.map(v => JSON.stringify(v ?? '')).join(',')).join('\n');
    return `${header}\n${rows}`;
  }, [state.conn, executeQuery]);

  return {
    ...state,
    executeQuery,
    loadCSV,
    loadJSON,
    loadParquet,
    getTables,
    exportToCSV,
  };
}
