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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(true); // Maintain loading while profile fetches
        setCurrentUser(user);
        try {
          const token = await user.getIdToken();
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
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function syncUserWithBackend(name, email, role, token) {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/sync`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, email, role })
    });
    if (!res.ok) throw new Error("Failed to sync user with backend");
    const data = await res.json();
    return data.user;
  }

  async function register(name, email, password, role) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    const profile = await syncUserWithBackend(name, email, role, token);
    setUserProfile(profile);
    return userCredential;
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
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
