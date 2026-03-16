import { createContext, useContext, useState } from 'react';

// Hardcoded credentials
const ACCOUNTS = [
    { username: 'admin', password: '4eP8@C8fq', role: 'admin', displayName: '系统管理员' },
    { username: 'user', password: '4eP8@C8fq', role: 'user', displayName: '普通用户' },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('itam-user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const login = (username, password) => {
        const account = ACCOUNTS.find(
            a => a.username === username && a.password === password
        );
        if (!account) return false;
        const user = { username: account.username, role: account.role, displayName: account.displayName };
        setCurrentUser(user);
        localStorage.setItem('itam-user', JSON.stringify(user));
        return true;
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('itam-user');
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
