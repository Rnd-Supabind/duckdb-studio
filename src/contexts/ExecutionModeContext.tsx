import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ExecutionMode = 'client' | 'server';

interface ExecutionModeContextType {
    mode: ExecutionMode;
    setMode: (mode: ExecutionMode) => void;
    isClientMode: boolean;
    isServerMode: boolean;
}

const ExecutionModeContext = createContext<ExecutionModeContextType | null>(null);

export function ExecutionModeProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<ExecutionMode>('client');

    // Load mode from localStorage on mount
    useEffect(() => {
        const savedMode = localStorage.getItem('execution_mode') as ExecutionMode;
        if (savedMode === 'client' || savedMode === 'server') {
            setModeState(savedMode);
        }
    }, []);

    const setMode = (newMode: ExecutionMode) => {
        setModeState(newMode);
        localStorage.setItem('execution_mode', newMode);
    };

    return (
        <ExecutionModeContext.Provider
            value={{
                mode,
                setMode,
                isClientMode: mode === 'client',
                isServerMode: mode === 'server'
            }}
        >
            {children}
        </ExecutionModeContext.Provider>
    );
}

export function useExecutionMode() {
    const context = useContext(ExecutionModeContext);
    if (!context) {
        throw new Error('useExecutionMode must be used within ExecutionModeProvider');
    }
    return context;
}
