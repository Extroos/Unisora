import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { User } from '../../types';

export interface AuthSlice {
  users: Record<string, User>;
  currentUser: User | null;
  isLoggedIn: boolean;
  setLoggedIn: (isLoggedIn: boolean) => void;
  login: (emailOrUsername: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (payload: { googleId: string; email: string; username?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
  completeOnboarding: (username: string, tag: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string }>;
  updateCurrentUser: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  setUserStatus: (status: 'online' | 'idle' | 'dnd' | 'offline') => void;
  setCustomStatus: (text: string) => void;
}

const getInitialAuth = () => {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('session_user_id') : null;
  return {
    currentUser: null,
    users: {},
    isLoggedIn: userId !== null
  };
};

const initialAuth = getInitialAuth();

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set) => ({
  users: initialAuth.users,
  currentUser: initialAuth.currentUser,
  isLoggedIn: initialAuth.isLoggedIn,

  setLoggedIn: (isLoggedIn) => {
    if (!isLoggedIn) {
      localStorage.removeItem('session_user_id');
      localStorage.removeItem('session_token');
      set({ currentUser: null, isLoggedIn: false });
    } else {
      set({ isLoggedIn });
    }
  },
  login: async (emailOrUsername, password) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('session_user_id', data.user.id);
        localStorage.setItem('session_token', data.token);
        set((state) => ({
          isLoggedIn: true,
          currentUser: data.user,
          users: { ...state.users, [data.user.id]: data.user }
        }));
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Invalid credentials' };
      }
    } catch (e) {
      console.error(e);
      return { success: false, error: 'Login failed due to network error' };
    }
  },
  register: async (username, email, password) => {
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('session_user_id', data.user.id);
        localStorage.setItem('session_token', data.token);
        set((state) => ({
          isLoggedIn: true,
          currentUser: data.user,
          users: { ...state.users, [data.user.id]: data.user }
        }));
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to register' };
      }
    } catch (e) {
      console.error(e);
      return { success: false, error: 'Registration failed due to network error' };
    }
  },
  loginWithGoogle: async (payload) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('session_user_id', data.user.id);
        localStorage.setItem('session_token', data.token);
        set((state) => ({
          isLoggedIn: true,
          currentUser: data.user,
          users: { ...state.users, [data.user.id]: data.user }
        }));
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Google Sign-In failed' };
      }
    } catch (e) {
      console.error(e);
      return { success: false, error: 'Google Sign-In failed due to network error' };
    }
  },
  completeOnboarding: async (username, tag, avatarUrl) => {
    try {
      const res = await fetch('/api/users/onboarding', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Session-Token': localStorage.getItem('session_token') || '',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ username, tag, avatarUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        set((state) => ({
          currentUser: data.user,
          users: { ...state.users, [data.user.id]: data.user }
        }));
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to complete onboarding' };
      }
    } catch (e) {
      console.error(e);
      return { success: false, error: 'Onboarding failed due to network error' };
    }
  },
  updateCurrentUser: async (updates) => {
    try {
      const res = await fetch('/api/users/status', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Session-Token': localStorage.getItem('session_token') || '',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok) {
        set((state) => ({
          users: { ...state.users, [data.id]: data },
          currentUser: data
        }));
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to update profile' };
      }
    } catch (e) {
      console.error(e);
      return { success: false, error: 'Network error updating profile' };
    }
  },
  setUserStatus: async (status) => {
    try {
      const res = await fetch('/api/users/status', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Session-Token': localStorage.getItem('session_token') || '',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        set((state) => ({
          users: { ...state.users, [data.id]: data },
          currentUser: data
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },
  setCustomStatus: async (text) => {
    try {
      const res = await fetch('/api/users/status', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Session-Token': localStorage.getItem('session_token') || '',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ customStatus: text }),
      });
      if (res.ok) {
        const data = await res.json();
        set((state) => ({
          users: { ...state.users, [data.id]: data },
          currentUser: data
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },
});
