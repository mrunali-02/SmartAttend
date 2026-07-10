import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/profile/');
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user profile", error);
      logoutStateOnly();
    } finally {
      setLoading(false);
    }
  };

  const logoutStateOnly = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setLoading(false);
  };

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      fetchProfile();
    } else {
      setLoading(false);
    }

    const handleForceLogout = () => {
      logoutStateOnly();
    };

    window.addEventListener('auth-logout', handleForceLogout);
    return () => {
      window.removeEventListener('auth-logout', handleForceLogout);
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/users/login/', { email, password });
      const { access, refresh } = response.data;
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      
      const profileResponse = await api.get('/users/profile/');
      setUser(profileResponse.data);
      return { success: true };
    } catch (error) {
      console.error("Login error", error);
      setLoading(false);
      return {
        success: false,
        error: error.response?.data?.detail || "Invalid email or password."
      };
    }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      await api.post('/users/register/', formData);
      setLoading(false);
      return { success: true };
    } catch (error) {
      console.error("Registration error", error);
      setLoading(false);
      return {
        success: false,
        error: error.response?.data || { detail: "Registration failed." }
      };
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await api.post('/users/logout/', { refresh: refreshToken });
      } catch (error) {
        console.error("Logout request failed", error);
      }
    }
    logoutStateOnly();
  };

  const updateProfile = async (formData) => {
    try {
      const headers = formData instanceof FormData 
        ? { 'Content-Type': 'multipart/form-data' }
        : { 'Content-Type': 'application/json' };

      const response = await api.patch('/users/profile/', formData, { headers });
      setUser(response.data);
      return { success: true };
    } catch (error) {
      console.error("Profile update error", error);
      return {
        success: false,
        error: error.response?.data || "Failed to update profile."
      };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
