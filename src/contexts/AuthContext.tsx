import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

interface User {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'user';
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<void>;
    signup: (username: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isAuthenticated: boolean;
    token: string | null;
    setAuthToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Load token and fetch user from backend on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');

        if (storedToken) {
            setToken(storedToken);
            // Fetch real user data from backend
            apiClient.getCurrentUser(storedToken)
                .then(userData => {
                    setUser(userData);
                })
                .catch(err => {
                    console.error('Failed to fetch user:', err);
                    // Token invalid, clear it
                    localStorage.removeItem('auth_token');
                    setToken(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (username: string, password: string) => {
        const response = await apiClient.login({ username, password });
        const { access_token } = response;

        // Store token
        localStorage.setItem('auth_token', access_token);
        setToken(access_token);

        // Fetch real user data from backend
        const userData = await apiClient.getCurrentUser(access_token);
        setUser(userData);
    };

    const signup = async (username: string, email: string, password: string) => {
        const response = await apiClient.signup({ username, email, password });
        const { access_token } = response;

        // Store token
        localStorage.setItem('auth_token', access_token);
        setToken(access_token);

        // Fetch real user data from backend
        const userData = await apiClient.getCurrentUser(access_token);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
    };

    const setAuthToken = async (newToken: string) => {
        localStorage.setItem('auth_token', newToken);
        setToken(newToken);

        try {
            const userData = await apiClient.getCurrentUser(newToken);
            setUser(userData);
        } catch (error) {
            console.error('Failed to fetch user with new token:', error);
            logout();
        }
    };

    // Don't render children until we've checked for existing auth
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user, token, setAuthToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
