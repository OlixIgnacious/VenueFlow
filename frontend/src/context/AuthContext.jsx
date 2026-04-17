import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut 
} from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let lastToken = null;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          if (token === lastToken) return; // Prevent loop if token hasn't changed
          lastToken = token;
          
          setLoading(true);
          setCurrentUser(user);
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setUserProfile(data);
          } else {
            setUserProfile(null);
          }
        } catch (e) {
          console.error("Auth context error:", e);
          setUserProfile(null);
        } finally {
          setLoading(false);
        }
      } else {
        lastToken = null;
        setCurrentUser(user);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function syncUserWithBackend(name, email, role, token, serviceKey = null) {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/sync`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, email, role, service_key: serviceKey })
    });
    if (!res.ok) throw new Error("Failed to sync user with backend");
    const data = await res.json();
    return data.user;
  }

  async function register(name, email, password, role, serviceKey = null) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    const profile = await syncUserWithBackend(name, email, role, token, serviceKey);
    setUserProfile(profile);
    return userCredential;
  }

  async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Profile will be auto-fetched by the onAuthStateChanged listener
    return userCredential;
  }

  async function logout() {
    setLoading(true);
    setUserProfile(null);
    return signOut(auth);
  }

  const value = {
    currentUser,
    userProfile,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
