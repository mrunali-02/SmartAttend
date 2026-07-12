import React, { createContext, useState, useEffect, useContext } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken, signOut } = useClerkAuth();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Setup dynamic request interceptor to attach Clerk JWT to API requests
  useEffect(() => {
    if (!isLoaded) return;

    const interceptor = api.interceptors.request.use(
      async (config) => {
        try {
          // In mock development fallback, if Clerk isn't set up, we send a mock token
          let token = null;
          if (isSignedIn) {
            token = await getToken();
            if (clerkUser) {
              const email = clerkUser.primaryEmailAddress?.emailAddress;
              if (email) {
                config.headers['X-User-Email'] = email;
              }
              const fullName = clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
              if (fullName) {
                config.headers['X-User-Name'] = fullName;
              }
              const imageUrl = clerkUser.imageUrl;
              if (imageUrl) {
                config.headers['X-User-Image'] = imageUrl;
              }
            }
          } else if (import.meta.env.DEV) {
            token = localStorage.getItem('mockAccessToken');
          }

          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (err) {
          console.error("Error retrieving Clerk session token:", err);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, [isLoaded, isSignedIn, getToken]);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/profile/');
      setUser(response.data);
    } catch (error) {
      console.error("Failed to retrieve profile:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      fetchProfile();
    } else {
      // Dev mode mock login check
      const mockToken = localStorage.getItem('mockAccessToken');
      if (mockToken && import.meta.env.DEV) {
        fetchProfile();
      } else {
        setUser(null);
        setLoading(false);
      }
    }
  }, [isLoaded, isSignedIn, clerkUser]);

  const login = async () => {
    // Handled by Clerk components in UI
  };

  const register = async () => {
    // Handled by Clerk components in UI
  };

  const logout = async () => {
    setLoading(true);
    if (isSignedIn) {
      await signOut();
    } else {
      localStorage.removeItem('mockAccessToken');
    }
    setUser(null);
    setLoading(false);
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

  const isProfileIncomplete = user && (
    !user.college_name || 
    !user.semester || 
    !user.division || 
    !user.roll_number || 
    !user.batch || 
    !user.department || 
    !user.academic_year || 
    !user.student_id || 
    !user.prn_number || 
    !user.full_name
  );

  const value = {
    user,
    loading: !isLoaded || loading,
    isAuthenticated: !!user,
    isProfileIncomplete,
    login,
    register,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
