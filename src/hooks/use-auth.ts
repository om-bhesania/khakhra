import { useState, useEffect, useCallback } from 'react';
import { signOut, type User } from 'firebase/auth';
import { auth } from '../config/firebase.config';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/login', { state: { from: location } });
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return {
    user,
    loading,
    logout,
    isAuthenticated: !!user,
  };
}