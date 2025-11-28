import React, { createContext, useContext, ReactNode } from 'react';
import { useDuckDB } from '@/hooks/useDuckDB';

type DuckDBContextType = ReturnType<typeof useDuckDB>;

const DuckDBContext = createContext<DuckDBContextType | null>(null);

export function DuckDBProvider({ children }: { children: ReactNode }) {
  const duckdb = useDuckDB();
  return <DuckDBContext.Provider value={duckdb}>{children}</DuckDBContext.Provider>;
}

export function useDuckDBContext() {
  const context = useContext(DuckDBContext);
  if (!context) {
    throw new Error('useDuckDBContext must be used within a DuckDBProvider');
  }
  return context;
}
