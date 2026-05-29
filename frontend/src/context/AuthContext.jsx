import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);

export const API_BASE = API_BASE_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('miscs_token') || null);
  const [loading, setLoading] = useState(true);

  // Parse active profile on mount if token is found
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          const res = await fetch(`${API_BASE}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          const data = await res.json();
          if (data.success) {
            setUser(data.officer);
          } else {
            // Expired or bad token
            logout();
          }
        } catch (error) {
          console.error('[Auth Init Error]', error);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  // Login handler
  const login = async (officerId, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ officerId, password }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('miscs_token', data.token);
        setToken(data.token);
        setUser(data.officer);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('[Login API Error]', error);
      return { success: false, message: 'API Gateway connection failed. Please ensure the backend is running.' };
    }
  };

  // Register handler
  const register = async (officerData) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(officerData),
      });
      const data = await res.json();

      if (data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('[Register API Error]', error);
      return { success: false, message: 'API Gateway connection failed. Please ensure the backend is running.' };
    }
  };

  // Logout handler
  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('[Logout Server Call Error]', error);
      }
    }
    localStorage.removeItem('miscs_token');
    setToken(null);
    setUser(null);
  };

  // Authenticated fetch wrapper to automatically append Bearer headers
  const authFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    });

    // Check for global token expiration
    if (response.status === 401) {
      logout();
      throw new Error('Tactical session expired. Re-authentication required.');
    }

    return response;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be consumed within an AuthProvider context.');
  }
  return context;
};
