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

  const configureS3 = useCallback(async (config: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
    sessionToken?: string;
  }) => {
    if (!state.conn) throw new Error('DuckDB not initialized');

    // Ensure httpfs is loaded (it usually is in the main bundle, but good to be safe or retry)
    // In many WASM builds httpfs is built-in. If not, we might need to load it.
    // For now, we assume it's available or we try to load it.
    try {
      // await state.conn.query("INSTALL httpfs; LOAD httpfs;"); 
      // Note: In some WASM bundles, extensions are pre-loaded or loaded differently.
      // If this fails, we might need to check the bundle configuration.
    } catch (e) {
      console.warn("Could not install/load httpfs, it might be already loaded", e);
    }

    const commands = [
      `SET s3_region='${config.region}'`,
      `SET s3_access_key_id='${config.accessKeyId}'`,
      `SET s3_secret_access_key='${config.secretAccessKey}'`,
    ];

    if (config.endpoint) {
      commands.push(`SET s3_endpoint='${config.endpoint}'`);
      commands.push(`SET s3_url_style='path'`); // Often needed for MinIO
      commands.push(`SET s3_use_ssl=${config.endpoint.startsWith('https') ? 'true' : 'false'}`);
    }

    if (config.sessionToken) {
      commands.push(`SET s3_session_token='${config.sessionToken}'`);
    }

    await state.conn.query(commands.join(';'));
  }, [state.conn]);

  const installExtension = useCallback(async (extensionName: string) => {
    if (!state.conn) throw new Error('DuckDB not initialized');
    // In WASM, some extensions are not available or need specific handling.
    // We try the standard SQL command.
    await state.conn.query(`INSTALL ${extensionName};`);
  }, [state.conn]);

  const loadExtension = useCallback(async (extensionName: string) => {
    if (!state.conn) throw new Error('DuckDB not initialized');
    await state.conn.query(`LOAD ${extensionName};`);
  }, [state.conn]);

  return {
    ...state,
    executeQuery,
    loadCSV,
    loadJSON,
    loadParquet,
    getTables,
    exportToCSV,
    configureS3,
    installExtension,
    loadExtension,
  };
}
