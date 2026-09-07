import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lakeside_token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.user);
        })
        .catch(() => {
          localStorage.removeItem('lakeside_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('lakeside_token', res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {}
    localStorage.removeItem('lakeside_token');
    setUser(null);
  };

  const hasPermission = (code) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'directory' && Array.isArray(user.permissions)) {
      return user.permissions.includes(code);
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        hasPermission,
        isAdmin: user?.role === 'admin',
        isDirectory: user?.role === 'directory',
        isTeacher: user?.role === 'teacher'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
