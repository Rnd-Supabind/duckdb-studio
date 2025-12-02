import { useState, useEffect, useCallback, useRef } from 'react';
import * as duckdb from '@duckdb/duckdb-wasm';
import { useExecutionMode } from '@/contexts/ExecutionModeContext';
import { useAuth } from '@/contexts/AuthContext';

export interface QueryResult {
  columns: string[];
  rows: any[][];
  executionTime?: number;
}

export function useDuckDB() {
  const [db, setDb] = useState<duckdb.AsyncDuckDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initPromise = useRef<Promise<void> | null>(null);
  const { mode, isServerMode } = useExecutionMode();
  const { token } = useAuth();

  // Initialize WASM DuckDB for client mode
  useEffect(() => {
    if (initPromise.current) return;

    initPromise.current = (async () => {
      try {
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
        const worker_url = URL.createObjectURL(
          new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
        );
        const worker = new Worker(worker_url);
        const logger = new duckdb.ConsoleLogger();
        const duckDbInstance = new duckdb.AsyncDuckDB(logger, worker);
        await duckDbInstance.instantiate(bundle.mainModule, bundle.pthreadWorker);

        URL.revokeObjectURL(worker_url);
        setDb(duckDbInstance);
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize DuckDB:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize DuckDB');
        setLoading(false);
      }
    })();

    return () => {
      if (db) {
        db.terminate();
      }
    };
  }, []);

  const executeQuery = useCallback(async (sql: string): Promise<QueryResult> => {
    // Server mode - use backend API
    if (isServerMode) {
      if (!token) {
        throw new Error('Authentication required for server mode');
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/execute/run`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: sql,
            extensions: [], // Extensions should be pre-configured on backend
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Query execution failed');
        }

        const data = await response.json();
        return {
          columns: data.columns,
          rows: data.rows,
          executionTime: data.execution_time_ms,
        };
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Server query failed');
      }
    }

    // Client mode - use WASM DuckDB
    if (!db) {
      throw new Error('DuckDB not initialized');
    }

    try {
      const conn = await db.connect();
      const result = await conn.query(sql);
      const rows: any[][] = [];

      for (let i = 0; i < result.numRows; i++) {
        const row: any[] = [];
        for (let j = 0; j < result.numCols; j++) {
          const val = result.getChildAt(j)?.get(i);
          row.push(val);
        }
        rows.push(row);
      }

      const columns = Array.from({ length: result.numCols }, (_, i) =>
        result.schema.fields[i]?.name || `col${i}`
      );

      await conn.close();

      return { columns, rows };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Query execution failed');
    }
  }, [db, isServerMode, token]);

  const loadCSV = useCallback(async (file: File, tableName: string) => {
    if (!db) throw new Error('DuckDB not initialized');
    const conn = await db.connect();
    const content = await file.text();
    await db.registerFileText(file.name, content);
    await conn.query(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${file.name}')`);
    await conn.close();
  }, [db]);

  const getTables = useCallback(async (): Promise<string[]> => {
    if (!db) return [];
    const conn = await db.connect();
    const result = await conn.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'");
    const tables: string[] = [];
    for (let i = 0; i < result.numRows; i++) {
      tables.push(String(result.getChildAt(0)?.get(i)));
    }
    await conn.close();
    return tables;
  }, [db]);

  const configureS3 = useCallback(async (config: any) => {
    if (isServerMode) {
      // In server mode, S3 is already configured on backend
      return;
    }

    // In client mode, configure WASM DuckDB
    if (!db) {
      throw new Error('DuckDB not initialized');
    }

    const conn = await db.connect();
    await conn.query(`
      SET s3_region='${config.region}';
      SET s3_access_key_id='${config.accessKeyId}';
      SET s3_secret_access_key='${config.secretAccessKey}';
      ${config.endpoint ? `SET s3_endpoint='${config.endpoint}';` : ''}
    `);
    await conn.close();
  }, [db, isServerMode]);

  return {
    db,
    loading,
    error,
    executeQuery,
    loadCSV,
    getTables,
    configureS3,
    mode,
    isServerMode,
  };
}
