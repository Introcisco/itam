import { createContext, useContext, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = sessionStorage.getItem('itam-user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const login = async (username, password) => {
        try {
            const user = await api.login({ username, password });
            setCurrentUser(user);
            sessionStorage.setItem('itam-user', JSON.stringify(user));
            return true;
        } catch (error) {
            console.error('Login failed:', error);
            return false;
        }
    };

    const logout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('itam-user');
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
