import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('civicseva_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('civicseva_token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !user) {
      authApi.getCurrentUser()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('civicseva_user', JSON.stringify(userData));
        })
        .catch(() => {
          logout();
        });
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setToken(data.access_token);
      const userData = {
        id: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role
      };
      setUser(userData);
      localStorage.setItem('civicseva_token', data.access_token);
      localStorage.setItem('civicseva_user', JSON.stringify(userData));
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role = 'citizen') => {
    setLoading(true);
    try {
      const data = await authApi.register(name, email, password, role);
      setToken(data.access_token);
      const userData = {
        id: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role
      };
      setUser(userData);
      localStorage.setItem('civicseva_token', data.access_token);
      localStorage.setItem('civicseva_user', JSON.stringify(userData));
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('civicseva_token');
    localStorage.removeItem('civicseva_user');
  };

  // Quick switch between seeded demo accounts for instant live presentation
  const switchDemoRole = async (targetRole) => {
    const credentials = {
      citizen: { email: 'citizen@civicseva.org', pass: 'citizen123' },
      authority: { email: 'authority@civicseva.org', pass: 'authority123' },
      admin: { email: 'admin@civicseva.org', pass: 'admin123' }
    };
    const cred = credentials[targetRole] || credentials.citizen;
    return await login(cred.email, cred.pass);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, switchDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
